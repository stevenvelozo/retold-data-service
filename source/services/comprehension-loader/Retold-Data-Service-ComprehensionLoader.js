/**
 * Retold Data Service - Comprehension Loader Service
 *
 * Fable service that pushes comprehension data to a remote retold-based server.
 * Provides REST endpoints for session management, schema discovery,
 * comprehension ingestion, and entity-by-entity load orchestration.
 *
 * Two route groups:
 *   connectRoutes()      - JSON API endpoints under /comprehension_load/*
 *   connectWebUIRoutes() - Web UI HTML serving at /comprehension_load/
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libPath = require('path');

const libPict = require('pict');
const libPictSessionManager = require('pict-sessionmanager');

// Resolve the meadow-integration IntegrationAdapter
const _MeadowIntegrationBase = libPath.dirname(require.resolve('meadow-integration/package.json'));
const libIntegrationAdapter = require(libPath.join(_MeadowIntegrationBase, 'source/Meadow-Service-Integration-Adapter.js'));

const defaultComprehensionLoaderOptions = (
	{
		RoutePrefix: '/comprehension_load'
	});

class RetoldDataServiceComprehensionLoader extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, defaultComprehensionLoaderOptions, pOptions);
		super(pFable, tmpOptions, pServiceHash);

		this.serviceType = 'RetoldDataServiceComprehensionLoader';

		// Load state - tracks session, schema, comprehension, and push progress
		this._loadState = (
			{
				// Remote session
				SessionConfigured: false,
				SessionAuthenticated: false,
				RemoteServerURL: '',

				// Remote schema (fetched to discover valid entities)
				RemoteSchema: false,
				RemoteEntityList: [],

				// Comprehension data (received from browser)
				ComprehensionData: null,
				ComprehensionEntityList: [],
				ComprehensionRecordCounts: {},
				ComprehensionTotalRecords: 0,

				// Load progress
				LoadRunning: false,
				LoadStopping: false,
				LoadProgress: {},
				LoadStartTime: null,
				LoadEndTime: null,
				LoadEventLog: [],
				LoadReport: null,

				// Throughput sampling - records per 10-second window
				ThroughputSamples: [],
				ThroughputTimer: null
			});

		// Create an isolated Pict instance for remote session management
		this._Pict = new libPict(
			{
				Product: 'ComprehensionLoaderSession',
				TraceLog: true,
				LogStreams:
					[
						{
							streamtype: 'console'
						}
					]
			});

		this._Pict.serviceManager.addServiceType('SessionManager', libPictSessionManager);
		this._Pict.serviceManager.instantiateServiceProvider('SessionManager');
	}

	/**
	 * The route prefix for all comprehension loader endpoints.
	 */
	get routePrefix()
	{
		let tmpConfig = this.fable.RetoldDataService.options.ComprehensionLoader || {};
		return tmpConfig.RoutePrefix || this.options.RoutePrefix || '/comprehension_load';
	}

	/**
	 * The load state object.
	 */
	get loadState()
	{
		return this._loadState;
	}

	/**
	 * The isolated Pict instance for session management.
	 */
	get pict()
	{
		return this._Pict;
	}

	/**
	 * The IntegrationAdapter class.
	 */
	get IntegrationAdapter()
	{
		return libIntegrationAdapter;
	}

	// ================================================================
	// Comprehension Management
	// ================================================================

	/**
	 * Load comprehension data into state. Extracts entity names and counts.
	 *
	 * @param {object} pComprehensionData - The comprehension JSON object
	 * @return {object} Summary with entity list and record counts
	 */
	loadComprehension(pComprehensionData)
	{
		this._loadState.ComprehensionData = pComprehensionData;
		this._loadState.ComprehensionEntityList = Object.keys(pComprehensionData);
		this._loadState.ComprehensionRecordCounts = {};
		this._loadState.ComprehensionTotalRecords = 0;

		for (let i = 0; i < this._loadState.ComprehensionEntityList.length; i++)
		{
			let tmpEntityName = this._loadState.ComprehensionEntityList[i];
			let tmpEntityData = pComprehensionData[tmpEntityName];
			let tmpCount = 0;

			if (Array.isArray(tmpEntityData))
			{
				tmpCount = tmpEntityData.length;
			}
			else if (typeof tmpEntityData === 'object' && tmpEntityData !== null)
			{
				tmpCount = Object.keys(tmpEntityData).length;
			}

			this._loadState.ComprehensionRecordCounts[tmpEntityName] = tmpCount;
			this._loadState.ComprehensionTotalRecords += tmpCount;
		}

		return (
			{
				EntityList: this._loadState.ComprehensionEntityList,
				RecordCounts: this._loadState.ComprehensionRecordCounts,
				TotalRecords: this._loadState.ComprehensionTotalRecords
			});
	}

	/**
	 * Clear loaded comprehension data.
	 */
	clearComprehension()
	{
		this._loadState.ComprehensionData = null;
		this._loadState.ComprehensionEntityList = [];
		this._loadState.ComprehensionRecordCounts = {};
		this._loadState.ComprehensionTotalRecords = 0;
	}

	// ================================================================
	// Push Orchestration
	// ================================================================

	/**
	 * Helper to extract capital letters from a string for GUID prefix.
	 */
	getCapitalLettersAsString(pInputString)
	{
		let tmpRegex = /[A-Z]/g;
		let tmpMatch = pInputString.match(tmpRegex);
		return tmpMatch ? tmpMatch.join('') : 'UNK';
	}

	/**
	 * Push comprehension entities to the remote server, one at a time.
	 *
	 * @param {Array<string>} pEntityList - Entity names to push
	 */
	pushEntities(pEntityList)
	{
		this._loadState.LoadRunning = true;
		this._loadState.LoadStopping = false;
		this._loadState.LoadStartTime = new Date().toJSON();
		this._loadState.LoadEndTime = null;
		this._loadState.LoadEventLog = [];
		this._loadState.LoadReport = null;

		// Initialize progress for each entity
		for (let i = 0; i < pEntityList.length; i++)
		{
			let tmpEntityName = pEntityList[i];
			this._loadState.LoadProgress[tmpEntityName] = (
				{
					Status: 'Pending',
					Total: this._loadState.ComprehensionRecordCounts[tmpEntityName] || 0,
					Pushed: 0,
					Errors: 0,
					ErrorMessage: null,
					StartTime: null,
					EndTime: null
				});
		}

		this.logLoadEvent('RunStart', `Load started: ${pEntityList.length} entities, ${this._loadState.ComprehensionTotalRecords} total records`);

		this.startThroughputSampling();

		let tmpEntityIndex = 0;

		let fPushNextEntity = () =>
		{
			if (this._loadState.LoadStopping || tmpEntityIndex >= pEntityList.length)
			{
				this.stopThroughputSampling();
				this._loadState.LoadRunning = false;
				this._loadState.LoadEndTime = new Date().toJSON();

				if (this._loadState.LoadStopping)
				{
					this.logLoadEvent('RunStopped', 'Load was stopped by user request.');
				}
				else
				{
					this.logLoadEvent('RunComplete', 'Load finished.');
				}

				this._loadState.LoadStopping = false;
				this.generateLoadReport();
				this.fable.log.info('Comprehension Loader: Load complete.');
				return;
			}

			let tmpEntityName = pEntityList[tmpEntityIndex];
			tmpEntityIndex++;

			let tmpProgress = this._loadState.LoadProgress[tmpEntityName];
			if (!tmpProgress)
			{
				fPushNextEntity();
				return;
			}

			tmpProgress.Status = 'Pushing';
			tmpProgress.StartTime = new Date().toJSON();

			this.logLoadEvent('EntityStart', `Push [${tmpEntityName}] - starting.`, { Entity: tmpEntityName });
			this.fable.log.info(`Comprehension Loader: Push [${tmpEntityName}] - starting via IntegrationAdapter...`);

			let tmpEntityData = this._loadState.ComprehensionData[tmpEntityName];
			if (!tmpEntityData)
			{
				tmpProgress.Status = 'Complete';
				tmpProgress.EndTime = new Date().toJSON();
				this.logLoadEvent('EntityComplete', `Push [${tmpEntityName}] - no data.`, { Entity: tmpEntityName });
				fPushNextEntity();
				return;
			}

			// Use the IntegrationAdapter to marshal and push records
			let tmpAdapterPrefix = this.getCapitalLettersAsString(tmpEntityName);
			libIntegrationAdapter.getAdapter(this._Pict, tmpEntityName, tmpAdapterPrefix, { SimpleMarshal: true, ForceMarshal: true });

			let tmpAdapter = this._Pict.servicesMap.IntegrationAdapter[tmpEntityName];
			if (!tmpAdapter)
			{
				tmpProgress.Status = 'Error';
				tmpProgress.ErrorMessage = 'Failed to create IntegrationAdapter.';
				tmpProgress.EndTime = new Date().toJSON();
				this.logLoadEvent('EntityError', `Push [${tmpEntityName}] - adapter creation failed.`, { Entity: tmpEntityName });
				fPushNextEntity();
				return;
			}

			tmpAdapter.options.ServerURL = this._loadState.RemoteServerURL;

			// Add source records
			if (Array.isArray(tmpEntityData))
			{
				for (let r = 0; r < tmpEntityData.length; r++)
				{
					tmpAdapter.addSourceRecord(tmpEntityData[r]);
				}
			}
			else if (typeof tmpEntityData === 'object')
			{
				let tmpKeys = Object.keys(tmpEntityData);
				for (let r = 0; r < tmpKeys.length; r++)
				{
					tmpAdapter.addSourceRecord(tmpEntityData[tmpKeys[r]]);
				}
			}

			// Integrate records (marshal + push to remote)
			tmpAdapter.integrateRecords(
				(pError) =>
				{
					if (pError)
					{
						this.fable.log.error(`Comprehension Loader: Error pushing [${tmpEntityName}]: ${pError}`);
						tmpProgress.Status = 'Error';
						tmpProgress.ErrorMessage = `${pError}`;
						tmpProgress.Errors = 1;
						this.logLoadEvent('EntityError', `Push [${tmpEntityName}] - error: ${pError}`, { Entity: tmpEntityName, Error: `${pError}` });
					}
					else
					{
						tmpProgress.Status = 'Complete';
						tmpProgress.Pushed = tmpProgress.Total;
						this.fable.log.info(`Comprehension Loader: Push [${tmpEntityName}] - complete. ${tmpProgress.Total} records.`);
						this.logLoadEvent('EntityComplete', `Push [${tmpEntityName}] - complete. ${tmpProgress.Total} records.`,
							{ Entity: tmpEntityName, Total: tmpProgress.Total });
					}

					tmpProgress.EndTime = new Date().toJSON();
					fPushNextEntity();
				});
		};

		fPushNextEntity();
	}

	// ================================================================
	// Throughput Sampling
	// ================================================================

	startThroughputSampling()
	{
		this.stopThroughputSampling();
		this._loadState.ThroughputSamples = [];
		this._loadState.ThroughputSamples.push({ t: Date.now(), pushed: 0 });

		this._loadState.ThroughputTimer = setInterval(
			() =>
			{
				let tmpTotalPushed = 0;
				let tmpEntityNames = Object.keys(this._loadState.LoadProgress);
				for (let i = 0; i < tmpEntityNames.length; i++)
				{
					tmpTotalPushed += (this._loadState.LoadProgress[tmpEntityNames[i]].Pushed || 0);
				}
				this._loadState.ThroughputSamples.push({ t: Date.now(), pushed: tmpTotalPushed });
			}, 10000);
	}

	stopThroughputSampling()
	{
		if (this._loadState.ThroughputTimer)
		{
			clearInterval(this._loadState.ThroughputTimer);
			this._loadState.ThroughputTimer = null;
		}
		if (this._loadState.ThroughputSamples && this._loadState.ThroughputSamples.length > 0)
		{
			let tmpTotalPushed = 0;
			let tmpEntityNames = Object.keys(this._loadState.LoadProgress);
			for (let i = 0; i < tmpEntityNames.length; i++)
			{
				tmpTotalPushed += (this._loadState.LoadProgress[tmpEntityNames[i]].Pushed || 0);
			}
			this._loadState.ThroughputSamples.push({ t: Date.now(), pushed: tmpTotalPushed });
		}
	}

	// ================================================================
	// Event Logging & Report
	// ================================================================

	logLoadEvent(pType, pMessage, pData)
	{
		this._loadState.LoadEventLog.push(
			{
				Timestamp: new Date().toJSON(),
				Type: pType,
				Message: pMessage,
				Data: pData || undefined
			});
	}

	generateLoadReport()
	{
		let tmpState = this._loadState;
		let tmpEntityNames = Object.keys(tmpState.LoadProgress);

		let tmpEntities = [];
		let tmpTotalRecords = 0;
		let tmpTotalPushed = 0;
		let tmpTotalErrors = 0;
		let tmpComplete = 0;
		let tmpErrors = 0;
		let tmpPending = 0;

		for (let i = 0; i < tmpEntityNames.length; i++)
		{
			let tmpName = tmpEntityNames[i];
			let tmpP = tmpState.LoadProgress[tmpName];

			let tmpDuration = 0;
			if (tmpP.StartTime && tmpP.EndTime)
			{
				tmpDuration = Math.round((new Date(tmpP.EndTime).getTime() - new Date(tmpP.StartTime).getTime()) / 1000);
			}

			tmpEntities.push(
				{
					Name: tmpName,
					Status: tmpP.Status,
					Total: tmpP.Total || 0,
					Pushed: tmpP.Pushed || 0,
					Errors: tmpP.Errors || 0,
					ErrorMessage: tmpP.ErrorMessage || null,
					StartTime: tmpP.StartTime || null,
					EndTime: tmpP.EndTime || null,
					DurationSeconds: tmpDuration
				});

			tmpTotalRecords += (tmpP.Total || 0);
			tmpTotalPushed += (tmpP.Pushed || 0);
			tmpTotalErrors += (tmpP.Errors || 0);

			if (tmpP.Status === 'Complete') tmpComplete++;
			else if (tmpP.Status === 'Error') tmpErrors++;
			else tmpPending++;
		}

		tmpEntities.sort((a, b) => b.DurationSeconds - a.DurationSeconds);

		let tmpOutcome = 'Success';
		if (tmpState.LoadStopping || (!tmpState.LoadRunning && tmpPending > 0))
		{
			tmpOutcome = 'Stopped';
		}
		else if (tmpErrors > 0)
		{
			tmpOutcome = 'Error';
		}

		let tmpAnomalies = [];
		for (let i = 0; i < tmpEntities.length; i++)
		{
			let tmpE = tmpEntities[i];
			if (tmpE.Status === 'Error')
			{
				tmpAnomalies.push(
					{
						Entity: tmpE.Name,
						Type: 'Error',
						Message: tmpE.ErrorMessage || 'Unknown error'
					});
			}
			else if (tmpE.Status === 'Pending')
			{
				tmpAnomalies.push(
					{
						Entity: tmpE.Name,
						Type: 'Skipped',
						Message: 'Load was stopped before this entity was processed'
					});
			}
		}

		let tmpRunDuration = 0;
		if (tmpState.LoadStartTime && tmpState.LoadEndTime)
		{
			tmpRunDuration = Math.round((new Date(tmpState.LoadEndTime).getTime() - new Date(tmpState.LoadStartTime).getTime()) / 1000);
		}

		let tmpReport = (
			{
				ReportVersion: '1.0.0',
				Outcome: tmpOutcome,
				RunTimestamps:
					{
						Start: tmpState.LoadStartTime,
						End: tmpState.LoadEndTime,
						DurationSeconds: tmpRunDuration
					},
				Summary:
					{
						TotalEntities: tmpEntityNames.length,
						Complete: tmpComplete,
						Errors: tmpErrors,
						Pending: tmpPending,
						TotalRecords: tmpTotalRecords,
						TotalPushed: tmpTotalPushed,
						TotalErrors: tmpTotalErrors
					},
				Entities: tmpEntities,
				Anomalies: tmpAnomalies,
				EventLog: tmpState.LoadEventLog,
				ThroughputSamples: tmpState.ThroughputSamples || []
			});

		tmpState.LoadReport = tmpReport;
		return tmpReport;
	}

	// ================================================================
	// Route Registration
	// ================================================================

	connectRoutes(pOratorServiceServer)
	{
		require('./ComprehensionLoader-Command-Session.js')(this, pOratorServiceServer);
		require('./ComprehensionLoader-Command-Schema.js')(this, pOratorServiceServer);
		require('./ComprehensionLoader-Command-Load.js')(this, pOratorServiceServer);

		this.fable.log.info('Retold Data Service ComprehensionLoader API routes registered.');
	}

	connectWebUIRoutes(pOratorServiceServer)
	{
		require('./ComprehensionLoader-Command-WebUI.js')(this, pOratorServiceServer);

		this.fable.log.info('Retold Data Service ComprehensionLoader Web UI routes registered.');
	}
}

module.exports = RetoldDataServiceComprehensionLoader;
module.exports.serviceType = 'RetoldDataServiceComprehensionLoader';
module.exports.default_configuration = defaultComprehensionLoaderOptions;
