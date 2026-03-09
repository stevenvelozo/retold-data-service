/**
 * DataCloner Schema Management Routes
 *
 * Registers /clone/schema/* endpoints for fetching remote schemas,
 * deploying tables to the local database, and resetting the database.
 *
 * @param {Object} pDataClonerService - The RetoldDataServiceDataCloner instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = (pDataClonerService, pOratorServiceServer) =>
{
	let tmpFable = pDataClonerService.fable;
	let tmpCloneState = pDataClonerService.cloneState;
	let tmpPict = pDataClonerService.pict;
	let tmpPrefix = pDataClonerService.routePrefix;

	let libFs = require('fs');

	// POST /clone/schema/fetch
	// Accepts either:
	//   { SchemaURL: "..." }           — fetch from a remote URL
	//   { Schema: { Tables: {...} } }  — use a pre-loaded schema object directly
	//   {}                             — default to RemoteServerURL + 'Retold/Models'
	pOratorServiceServer.post(`${tmpPrefix}/schema/fetch`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};

			// If a raw Schema object was provided, use it directly (no remote fetch)
			if (tmpBody.Schema && typeof tmpBody.Schema === 'object')
			{
				tmpFable.log.info('Data Cloner: Using pre-loaded schema object...');

				tmpCloneState.RemoteSchema = tmpBody.Schema;
				tmpCloneState.RemoteModelObject = tmpBody.Schema;

				let tmpTableNames = [];
				if (tmpBody.Schema.Tables)
				{
					tmpTableNames = Object.keys(tmpBody.Schema.Tables);
				}

				tmpFable.log.info(`Data Cloner: Loaded schema with ${tmpTableNames.length} tables: [${tmpTableNames.join(', ')}]`);

				pResponse.send(200,
					{
						Success: true,
						Source: 'local',
						TableCount: tmpTableNames.length,
						Tables: tmpTableNames
					});
				return fNext();
			}

			let tmpSchemaURL = tmpBody.SchemaURL;

			if (!tmpSchemaURL)
			{
				// Default to the standard retold model endpoint
				if (tmpCloneState.RemoteServerURL)
				{
					tmpSchemaURL = tmpCloneState.RemoteServerURL + 'Retold/Models';
				}
				else
				{
					pResponse.send(400, { Success: false, Error: 'SchemaURL is required (or configure a session first).' });
					return fNext();
				}
			}

			tmpFable.log.info(`Data Cloner: Fetching remote schema from ${tmpSchemaURL}...`);

			tmpPict.RestClient.getJSON(tmpSchemaURL,
				(pError, pHTTPResponse, pData) =>
				{
					if (pError)
					{
						tmpFable.log.error(`Data Cloner: Schema fetch error: ${pError.message || pError}`);
						pResponse.send(500, { Success: false, Error: `Schema fetch error: ${pError.message || pError}` });
						return fNext();
					}

					if (!pHTTPResponse || pHTTPResponse.statusCode !== 200)
					{
						let tmpStatus = pHTTPResponse ? pHTTPResponse.statusCode : 'unknown';
						tmpFable.log.error(`Data Cloner: Schema fetch returned HTTP ${tmpStatus} — body: ${JSON.stringify(pData)}`);
						pResponse.send(500, { Success: false, Error: `Schema fetch returned HTTP ${tmpStatus}` });
						return fNext();
					}

					tmpCloneState.RemoteSchema = pData;
					tmpCloneState.RemoteModelObject = pData;

					// Extract table names for the UI
					let tmpTableNames = [];
					if (pData && pData.Tables)
					{
						tmpTableNames = Object.keys(pData.Tables);
					}

					tmpFable.log.info(`Data Cloner: Fetched schema with ${tmpTableNames.length} tables: [${tmpTableNames.join(', ')}]`);

					pResponse.send(200,
						{
							Success: true,
							SchemaURL: tmpSchemaURL,
							TableCount: tmpTableNames.length,
							Tables: tmpTableNames
						});
					return fNext();
				});
		});

	// GET /clone/schema
	pOratorServiceServer.get(`${tmpPrefix}/schema`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpCloneState.RemoteSchema)
			{
				pResponse.send(200, { Fetched: false, Tables: [] });
				return fNext();
			}

			let tmpTableNames = [];
			if (tmpCloneState.RemoteSchema.Tables)
			{
				tmpTableNames = Object.keys(tmpCloneState.RemoteSchema.Tables);
			}

			pResponse.send(200,
				{
					Fetched: true,
					TableCount: tmpTableNames.length,
					Tables: tmpTableNames
				});
			return fNext();
		});

	// POST /clone/reset — Delete the local SQLite database and start fresh
	pOratorServiceServer.post(`${tmpPrefix}/reset`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpSQLitePath = tmpFable.settings.SQLite && tmpFable.settings.SQLite.SQLiteFilePath;
			if (!tmpSQLitePath)
			{
				pResponse.send(400, { Success: false, Error: 'No SQLite file path configured.' });
				return fNext();
			}

			tmpFable.log.info(`Data Cloner: Resetting local database [${tmpSQLitePath}]...`);

			try
			{
				// Close the existing SQLite connection and reset the provider state
				if (tmpFable.MeadowSQLiteProvider)
				{
					if (tmpFable.MeadowSQLiteProvider._database)
					{
						tmpFable.MeadowSQLiteProvider._database.close();
					}
					tmpFable.MeadowSQLiteProvider.connected = false;
				}
			}
			catch (pCloseError)
			{
				tmpFable.log.warn(`Data Cloner: Error closing SQLite connection: ${pCloseError}`);
			}

			try
			{
				// Delete the database file
				if (libFs.existsSync(tmpSQLitePath))
				{
					libFs.unlinkSync(tmpSQLitePath);
					tmpFable.log.info('Data Cloner: SQLite database file deleted.');
				}
			}
			catch (pDeleteError)
			{
				tmpFable.log.error(`Data Cloner: Error deleting SQLite file: ${pDeleteError}`);
				pResponse.send(500, { Success: false, Error: `Failed to delete database: ${pDeleteError}` });
				return fNext();
			}

			// Reconnect to create a fresh database
			tmpFable.MeadowSQLiteProvider.connectAsync(
				(pReconnectError) =>
				{
					if (pReconnectError)
					{
						tmpFable.log.error(`Data Cloner: Error reconnecting SQLite: ${pReconnectError}`);
						pResponse.send(500, { Success: false, Error: `Failed to reconnect: ${pReconnectError}` });
						return fNext();
					}

					// Clear sync state
					tmpCloneState.SyncProgress = {};
					tmpCloneState.SyncRESTErrors = {};

					tmpFable.log.info('Data Cloner: Database reset complete — fresh SQLite file ready.');

					pResponse.send(200, { Success: true, Message: 'Database reset. Deploy a schema to recreate tables.' });
					return fNext();
				});
		});

	// POST /clone/schema/deploy
	pOratorServiceServer.post(`${tmpPrefix}/schema/deploy`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpCloneState.RemoteModelObject)
			{
				pResponse.send(400, { Success: false, Error: 'No schema fetched. Call POST /clone/schema/fetch first.' });
				return fNext();
			}

			let tmpBody = pRequest.body || {};
			let tmpSelectedTables = tmpBody.Tables || null;

			let tmpFullModel = tmpCloneState.RemoteModelObject;

			// Build a filtered model with ONLY the selected tables
			let tmpFilteredTables = {};
			let tmpFilteredSequence = [];
			let tmpSourceTables = tmpFullModel.Tables || {};

			if (tmpSelectedTables && Array.isArray(tmpSelectedTables) && tmpSelectedTables.length > 0)
			{
				for (let i = 0; i < tmpSelectedTables.length; i++)
				{
					let tmpTableName = tmpSelectedTables[i];
					if (tmpSourceTables[tmpTableName])
					{
						tmpFilteredTables[tmpTableName] = tmpSourceTables[tmpTableName];
						tmpFilteredSequence.push(tmpTableName);
					}
				}
			}
			else
			{
				// No selection — use all tables
				tmpFilteredTables = tmpSourceTables;
				tmpFilteredSequence = Object.keys(tmpSourceTables);
			}

			let tmpModelObject = { Tables: tmpFilteredTables, TablesSequence: tmpFilteredSequence };

			let tmpTableNames = Object.keys(tmpModelObject.Tables || {});
			tmpFable.log.info(`Data Cloner: Deploying ${tmpTableNames.length} tables to local ${tmpCloneState.ConnectionProvider}: [${tmpTableNames.join(', ')}]`);

			// ---- Set up MeadowCloneRestClient ----
			if (!tmpFable.MeadowCloneRestClient)
			{
				tmpFable.serviceManager.instantiateServiceProvider('MeadowCloneRestClient',
					{
						ServerURL: tmpCloneState.RemoteServerURL,
						RequestTimeout: 60000,
						MaxRequestTimeout: 300000
					});
			}
			else
			{
				tmpFable.MeadowCloneRestClient.serverURL = tmpCloneState.RemoteServerURL;
			}

			// Override getJSON to delegate through pict-sessionmanager's
			// RestClient, which already handles cookie injection & domain matching.
			let libHttps = require('https');
			libHttps.globalAgent.options.timeout = tmpFable.MeadowCloneRestClient.maxRequestTimeout;
			tmpFable.MeadowCloneRestClient.getJSON = (pURL, fCallback) =>
			{
				let tmpFullURL = tmpFable.MeadowCloneRestClient.serverURL + pURL;

				// Extract the entity name from the URL for error tracking
				let tmpEntityHint = pURL.split('/')[0].replace(/s$/, '');

				// Use the longer timeout for Max and Count queries (which can be
				// slow on large tables with millions of rows)
				let tmpIsHeavyQuery = (pURL.indexOf('/Max/') > -1) || (pURL.match(/\/Count(\/|$)/) !== null);
				let tmpPreviousTimeout = libHttps.globalAgent.options.timeout;
				libHttps.globalAgent.options.timeout = tmpIsHeavyQuery
					? tmpFable.MeadowCloneRestClient.maxRequestTimeout
					: tmpFable.MeadowCloneRestClient.requestTimeout;

				tmpPict.RestClient.getJSON(tmpFullURL,
					(pError, pHTTPResponse, pBody) =>
					{
						if (pError)
						{
							tmpFable.log.error(`Data Cloner: REST error for ${pURL}: ${pError}`);
							if (tmpCloneState.SyncRESTErrors[tmpEntityHint] !== undefined)
							{
								tmpCloneState.SyncRESTErrors[tmpEntityHint]++;
							}
						}
						else
						{
							// Track when the server returns a non-array for list endpoints
							// Count/FilteredTo returns {"Count":N} (an object, not an array) which is expected
							if (pURL.indexOf('FilteredTo') > -1 && pURL.indexOf('Count/FilteredTo') < 0 && !Array.isArray(pBody))
							{
								let tmpBodyPreview = (typeof(pBody) === 'string') ? pBody.substring(0, 300) : JSON.stringify(pBody).substring(0, 300);
								tmpFable.log.warn(`Data Cloner: FilteredTo response for ${tmpEntityHint} is not an array — URL: ${pURL} — Response: ${tmpBodyPreview}`);
								if (tmpCloneState.SyncRESTErrors[tmpEntityHint] !== undefined)
								{
									tmpCloneState.SyncRESTErrors[tmpEntityHint]++;
								}
							}
						}
						libHttps.globalAgent.options.timeout = tmpPreviousTimeout;
						return fCallback(pError, pHTTPResponse, pBody);
					});
			};

			// ---- Set up MeadowSync ----
			if (!tmpFable.ProgramConfiguration)
			{
				tmpFable.ProgramConfiguration = {};
			}

			tmpFable.serviceManager.instantiateServiceProvider('MeadowSync',
				{
					SyncEntityList: tmpTableNames,
					PageSize: 100,
					SyncDeletedRecords: tmpCloneState.SyncDeletedRecords
				});

			tmpFable.MeadowSync.loadMeadowSchema(tmpModelObject,
				(pSyncInitError) =>
				{
					if (pSyncInitError)
					{
						tmpFable.log.warn(`Data Cloner: MeadowSync schema init warning: ${pSyncInitError}`);
					}

					let tmpInitializedEntities = Object.keys(tmpFable.MeadowSync.MeadowSyncEntities);
					tmpFable.log.info(`Data Cloner: MeadowSync initialized ${tmpInitializedEntities.length} sync entities: [${tmpInitializedEntities.join(', ')}]`);

					// Store the deployed model so sync mode switches can re-create entities
					tmpCloneState.DeployedModelObject = tmpModelObject;

					tmpFable.log.info(`Data Cloner: Loading model for CRUD endpoints...`);

					// Load the filtered model so CRUD endpoints are available
					tmpFable.RetoldDataServiceMeadowEndpoints.loadModel('RemoteClone', tmpModelObject, tmpCloneState.ConnectionProvider,
						(pLoadError) =>
						{
							if (pLoadError)
							{
								tmpFable.log.error(`Data Cloner: Model load error: ${pLoadError}`);
							}
							else
							{
								tmpFable.log.info(`Data Cloner: CRUD endpoints available for: [${tmpTableNames.join(', ')}]`);
							}

							pResponse.send(200,
								{
									Success: true,
									TablesDeployed: tmpTableNames,
									SyncEntities: tmpInitializedEntities,
									Message: `${tmpInitializedEntities.length} / ${tmpTableNames.length} tables deployed. meadow-integration sync ready.`
								});
							return fNext();
						});
				});
		});
};
