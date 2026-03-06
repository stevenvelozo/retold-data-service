/**
 * DataCloner Sync Routes
 *
 * Registers /clone/sync/* endpoints for starting, monitoring, and stopping
 * data synchronization via meadow-integration.
 *
 * @param {Object} pDataClonerService - The RetoldDataServiceDataCloner instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = (pDataClonerService, pOratorServiceServer) =>
{
	let tmpFable = pDataClonerService.fable;
	let tmpCloneState = pDataClonerService.cloneState;
	let tmpPrefix = pDataClonerService.routePrefix;

	// POST /clone/sync/start
	pOratorServiceServer.post(`${tmpPrefix}/sync/start`,
		(pRequest, pResponse, fNext) =>
		{
			if (tmpCloneState.SyncRunning)
			{
				pResponse.send(400, { Success: false, Error: 'Sync is already running.' });
				return fNext();
			}

			if (!tmpCloneState.RemoteServerURL)
			{
				pResponse.send(400, { Success: false, Error: 'No remote server configured.' });
				return fNext();
			}

			if (!tmpFable.MeadowSync || !tmpFable.MeadowSync.MeadowSyncEntities)
			{
				pResponse.send(400, { Success: false, Error: 'No sync entities available. Deploy a schema first.' });
				return fNext();
			}

			let tmpBody = pRequest.body || {};
			let tmpSelectedTables = tmpBody.Tables || [];
			let tmpRequestedMode = tmpBody.SyncMode || 'Initial';
			let tmpMaxRecords = parseInt(tmpBody.MaxRecordsPerEntity, 10) || 0;

			// Update SyncDeletedRecords from request if provided
			if (tmpBody.hasOwnProperty('SyncDeletedRecords'))
			{
				tmpCloneState.SyncDeletedRecords = !!tmpBody.SyncDeletedRecords;
				let tmpEntityNames = Object.keys(tmpFable.MeadowSync.MeadowSyncEntities);
				for (let i = 0; i < tmpEntityNames.length; i++)
				{
					tmpFable.MeadowSync.MeadowSyncEntities[tmpEntityNames[i]].SyncDeletedRecords = tmpCloneState.SyncDeletedRecords;
				}
			}

			// Update MaxRecordsPerEntity on sync entities
			if (tmpMaxRecords > 0)
			{
				let tmpEntityNames = Object.keys(tmpFable.MeadowSync.MeadowSyncEntities);
				for (let i = 0; i < tmpEntityNames.length; i++)
				{
					tmpFable.MeadowSync.MeadowSyncEntities[tmpEntityNames[i]].MaxRecordsPerEntity = tmpMaxRecords;
				}
			}

			// If no tables specified, sync all entities
			if (tmpSelectedTables.length === 0)
			{
				tmpSelectedTables = tmpFable.MeadowSync.SyncEntityList || Object.keys(tmpFable.MeadowSync.MeadowSyncEntities);
			}

			if (tmpSelectedTables.length === 0)
			{
				pResponse.send(400, { Success: false, Error: 'No tables available for sync. Deploy a schema first.' });
				return fNext();
			}

			// ---- Handle Sync Mode switching ----
			let fStartSync = () =>
			{
				tmpFable.log.info(`Data Cloner: Starting ${tmpCloneState.SyncMode} sync for ${tmpSelectedTables.length} tables via meadow-integration (SyncDeletedRecords: ${tmpCloneState.SyncDeletedRecords})`);

				// Initialize progress tracking
				tmpCloneState.SyncRunning = true;
				tmpCloneState.SyncStopping = false;
				tmpCloneState.SyncProgress = {};
				tmpCloneState.SyncRESTErrors = {};

				for (let i = 0; i < tmpSelectedTables.length; i++)
				{
					tmpCloneState.SyncProgress[tmpSelectedTables[i]] = (
						{
							Status: 'Pending',
							Total: 0,
							Synced: 0,
							Errors: 0,
							StartTime: null,
							EndTime: null
						});
					tmpCloneState.SyncRESTErrors[tmpSelectedTables[i]] = 0;
				}

				// Start the sync process asynchronously
				pDataClonerService.syncTables(tmpSelectedTables);

				pResponse.send(200,
					{
						Success: true,
						Tables: tmpSelectedTables,
						SyncMode: tmpCloneState.SyncMode,
						SyncDeletedRecords: tmpCloneState.SyncDeletedRecords,
						Message: `${tmpCloneState.SyncMode} sync started via meadow-integration.`
					});
				return fNext();
			};

			if (tmpRequestedMode !== tmpCloneState.SyncMode && tmpCloneState.DeployedModelObject)
			{
				tmpFable.log.info(`Data Cloner: Switching sync mode from ${tmpCloneState.SyncMode} to ${tmpRequestedMode} — re-creating sync entities...`);
				tmpCloneState.SyncMode = tmpRequestedMode;
				tmpFable.MeadowSync.SyncMode = tmpRequestedMode;

				tmpFable.MeadowSync.loadMeadowSchema(tmpCloneState.DeployedModelObject,
					(pReinitError) =>
					{
						if (pReinitError)
						{
							tmpFable.log.warn(`Data Cloner: Mode switch schema re-init warning: ${pReinitError}`);
						}
						let tmpReinitEntities = Object.keys(tmpFable.MeadowSync.MeadowSyncEntities);
						tmpFable.log.info(`Data Cloner: Re-created ${tmpReinitEntities.length} sync entities in ${tmpRequestedMode} mode`);

						// Update SyncDeletedRecords and MaxRecordsPerEntity on new entities
						for (let i = 0; i < tmpReinitEntities.length; i++)
						{
							tmpFable.MeadowSync.MeadowSyncEntities[tmpReinitEntities[i]].SyncDeletedRecords = tmpCloneState.SyncDeletedRecords;
							if (tmpMaxRecords > 0)
							{
								tmpFable.MeadowSync.MeadowSyncEntities[tmpReinitEntities[i]].MaxRecordsPerEntity = tmpMaxRecords;
							}
						}

						return fStartSync();
					});
			}
			else
			{
				tmpCloneState.SyncMode = tmpRequestedMode;
				return fStartSync();
			}
		});

	// GET /clone/sync/status
	pOratorServiceServer.get(`${tmpPrefix}/sync/status`,
		(pRequest, pResponse, fNext) =>
		{
			// Update progress from MeadowSync operation trackers
			if (tmpFable.MeadowSync && tmpFable.MeadowSync.MeadowSyncEntities)
			{
				let tmpEntityNames = Object.keys(tmpFable.MeadowSync.MeadowSyncEntities);
				for (let i = 0; i < tmpEntityNames.length; i++)
				{
					let tmpEntityName = tmpEntityNames[i];
					let tmpProgress = tmpCloneState.SyncProgress[tmpEntityName];
					if (tmpProgress && (tmpProgress.Status === 'Syncing' || tmpProgress.Status === 'Pending'))
					{
						let tmpSyncEntity = tmpFable.MeadowSync.MeadowSyncEntities[tmpEntityName];
						if (tmpSyncEntity && tmpSyncEntity.operation)
						{
							let tmpTracker = tmpSyncEntity.operation.progressTrackers[`FullSync-${tmpEntityName}`];
							if (tmpTracker)
							{
								tmpProgress.Total = tmpTracker.TotalCount || 0;
								tmpProgress.Synced = Math.max(tmpTracker.CurrentCount || 0, 0);
							}
						}
						let tmpRESTErrors = tmpCloneState.SyncRESTErrors[tmpEntityName] || 0;
						if (tmpRESTErrors > 0)
						{
							tmpProgress.Errors = tmpRESTErrors;
						}
					}
				}
			}

			pResponse.send(200,
				{
					Running: tmpCloneState.SyncRunning,
					Stopping: tmpCloneState.SyncStopping,
					SyncMode: tmpCloneState.SyncMode,
					Tables: tmpCloneState.SyncProgress
				});
			return fNext();
		});

	// POST /clone/sync/stop
	pOratorServiceServer.post(`${tmpPrefix}/sync/stop`,
		(pRequest, pResponse, fNext) =>
		{
			if (tmpCloneState.SyncRunning)
			{
				tmpCloneState.SyncStopping = true;
				tmpFable.log.info('Data Cloner: Sync stop requested.');
			}

			pResponse.send(200, { Success: true, Message: 'Sync stop requested.' });
			return fNext();
		});
};
