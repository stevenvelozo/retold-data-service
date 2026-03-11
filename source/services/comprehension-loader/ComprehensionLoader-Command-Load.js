/**
 * ComprehensionLoader Load Management Routes
 *
 * Registers /comprehension_load/comprehension/* and /comprehension_load/load/*
 * endpoints for receiving comprehension data, starting/stopping the push,
 * and polling progress.
 *
 * @param {Object} pComprehensionLoaderService - The RetoldDataServiceComprehensionLoader instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = (pComprehensionLoaderService, pOratorServiceServer) =>
{
	let tmpFable = pComprehensionLoaderService.fable;
	let tmpLoadState = pComprehensionLoaderService.loadState;
	let tmpPict = pComprehensionLoaderService.pict;
	let tmpPrefix = pComprehensionLoaderService.routePrefix;

	// POST /comprehension_load/comprehension/receive
	pOratorServiceServer.postWithBodyParser(`${tmpPrefix}/comprehension/receive`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};

			if (!tmpBody.Comprehension || (typeof tmpBody.Comprehension !== 'object'))
			{
				pResponse.send(400, { Success: false, Error: 'No valid Comprehension object provided in request body.' });
				return fNext();
			}

			let tmpSummary = pComprehensionLoaderService.loadComprehension(tmpBody.Comprehension);

			tmpFable.log.info(`Comprehension Loader: Received comprehension with ${tmpSummary.EntityList.length} entities, ${tmpSummary.TotalRecords} total records.`);

			pResponse.send(200,
				{
					Success: true,
					EntityCount: tmpSummary.EntityList.length,
					EntityList: tmpSummary.EntityList,
					RecordCounts: tmpSummary.RecordCounts,
					TotalRecords: tmpSummary.TotalRecords
				});
			return fNext();
		});

	// POST /comprehension_load/comprehension/proxy-fetch
	pOratorServiceServer.postWithBodyParser(`${tmpPrefix}/comprehension/proxy-fetch`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};
			let tmpURL = tmpBody.URL;

			if (!tmpURL || typeof tmpURL !== 'string')
			{
				pResponse.send(400, { Success: false, Error: 'URL is required.' });
				return fNext();
			}

			tmpFable.log.info(`Comprehension Loader: Proxy-fetching comprehension from ${tmpURL}...`);

			tmpPict.RestClient.getJSON(tmpURL,
				(pError, pHTTPResponse, pData) =>
				{
					if (pError)
					{
						tmpFable.log.error(`Comprehension Loader: Proxy fetch error: ${pError.message || pError}`);
						pResponse.send(500, { Success: false, Error: `Proxy fetch error: ${pError.message || pError}` });
						return fNext();
					}

					if (!pHTTPResponse || pHTTPResponse.statusCode !== 200)
					{
						let tmpStatus = pHTTPResponse ? pHTTPResponse.statusCode : 'unknown';
						pResponse.send(500, { Success: false, Error: `Proxy fetch returned HTTP ${tmpStatus}` });
						return fNext();
					}

					if (!pData || typeof pData !== 'object')
					{
						pResponse.send(400, { Success: false, Error: 'Fetched content is not valid JSON.' });
						return fNext();
					}

					let tmpSummary = pComprehensionLoaderService.loadComprehension(pData);

					tmpFable.log.info(`Comprehension Loader: Proxy-fetched comprehension with ${tmpSummary.EntityList.length} entities, ${tmpSummary.TotalRecords} total records.`);

					pResponse.send(200,
						{
							Success: true,
							EntityCount: tmpSummary.EntityList.length,
							EntityList: tmpSummary.EntityList,
							RecordCounts: tmpSummary.RecordCounts,
							TotalRecords: tmpSummary.TotalRecords
						});
					return fNext();
				});
		});

	// GET /comprehension_load/comprehension
	pOratorServiceServer.get(`${tmpPrefix}/comprehension`,
		(pRequest, pResponse, fNext) =>
		{
			pResponse.send(200,
				{
					Loaded: tmpLoadState.ComprehensionData !== null,
					EntityCount: tmpLoadState.ComprehensionEntityList.length,
					EntityList: tmpLoadState.ComprehensionEntityList,
					RecordCounts: tmpLoadState.ComprehensionRecordCounts,
					TotalRecords: tmpLoadState.ComprehensionTotalRecords
				});
			return fNext();
		});

	// POST /comprehension_load/comprehension/clear
	pOratorServiceServer.post(`${tmpPrefix}/comprehension/clear`,
		(pRequest, pResponse, fNext) =>
		{
			pComprehensionLoaderService.clearComprehension();

			tmpFable.log.info('Comprehension Loader: Comprehension data cleared.');

			pResponse.send(200, { Success: true });
			return fNext();
		});

	// POST /comprehension_load/load/start
	pOratorServiceServer.post(`${tmpPrefix}/load/start`,
		(pRequest, pResponse, fNext) =>
		{
			if (tmpLoadState.LoadRunning)
			{
				pResponse.send(409, { Success: false, Error: 'A load is already running.' });
				return fNext();
			}

			if (!tmpLoadState.ComprehensionData)
			{
				pResponse.send(400, { Success: false, Error: 'No comprehension data loaded. Send data first via /comprehension/receive.' });
				return fNext();
			}

			if (!tmpLoadState.SessionAuthenticated)
			{
				pResponse.send(400, { Success: false, Error: 'Session not authenticated. Configure and authenticate a session first.' });
				return fNext();
			}

			let tmpBody = pRequest.body || {};
			let tmpEntityList = tmpBody.Entities || tmpLoadState.ComprehensionEntityList;

			// Reset progress
			tmpLoadState.LoadProgress = {};

			tmpFable.log.info(`Comprehension Loader: Starting load for ${tmpEntityList.length} entities...`);

			// Start push asynchronously
			pComprehensionLoaderService.pushEntities(tmpEntityList);

			pResponse.send(200,
				{
					Success: true,
					Entities: tmpEntityList,
					TotalRecords: tmpLoadState.ComprehensionTotalRecords
				});
			return fNext();
		});

	// POST /comprehension_load/load/stop
	pOratorServiceServer.post(`${tmpPrefix}/load/stop`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpLoadState.LoadRunning)
			{
				pResponse.send(200, { Success: true, Message: 'No load is running.' });
				return fNext();
			}

			tmpLoadState.LoadStopping = true;
			tmpFable.log.info('Comprehension Loader: Stop requested.');

			pResponse.send(200, { Success: true, Message: 'Stop signal sent.' });
			return fNext();
		});

	// GET /comprehension_load/load/status
	pOratorServiceServer.get(`${tmpPrefix}/load/status`,
		(pRequest, pResponse, fNext) =>
		{
			pResponse.send(200,
				{
					Running: tmpLoadState.LoadRunning,
					Entities: tmpLoadState.LoadProgress
				});
			return fNext();
		});

	// GET /comprehension_load/load/live-status
	pOratorServiceServer.get(`${tmpPrefix}/load/live-status`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpEntityNames = Object.keys(tmpLoadState.LoadProgress);
			let tmpTotalPushed = 0;
			let tmpTotalRecords = tmpLoadState.ComprehensionTotalRecords;
			let tmpCompleted = 0;
			let tmpErrors = 0;
			let tmpPending = 0;
			let tmpActiveEntity = null;
			let tmpActiveProgress = null;

			for (let i = 0; i < tmpEntityNames.length; i++)
			{
				let tmpName = tmpEntityNames[i];
				let tmpP = tmpLoadState.LoadProgress[tmpName];
				tmpTotalPushed += (tmpP.Pushed || 0);

				if (tmpP.Status === 'Complete') tmpCompleted++;
				else if (tmpP.Status === 'Error') { tmpErrors++; tmpCompleted++; }
				else if (tmpP.Status === 'Pushing')
				{
					tmpActiveEntity = tmpName;
					tmpActiveProgress = { Total: tmpP.Total, Pushed: tmpP.Pushed };
				}
				else tmpPending++;
			}

			// Determine phase
			let tmpPhase = 'idle';
			let tmpMessage = 'Idle';

			if (!tmpLoadState.ComprehensionData && !tmpLoadState.LoadRunning)
			{
				tmpPhase = 'idle';
				tmpMessage = 'No comprehension data loaded';
			}
			else if (tmpLoadState.ComprehensionData && !tmpLoadState.LoadRunning && tmpEntityNames.length === 0)
			{
				tmpPhase = 'ready';
				tmpMessage = `Ready to load ${tmpLoadState.ComprehensionEntityList.length} entities (${tmpTotalRecords} records)`;
			}
			else if (tmpLoadState.LoadStopping)
			{
				tmpPhase = 'stopping';
				tmpMessage = 'Stopping...';
			}
			else if (tmpLoadState.LoadRunning)
			{
				tmpPhase = 'loading';
				if (tmpActiveEntity)
				{
					tmpMessage = `Pushing ${tmpActiveEntity}: ${tmpActiveProgress.Pushed} / ${tmpActiveProgress.Total} records`;
				}
				else
				{
					tmpMessage = `Loading ${tmpEntityNames.length} entities`;
				}
			}
			else if (tmpEntityNames.length > 0 && !tmpLoadState.LoadRunning)
			{
				tmpPhase = 'complete';
				tmpMessage = `Load complete: ${tmpCompleted} entities, ${tmpTotalPushed} records pushed`;
			}

			// Calculate elapsed time and ETA
			let tmpElapsed = null;
			let tmpETA = null;
			if (tmpLoadState.LoadStartTime)
			{
				let tmpEndTime = tmpLoadState.LoadEndTime ? new Date(tmpLoadState.LoadEndTime).getTime() : Date.now();
				let tmpElapsedMs = tmpEndTime - new Date(tmpLoadState.LoadStartTime).getTime();
				let tmpElapsedSec = Math.round(tmpElapsedMs / 1000);

				if (tmpElapsedSec < 60)
				{
					tmpElapsed = tmpElapsedSec + 's';
				}
				else
				{
					let tmpMin = Math.floor(tmpElapsedSec / 60);
					let tmpSec = tmpElapsedSec % 60;
					tmpElapsed = tmpMin + ':' + (tmpSec < 10 ? '0' : '') + tmpSec;
				}

				// ETA based on record-weighted progress
				if (tmpLoadState.LoadRunning && tmpTotalPushed > 0 && tmpTotalRecords > 0)
				{
					let tmpRemainingRecords = tmpTotalRecords - tmpTotalPushed;
					let tmpMsPerRecord = tmpElapsedMs / tmpTotalPushed;
					let tmpETAMs = tmpRemainingRecords * tmpMsPerRecord;
					let tmpETASec = Math.round(tmpETAMs / 1000);

					if (tmpETASec < 60)
					{
						tmpETA = tmpETASec + 's';
					}
					else
					{
						let tmpETAMin = Math.floor(tmpETASec / 60);
						let tmpETAS = tmpETASec % 60;
						tmpETA = tmpETAMin + ':' + (tmpETAS < 10 ? '0' : '') + tmpETAS;
					}
				}
			}

			pResponse.send(200,
				{
					Phase: tmpPhase,
					Message: tmpMessage,
					TotalEntities: tmpEntityNames.length,
					Completed: tmpCompleted,
					Errors: tmpErrors,
					Pending: tmpPending,
					TotalPushed: tmpTotalPushed,
					TotalRecords: tmpTotalRecords,
					ActiveEntity: tmpActiveEntity,
					ActiveProgress: tmpActiveProgress,
					Elapsed: tmpElapsed,
					ETA: tmpETA,
					ThroughputSamples: tmpLoadState.ThroughputSamples || []
				});
			return fNext();
		});

	// GET /comprehension_load/load/report
	pOratorServiceServer.get(`${tmpPrefix}/load/report`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpLoadState.LoadReport)
			{
				if (tmpLoadState.LoadStartTime && !tmpLoadState.LoadRunning)
				{
					pComprehensionLoaderService.generateLoadReport();
				}
			}

			if (tmpLoadState.LoadReport)
			{
				pResponse.send(200, tmpLoadState.LoadReport);
			}
			else
			{
				pResponse.send(200, { ReportVersion: null, Message: 'No load report available.' });
			}
			return fNext();
		});
};
