/**
 * Retold Data Service - Data Cloner Service
 *
 * Fable service that clones a remote retold-based database to a local database.
 * Provides REST endpoints for connection management, session management, schema
 * fetch/deploy, and data synchronization via meadow-integration.
 *
 * Two route groups:
 *   connectRoutes()      — JSON API endpoints under /clone/*
 *   connectWebUIRoutes() — Web UI HTML serving at /clone/
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libFs = require('fs');
const libPath = require('path');

const libPict = require('pict');
const libPictSessionManager = require('pict-sessionmanager');

const _ProviderRegistry = require('./DataCloner-ProviderRegistry.js');

const defaultDataClonerOptions = (
	{
		// Route prefix for all data cloner endpoints
		RoutePrefix: '/clone'
	});

class RetoldDataServiceDataCloner extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, defaultDataClonerOptions, pOptions);
		super(pFable, tmpOptions, pServiceHash);

		this.serviceType = 'RetoldDataServiceDataCloner';

		// Clone state — tracks connection, session, schema, and sync progress
		this._cloneState = (
			{
				// Tenant identifier for telemetry
				TenantID: null,

				// Local database connection
				ConnectionProvider: 'SQLite',
				ConnectionConnected: false,
				ConnectionConfig: {},

				// Remote session configuration
				SessionConfigured: false,
				SessionAuthenticated: false,
				RemoteServerURL: '',

				// Fetched remote schema
				RemoteSchema: false,
				RemoteModelObject: false,
				DeployedModelObject: false,

				// Sync progress
				SyncRunning: false,
				SyncStopping: false,
				SyncPhase: null,
				SyncProgress: {},
				SyncDeletedRecords: false,
				SyncMode: 'Initial',

				// Pre-count phase
				PreCountProgress: null,
				PreCountGrandTotal: 0,

				// Per-table REST error counters
				SyncRESTErrors: {},

				// Sync report
				SyncRunID: null,
				SyncStartTime: null,
				SyncEndTime: null,
				SyncEventLog: [],
				SyncReport: null,

				// Throughput sampling — records per 10-second window
				ThroughputSamples: [],
				ThroughputTimer: null
			});

		// Create an isolated Pict instance for remote session management
		this._Pict = new libPict(
			{
				Product: 'DataClonerSession',
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
	 * The route prefix for all data cloner endpoints.
	 */
	get routePrefix()
	{
		let tmpConfig = this.fable.RetoldDataService.options.DataCloner || {};
		return tmpConfig.RoutePrefix || this.options.RoutePrefix || '/clone';
	}

	/**
	 * The clone state object.
	 */
	get cloneState()
	{
		return this._cloneState;
	}

	/**
	 * The isolated Pict instance for session management.
	 */
	get pict()
	{
		return this._Pict;
	}

	/**
	 * The provider registry.
	 */
	get providerRegistry()
	{
		return _ProviderRegistry;
	}

	/**
	 * Connect a meadow-connection provider to fable.
	 * Registers the service type, sets the configuration, instantiates the provider, and calls connectAsync.
	 *
	 * @param {string} pProviderName - Provider name (e.g. 'SQLite', 'MySQL', 'MSSQL')
	 * @param {object} pConfig - Provider configuration
	 * @param {function} fCallback - (pError)
	 */
	connectProvider(pProviderName, pConfig, fCallback)
	{
		let tmpRegistryEntry = _ProviderRegistry[pProviderName];
		if (!tmpRegistryEntry)
		{
			return fCallback(new Error(`Unknown provider: ${pProviderName}. Supported providers: ${Object.keys(_ProviderRegistry).join(', ')}`));
		}

		let tmpModule;
		try
		{
			tmpModule = require(tmpRegistryEntry.moduleName);
		}
		catch (pRequireError)
		{
			return fCallback(new Error(`Could not load module "${tmpRegistryEntry.moduleName}": ${pRequireError.message}. Run: npm install ${tmpRegistryEntry.moduleName}`));
		}

		// Normalize the config to include both old-style (Server, Port, User, etc.)
		// and mysql2-native (host, port, user, etc.) property names so it works
		// with any version of the meadow-connection provider.
		let tmpNormalizedConfig = Object.assign({}, pConfig);
		if (pProviderName === 'MySQL' || pProviderName === 'MSSQL' || pProviderName === 'PostgreSQL')
		{
			if (tmpNormalizedConfig.host && !tmpNormalizedConfig.Server)
			{
				tmpNormalizedConfig.Server = tmpNormalizedConfig.host;
			}
			if (tmpNormalizedConfig.port && !tmpNormalizedConfig.Port)
			{
				tmpNormalizedConfig.Port = tmpNormalizedConfig.port;
			}
			if (tmpNormalizedConfig.user && !tmpNormalizedConfig.User)
			{
				tmpNormalizedConfig.User = tmpNormalizedConfig.user;
			}
			if (tmpNormalizedConfig.password && !tmpNormalizedConfig.Password)
			{
				tmpNormalizedConfig.Password = tmpNormalizedConfig.password;
			}
			if (tmpNormalizedConfig.database && !tmpNormalizedConfig.Database)
			{
				tmpNormalizedConfig.Database = tmpNormalizedConfig.database;
			}
			if (tmpNormalizedConfig.connectionLimit && !tmpNormalizedConfig.ConnectionPoolLimit)
			{
				tmpNormalizedConfig.ConnectionPoolLimit = tmpNormalizedConfig.connectionLimit;
			}
		}

		// Set the provider configuration on fable settings
		this.fable.settings[tmpRegistryEntry.configKey] = tmpNormalizedConfig;

		// Register and instantiate the provider if not already present
		if (!this.fable[tmpRegistryEntry.serviceName])
		{
			this.fable.serviceManager.addServiceType(tmpRegistryEntry.serviceName, tmpModule);
			this.fable.serviceManager.instantiateServiceProvider(tmpRegistryEntry.serviceName);
		}
		else
		{
			// Provider already exists — update its options with the new config
			// so reconnects use the current settings.
			this.fable[tmpRegistryEntry.serviceName].options[tmpRegistryEntry.configKey] = tmpNormalizedConfig;
		}

		this.fable[tmpRegistryEntry.serviceName].connectAsync(
			(pError) =>
			{
				if (pError)
				{
					return fCallback(pError);
				}
				this.fable.settings.MeadowProvider = pProviderName;
				this._cloneState.ConnectionProvider = pProviderName;
				this._cloneState.ConnectionConnected = true;
				this._cloneState.ConnectionConfig = pConfig;
				return fCallback();
			});
	}

	/**
	 * Normalize a config object from meadow-integration format to data-cloner format.
	 *
	 * @param {object} pConfig - Config object (possibly in meadow-integration format)
	 * @return {object} Normalized config
	 */
	normalizeConfig(pConfig)
	{
		// Support meadow-integration config format (Source/Destination/SessionManager)
		// by mapping to data-cloner format (RemoteSession/Credentials/LocalDatabase/Tables).
		if (pConfig.Source && pConfig.Source.ServerURL && !pConfig.RemoteSession)
		{
			this.fable.log.info('Data Cloner: Detected meadow-integration config format; normalizing...');

			// Map Source → RemoteSession
			let tmpSession = pConfig.SessionManager
				&& pConfig.SessionManager.Sessions
				&& pConfig.SessionManager.Sessions.SourceAPI;

			pConfig.RemoteSession = {};
			pConfig.RemoteSession.ServerURL = pConfig.Source.ServerURL;

			if (tmpSession)
			{
				pConfig.RemoteSession.AuthenticationMethod = tmpSession.AuthenticationMethod;
				pConfig.RemoteSession.AuthenticationURITemplate = tmpSession.AuthenticationURITemplate;
				pConfig.RemoteSession.CheckSessionURITemplate = tmpSession.CheckSessionURITemplate;
				pConfig.RemoteSession.CheckSessionLoginMarkerType = tmpSession.CheckSessionLoginMarkerType;
				pConfig.RemoteSession.CheckSessionLoginMarker = tmpSession.CheckSessionLoginMarker;
				pConfig.RemoteSession.DomainMatch = tmpSession.DomainMatch;
				pConfig.RemoteSession.CookieName = tmpSession.CookieName;
				pConfig.RemoteSession.CookieValueAddress = tmpSession.CookieValueAddress;
				pConfig.RemoteSession.CookieValueTemplate = tmpSession.CookieValueTemplate;

				// Map SessionManager credentials → Credentials
				if (tmpSession.Credentials && !pConfig.Credentials)
				{
					pConfig.Credentials = tmpSession.Credentials;
				}
			}
			else if (pConfig.Source.UserID && pConfig.Source.Password)
			{
				// Fallback: legacy Source.UserID / Source.Password
				if (!pConfig.Credentials)
				{
					pConfig.Credentials = { UserName: pConfig.Source.UserID, Password: pConfig.Source.Password };
				}
			}

			// Map Destination → LocalDatabase
			if (pConfig.Destination && !pConfig.LocalDatabase)
			{
				pConfig.LocalDatabase = { Provider: pConfig.Destination.Provider };
				if (pConfig.Destination.Provider === 'MySQL' && pConfig.Destination.MySQL)
				{
					pConfig.LocalDatabase.Config = pConfig.Destination.MySQL;
				}
				else if (pConfig.Destination.Provider === 'MSSQL' && pConfig.Destination.MSSQL)
				{
					pConfig.LocalDatabase.Config = pConfig.Destination.MSSQL;
				}
			}

			// Map Sync.SyncEntityList → Tables
			if (pConfig.Sync && pConfig.Sync.SyncEntityList && !pConfig.Tables)
			{
				pConfig.Tables = pConfig.Sync.SyncEntityList;
			}

			// Map Sync.DefaultSyncMode → Sync.Mode
			if (pConfig.Sync && pConfig.Sync.DefaultSyncMode && !pConfig.Sync.Mode)
			{
				pConfig.Sync.Mode = pConfig.Sync.DefaultSyncMode;
			}
		}

		return pConfig;
	}

	// ================================================================
	// Sync Report
	// ================================================================

	/**
	 * Append a timestamped event to the sync event log.
	 *
	 * @param {string} pType - Event type (RunStart, TableStart, TableComplete, etc.)
	 * @param {string} pMessage - Human-readable message
	 * @param {object} [pData] - Optional structured data for this event
	 */
	logSyncEvent(pType, pMessage, pData)
	{
		this._cloneState.SyncEventLog.push(
			{
				Timestamp: new Date().toJSON(),
				Type: pType,
				Message: pMessage,
				Data: pData || undefined
			});
	}

	/**
	 * Generate a structured report object from current clone state.
	 *
	 * @return {object} The sync report
	 */
	generateSyncReport()
	{
		let tmpState = this._cloneState;
		let tmpTableNames = Object.keys(tmpState.SyncProgress);

		// Build per-table entries with duration
		let tmpTables = [];
		let tmpTotalRecords = 0;
		let tmpTotalSynced = 0;
		let tmpTotalSkipped = 0;
		let tmpTotalErrors = 0;
		let tmpComplete = 0;
		let tmpPartial = 0;
		let tmpErrors = 0;
		let tmpPending = 0;

		for (let i = 0; i < tmpTableNames.length; i++)
		{
			let tmpName = tmpTableNames[i];
			let tmpP = tmpState.SyncProgress[tmpName];

			let tmpDuration = 0;
			if (tmpP.StartTime && tmpP.EndTime)
			{
				tmpDuration = Math.round((new Date(tmpP.EndTime).getTime() - new Date(tmpP.StartTime).getTime()) / 1000);
			}

			tmpTables.push(
				{
					Name: tmpName,
					Status: tmpP.Status,
					Total: tmpP.Total || 0,
					Synced: tmpP.Synced || 0,
					Skipped: tmpP.Skipped || 0,
					Errors: tmpP.Errors || 0,
					New: tmpP.New || 0,
					Updated: tmpP.Updated || 0,
					Unchanged: tmpP.Unchanged || 0,
					Deleted: tmpP.Deleted || 0,
					ServerTotal: tmpP.ServerTotal || 0,
					LocalCountBefore: tmpP.LocalCountBefore || 0,
					ErrorMessage: tmpP.ErrorMessage || null,
					StartTime: tmpP.StartTime || null,
					EndTime: tmpP.EndTime || null,
					DurationSeconds: tmpDuration
				});

			tmpTotalRecords += (tmpP.Total || 0);
			tmpTotalSynced += (tmpP.Synced || 0);
			tmpTotalSkipped += (tmpP.Skipped || 0);
			tmpTotalErrors += (tmpP.Errors || 0);

			if (tmpP.Status === 'Complete') tmpComplete++;
			else if (tmpP.Status === 'Partial') tmpPartial++;
			else if (tmpP.Status === 'Error') tmpErrors++;
			else tmpPending++;
		}

		// Sort tables by duration descending
		tmpTables.sort((a, b) => b.DurationSeconds - a.DurationSeconds);

		// Determine overall outcome
		let tmpOutcome = 'Success';
		if (tmpState.SyncStopping || (!tmpState.SyncRunning && tmpPending > 0))
		{
			tmpOutcome = 'Stopped';
		}
		else if (tmpErrors > 0)
		{
			tmpOutcome = 'Error';
		}
		else if (tmpPartial > 0)
		{
			tmpOutcome = 'Partial';
		}

		// Build anomalies — tables that are not Complete
		let tmpAnomalies = [];
		for (let i = 0; i < tmpTables.length; i++)
		{
			let tmpT = tmpTables[i];
			if (tmpT.Status === 'Error')
			{
				tmpAnomalies.push(
					{
						Table: tmpT.Name,
						Type: 'Error',
						Message: tmpT.ErrorMessage || 'Unknown error',
						Details: { Total: tmpT.Total, Synced: tmpT.Synced, Errors: tmpT.Errors }
					});
			}
			else if (tmpT.Status === 'Partial')
			{
				tmpAnomalies.push(
					{
						Table: tmpT.Name,
						Type: 'Partial',
						Message: `${tmpT.Skipped} record(s) skipped`,
						Details: { Total: tmpT.Total, Synced: tmpT.Synced, Skipped: tmpT.Skipped }
					});
			}
			else if (tmpT.Status === 'Pending')
			{
				tmpAnomalies.push(
					{
						Table: tmpT.Name,
						Type: 'Skipped',
						Message: 'Sync was stopped before this table was processed',
						Details: {}
					});
			}
		}

		// Calculate run duration
		let tmpRunDuration = 0;
		if (tmpState.SyncStartTime && tmpState.SyncEndTime)
		{
			tmpRunDuration = Math.round((new Date(tmpState.SyncEndTime).getTime() - new Date(tmpState.SyncStartTime).getTime()) / 1000);
		}

		let tmpReport = (
			{
				ReportVersion: '1.0.0',
				RunID: tmpState.SyncRunID,
				Outcome: tmpOutcome,
				RunTimestamps:
					{
						Start: tmpState.SyncStartTime,
						End: tmpState.SyncEndTime,
						DurationSeconds: tmpRunDuration
					},
				Config:
					{
						SyncMode: tmpState.SyncMode,
						RemoteServerURL: tmpState.RemoteServerURL,
						Provider: tmpState.ConnectionProvider,
						SyncDeletedRecords: tmpState.SyncDeletedRecords,
						TableCount: tmpTableNames.length
					},
				Summary:
					{
						TotalTables: tmpTableNames.length,
						Complete: tmpComplete,
						Partial: tmpPartial,
						Errors: tmpErrors,
						Pending: tmpPending,
						TotalRecords: tmpTotalRecords,
						TotalSynced: tmpTotalSynced,
						TotalSkipped: tmpTotalSkipped,
						TotalErrors: tmpTotalErrors
					},
				Tables: tmpTables,
				Anomalies: tmpAnomalies,
				EventLog: tmpState.SyncEventLog,
				ThroughputSamples: tmpState.ThroughputSamples || []
			});

		tmpState.SyncReport = tmpReport;
		return tmpReport;
	}

	/**
	 * Print a terminal-friendly summary of the last sync run.
	 */
	logSyncSummary()
	{
		let tmpReport = this._cloneState.SyncReport;
		if (!tmpReport)
		{
			tmpReport = this.generateSyncReport();
		}

		let tmpBar = '═══════════════════════════════════════════════════';

		// Format duration as Xm Ys
		let fFormatDuration = (pSeconds) =>
		{
			if (pSeconds < 60) return `${pSeconds}s`;
			let tmpMin = Math.floor(pSeconds / 60);
			let tmpSec = pSeconds % 60;
			return `${tmpMin}m ${tmpSec}s`;
		};

		// Format number with commas
		let fFormatNumber = (pNum) =>
		{
			return pNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		};

		let tmpLines = [];
		tmpLines.push(tmpBar);
		tmpLines.push('  DATA CLONER — SYNC REPORT');
		tmpLines.push(tmpBar);
		tmpLines.push(`  Outcome:    ${tmpReport.Outcome}`);
		tmpLines.push(`  Mode:       ${tmpReport.Config.SyncMode}`);
		tmpLines.push(`  Duration:   ${fFormatDuration(tmpReport.RunTimestamps.DurationSeconds)}`);
		tmpLines.push(`  Tables:     ${tmpReport.Summary.Complete} complete, ${tmpReport.Summary.Partial} partial, ${tmpReport.Summary.Errors} errors`);
		tmpLines.push(`  Records:    ${fFormatNumber(tmpReport.Summary.TotalSynced)} synced` + (tmpReport.Summary.TotalRecords > 0 ? ` of ${fFormatNumber(tmpReport.Summary.TotalRecords)}` : ''));
		tmpLines.push(tmpBar);

		if (tmpReport.Anomalies.length === 0)
		{
			tmpLines.push('  ANOMALIES: None');
		}
		else
		{
			tmpLines.push(`  ANOMALIES: ${tmpReport.Anomalies.length}`);
			for (let i = 0; i < tmpReport.Anomalies.length; i++)
			{
				let tmpA = tmpReport.Anomalies[i];
				tmpLines.push(`    [${tmpA.Type}] ${tmpA.Table}: ${tmpA.Message}`);
			}
		}
		tmpLines.push(tmpBar);

		// Top 5 tables by duration
		let tmpTopCount = Math.min(5, tmpReport.Tables.length);
		if (tmpTopCount > 0)
		{
			tmpLines.push('  TOP TABLES BY DURATION:');
			for (let i = 0; i < tmpTopCount; i++)
			{
				let tmpT = tmpReport.Tables[i];
				let tmpDur = fFormatDuration(tmpT.DurationSeconds).padEnd(8);
				let tmpRecs = fFormatNumber(tmpT.Total).padStart(10);
				tmpLines.push(`    ${tmpT.Name.padEnd(30)} ${tmpDur} ${tmpRecs} records`);
			}
			tmpLines.push(tmpBar);
		}

		this.fable.log.info(`\n${tmpLines.join('\n')}`);
	}


	/**
	 * Start the throughput sampler.  Every 10 seconds, records a cumulative
	 * { t, synced } sample so the UI can render a records-per-10s histogram.
	 */
	startThroughputSampling()
	{
		this.stopThroughputSampling();
		this._cloneState.ThroughputSamples = [];
		this._cloneState.ThroughputSamples.push({ t: Date.now(), synced: 0 });

		this._cloneState.ThroughputTimer = setInterval(
			() =>
			{
				// Read directly from MeadowSync progress trackers for accurate
				// real-time counts, then update SyncProgress as a side-effect so
				// the next live-status poll also has fresh data.
				let tmpTotalSynced = 0;
				let tmpTableNames = Object.keys(this._cloneState.SyncProgress);
				let tmpSyncEntities = (this.fable.MeadowSync && this.fable.MeadowSync.MeadowSyncEntities) || {};

				for (let i = 0; i < tmpTableNames.length; i++)
				{
					let tmpName = tmpTableNames[i];
					let tmpProgress = this._cloneState.SyncProgress[tmpName];

					// If the entity is actively syncing, read the live tracker value
					if (tmpProgress.Status === 'Syncing' || tmpProgress.Status === 'Pending')
					{
						let tmpSyncEntity = tmpSyncEntities[tmpName];
						if (tmpSyncEntity && tmpSyncEntity.operation)
						{
							let tmpTracker = tmpSyncEntity.operation.progressTrackers[`FullSync-${tmpName}`];
							if (tmpTracker)
							{
								tmpProgress.Total = tmpTracker.TotalCount || tmpProgress.Total;
								tmpProgress.Synced = Math.max(tmpTracker.CurrentCount || 0, 0);
							}
						}
					}

					tmpTotalSynced += (tmpProgress.Synced || 0);
				}
				this._cloneState.ThroughputSamples.push({ t: Date.now(), synced: tmpTotalSynced });
			}, 10000);
	}

	/**
	 * Stop the throughput sampler and record a final sample.
	 */
	stopThroughputSampling()
	{
		if (this._cloneState.ThroughputTimer)
		{
			clearInterval(this._cloneState.ThroughputTimer);
			this._cloneState.ThroughputTimer = null;
		}
		if (this._cloneState.ThroughputSamples && this._cloneState.ThroughputSamples.length > 0)
		{
			let tmpTotalSynced = 0;
			let tmpTableNames = Object.keys(this._cloneState.SyncProgress);
			for (let i = 0; i < tmpTableNames.length; i++)
			{
				tmpTotalSynced += (this._cloneState.SyncProgress[tmpTableNames[i]].Synced || 0);
			}
			this._cloneState.ThroughputSamples.push({ t: Date.now(), synced: tmpTotalSynced });
		}
	}

	/**
	 * Pre-count phase — fetch record counts for all tables in parallel
	 * before starting the actual sync. Populates SyncProgress[table].Total
	 * and PreCountGrandTotal so the UI can show accurate overall progress.
	 *
	 * @param {Array<string>} pTables - Table names to count
	 * @param {Function} fCallback - Called when counting is complete
	 */
	preCountTables(pTables, fCallback)
	{
		this._cloneState.SyncPhase = 'counting';
		this._cloneState.PreCountProgress = {
			Counted: 0,
			TotalTables: pTables.length,
			StartTime: Date.now(),
			Tables: []
		};
		this._cloneState.PreCountGrandTotal = 0;

		this.fable.log.info(`Data Cloner: Pre-counting records for ${pTables.length} tables...`);
		this.logSyncEvent('PreCountStart', `Pre-counting ${pTables.length} tables`);

		this.fable.Utility.eachLimit(pTables, 5,
			(pTableName, fNext) =>
			{
				if (this._cloneState.SyncStopping)
				{
					return fNext();
				}

				let tmpTableStartTime = Date.now();
				let tmpCountURL = `${pTableName}s/Count`;
				this.fable.MeadowCloneRestClient.getJSON(tmpCountURL,
					(pError, pResponse, pBody) =>
					{
						let tmpCount = 0;
						if (!pError && pBody && pBody.Count)
						{
							tmpCount = pBody.Count;
						}
						if (this._cloneState.SyncProgress[pTableName])
						{
							this._cloneState.SyncProgress[pTableName].Total = tmpCount;
						}
						let tmpElapsedMs = Date.now() - tmpTableStartTime;
						this._cloneState.PreCountProgress.Counted++;
						this._cloneState.PreCountProgress.Tables.push({
							Name: pTableName,
							Count: tmpCount,
							ElapsedMs: tmpElapsedMs,
							Error: pError ? true : false
						});
						this._cloneState.PreCountGrandTotal += tmpCount;
						return fNext();
					});
			},
			(pError) =>
			{
				this._cloneState.SyncPhase = 'syncing';
				this.fable.log.info(`Data Cloner: Pre-count complete — ${this._cloneState.PreCountGrandTotal} records across ${pTables.length} tables`);
				this.logSyncEvent('PreCountComplete', `Pre-count: ${this._cloneState.PreCountGrandTotal} records across ${pTables.length} tables`);
				return fCallback();
			});
	}

	/**
	 * Warm up the local database connection by running a lightweight test query.
	 * This forces the connection pool to recycle any stale/dead connections
	 * (e.g. after a burst of CREATE TABLE statements during deploy).
	 * Retries up to 3 times with a short delay between attempts.
	 *
	 * @param {Function} fCallback - Called when a connection is verified
	 */
	warmUpLocalConnection(fCallback)
	{
		let tmpProviderName = this._cloneState.ConnectionProvider;
		let tmpAttempts = 0;
		let tmpMaxAttempts = 5;
		let tmpRetryDelayMs = 2000;

		let fAttempt = () =>
		{
			tmpAttempts++;

			if (tmpProviderName === 'SQLite')
			{
				// SQLite doesn't have connection pool issues
				return fCallback();
			}

			// Look up the provider service via the registry
			let tmpRegistryEntry = _ProviderRegistry[tmpProviderName];
			if (!tmpRegistryEntry)
			{
				this.fable.log.warn(`Data Cloner: Connection warmup — unknown provider "${tmpProviderName}", skipping.`);
				return fCallback();
			}

			let tmpProviderService = this.fable[tmpRegistryEntry.serviceName];
			if (!tmpProviderService)
			{
				this.fable.log.warn(`Data Cloner: Connection warmup — provider service "${tmpRegistryEntry.serviceName}" not available, skipping.`);
				return fCallback();
			}

			// Log the pool config on the first attempt for diagnostics
			if (tmpAttempts === 1)
			{
				let tmpPoolConfig = tmpProviderService.options && tmpProviderService.options.MySQL;
				if (tmpPoolConfig)
				{
					this.fable.log.info(`Data Cloner: Connection warmup — pool target: ${tmpPoolConfig.host}:${tmpPoolConfig.port} database=${tmpPoolConfig.database} user=${tmpPoolConfig.user}`);
				}
			}

			// If the pool doesn't exist or a previous attempt failed, try to (re)create it
			if (!tmpProviderService.pool)
			{
				this.fable.log.info(`Data Cloner: Connection warmup — no pool exists, calling connect()...`);
				try
				{
					tmpProviderService.connect();
				}
				catch (pConnectError)
				{
					this.fable.log.warn(`Data Cloner: Connection warmup — connect() error: ${pConnectError.message}`);
				}
			}

			if (!tmpProviderService.pool)
			{
				this.fable.log.warn(`Data Cloner: Connection warmup — pool still not available after connect(), skipping.`);
				return fCallback();
			}

			// Run a lightweight test query to force the pool to recycle stale connections
			this.fable.log.info(`Data Cloner: Connection warmup attempt ${tmpAttempts}/${tmpMaxAttempts}...`);
			tmpProviderService.pool.query('SELECT 1 AS _warmup',
				(pError) =>
				{
					if (pError)
					{
						this.fable.log.warn(`Data Cloner: Connection warmup attempt ${tmpAttempts}/${tmpMaxAttempts} failed: ${pError.code || pError.message}`);

						// If the pool is persistently failing, destroy and recreate it
						if (tmpAttempts >= 2 && pError.code === 'ECONNREFUSED')
						{
							this.fable.log.info('Data Cloner: Connection warmup — destroying stale pool and recreating...');
							try
							{
								tmpProviderService.pool.end(() => {});
							}
							catch (pEndError) { /* ignore */ }
							tmpProviderService._ConnectionPool = false;
							tmpProviderService.connected = false;
							try
							{
								tmpProviderService.connect();
								this.fable.log.info('Data Cloner: Connection warmup — pool recreated.');
							}
							catch (pReconnectError)
							{
								this.fable.log.warn(`Data Cloner: Connection warmup — reconnect error: ${pReconnectError.message}`);
							}
						}

						if (tmpAttempts < tmpMaxAttempts)
						{
							setTimeout(fAttempt, tmpRetryDelayMs);
						}
						else
						{
							this.fable.log.warn('Data Cloner: Connection warmup exhausted retries — proceeding with sync anyway.');
							return fCallback();
						}
					}
					else
					{
						this.fable.log.info(`Data Cloner: Connection warmup succeeded on attempt ${tmpAttempts}.`);
						return fCallback();
					}
				});
		};

		fAttempt();
	}

	/**
	 * The sync engine — synchronize data for a list of tables sequentially.
	 *
	 * @param {Array<string>} pTables - Table names to sync
	 */
	syncTables(pTables)
	{
		let tmpTableIndex = 0;

		// Initialize run tracking
		this._cloneState.SyncRunID = this.fable.getUUID();
		this._cloneState.SyncStartTime = new Date().toJSON();
		this._cloneState.SyncEndTime = null;
		this._cloneState.SyncEventLog = [];
		this._cloneState.SyncReport = null;

		this.logSyncEvent('RunStart', `Sync started: ${pTables.length} tables, mode ${this._cloneState.SyncMode}`);
		this.logSyncEvent('RunConfig', 'Sync configuration',
			{
				SyncMode: this._cloneState.SyncMode,
				Tables: pTables,
				RemoteServerURL: this._cloneState.RemoteServerURL,
				Provider: this._cloneState.ConnectionProvider,
				SyncDeletedRecords: this._cloneState.SyncDeletedRecords
			});

		this.startThroughputSampling();
		let fSyncNextTable = () =>
		{
			if (this._cloneState.SyncStopping || tmpTableIndex >= pTables.length)
			{
				this.stopThroughputSampling();
				this._cloneState.SyncRunning = false;
				this._cloneState.SyncEndTime = new Date().toJSON();

				if (this._cloneState.SyncStopping)
				{
					this.logSyncEvent('RunStopped', 'Sync was stopped by user request.');
				}
				else
				{
					this.logSyncEvent('RunComplete', 'Sync finished.');
				}

				this._cloneState.SyncStopping = false;
				let tmpReport = this.generateSyncReport();
				this.logSyncSummary();

				// Persist telemetry if the IntegrationTelemetry service is available
				if (this.fable.RetoldDataServiceIntegrationTelemetry)
				{
					let tmpTenantID = this._cloneState.TenantID || undefined;
					this.fable.RetoldDataServiceIntegrationTelemetry.recordRun(tmpReport, tmpTenantID);
				}

				this.fable.log.info('Data Cloner: Sync complete.');

				// Close the log file stream if one was opened for this run
				if (this._cloneState.SyncLogFileLogger)
				{
					let tmpLogPath = this._cloneState.SyncLogFilePath || '';
					let tmpLogger = this._cloneState.SyncLogFileLogger;

					// Log before closing so the message is captured in the file
					this.fable.log.info(`Data Cloner: Log file closing — ${tmpLogPath}`);

					// Remove the logger from fable.log stream arrays so no writes
					// are dispatched to it after the underlying stream is closed.
					let tmpStreamArrays = [
						'logStreams', 'logStreamsTrace', 'logStreamsDebug',
						'logStreamsInfo', 'logStreamsWarn', 'logStreamsError', 'logStreamsFatal'
					];
					for (let s = 0; s < tmpStreamArrays.length; s++)
					{
						let tmpArr = this.fable.log[tmpStreamArrays[s]];
						if (Array.isArray(tmpArr))
						{
							let tmpIdx = tmpArr.indexOf(tmpLogger);
							if (tmpIdx > -1) tmpArr.splice(tmpIdx, 1);
						}
					}

					this._cloneState.SyncLogFileLogger = null;
					this._cloneState.SyncLogFilePath = null;

					// Now flush and close safely — no more writes can reach this stream
					try
					{
						tmpLogger.flushBufferToLogFile(() =>
						{
							tmpLogger.closeWriter(() => {});
						});
					}
					catch (pCloseErr)
					{
						// Ignore close errors
					}
				}

				return;
			}

			let tmpTableName = pTables[tmpTableIndex];
			tmpTableIndex++;

			let tmpProgress = this._cloneState.SyncProgress[tmpTableName];
			if (!tmpProgress)
			{
				fSyncNextTable();
				return;
			}

			tmpProgress.Status = 'Syncing';
			tmpProgress.StartTime = new Date().toJSON();

			this.logSyncEvent('TableStart', `Sync [${tmpTableName}] — starting.`, { Table: tmpTableName });
			this.fable.log.info(`Data Cloner: Sync [${tmpTableName}] — starting via meadow-integration...`);

			this.fable.MeadowSync.syncEntity(tmpTableName,
				(pError) =>
				{
					let tmpSyncEntity = this.fable.MeadowSync.MeadowSyncEntities[tmpTableName];
					if (tmpSyncEntity && tmpSyncEntity.operation)
					{
						let tmpTracker = tmpSyncEntity.operation.progressTrackers[`FullSync-${tmpTableName}`];
						if (tmpTracker)
						{
							tmpProgress.Total = tmpTracker.TotalCount || 0;
							tmpProgress.Synced = Math.max(tmpTracker.CurrentCount || 0, 0);
						}
					}

					// Read per-record breakdown from the sync entity
					if (tmpSyncEntity && tmpSyncEntity.syncResults)
					{
						let tmpResults = tmpSyncEntity.syncResults;
						tmpProgress.New = tmpResults.Created || 0;
						tmpProgress.Updated = tmpResults.Updated || 0;
						tmpProgress.Unchanged = tmpResults.LocalRecordCount || 0;
						tmpProgress.Deleted = tmpResults.Deleted || 0;
						tmpProgress.ServerTotal = tmpResults.ServerRecordCount || 0;
						tmpProgress.LocalCountBefore = tmpResults.LocalRecordCount || 0;
					}

					let tmpRESTErrors = this._cloneState.SyncRESTErrors[tmpTableName] || 0;
					tmpProgress.Errors = tmpRESTErrors;

					let tmpMissing = tmpProgress.Total - tmpProgress.Synced;

					if (pError)
					{
						this.fable.log.error(`Data Cloner: Error syncing [${tmpTableName}]: ${pError}`);
						tmpProgress.Status = 'Error';
						tmpProgress.ErrorMessage = `${pError}`;
						this.logSyncEvent('TableError', `Sync [${tmpTableName}] — error: ${pError}`,
							{ Table: tmpTableName, Total: tmpProgress.Total, Synced: tmpProgress.Synced, Error: `${pError}` });
					}
					else if (tmpRESTErrors > 0)
					{
						tmpProgress.Status = 'Error';
						tmpProgress.ErrorMessage = `${tmpRESTErrors} REST error(s) during sync`;
						this.fable.log.warn(`Data Cloner: Sync [${tmpTableName}] — completed with ${tmpRESTErrors} REST error(s). ${tmpProgress.Synced}/${tmpProgress.Total} records synced.`);
						this.logSyncEvent('TableError', `Sync [${tmpTableName}] — ${tmpRESTErrors} REST error(s).`,
							{ Table: tmpTableName, Total: tmpProgress.Total, Synced: tmpProgress.Synced, RESTErrors: tmpRESTErrors });
					}
					else if (tmpProgress.Total > 0 && tmpMissing > 0)
					{
						tmpProgress.Status = 'Partial';
						tmpProgress.Skipped = tmpMissing;
						this.fable.log.warn(`Data Cloner: Sync [${tmpTableName}] — partial. ${tmpProgress.Synced}/${tmpProgress.Total} records synced, ${tmpMissing} skipped (GUID conflicts or other errors).`);
						this.logSyncEvent('TablePartial', `Sync [${tmpTableName}] — partial. ${tmpMissing} skipped.`,
							{ Table: tmpTableName, Total: tmpProgress.Total, Synced: tmpProgress.Synced, Skipped: tmpMissing });
					}
					else
					{
						tmpProgress.Status = 'Complete';
						this.fable.log.info(`Data Cloner: Sync [${tmpTableName}] — complete. ${tmpProgress.Synced}/${tmpProgress.Total} records synced.`);
						this.logSyncEvent('TableComplete', `Sync [${tmpTableName}] — complete. ${tmpProgress.Synced}/${tmpProgress.Total} records.`,
							{ Table: tmpTableName, Total: tmpProgress.Total, Synced: tmpProgress.Synced });
					}
					tmpProgress.EndTime = new Date().toJSON();

					fSyncNextTable();
				});
		};

		// Pre-count all tables in parallel, then begin sequential sync
		this.preCountTables(pTables,
			() =>
			{
				// Warm up the local database connection before starting sync.
				// After the pre-count phase (which only queries the remote server),
				// local DB pool connections may have gone stale. A test query
				// forces the pool to recycle dead connections before we sync.
				this.warmUpLocalConnection(() =>
				{
					fSyncNextTable();
				});
			});
	}

	// ================================================================
	// Route registration
	// ================================================================

	/**
	 * Register all data cloner API routes on the Orator service server.
	 *
	 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
	 */
	connectRoutes(pOratorServiceServer)
	{
		require('./DataCloner-Command-Connection.js')(this, pOratorServiceServer);
		require('./DataCloner-Command-Session.js')(this, pOratorServiceServer);
		require('./DataCloner-Command-Schema.js')(this, pOratorServiceServer);
		require('./DataCloner-Command-Sync.js')(this, pOratorServiceServer);

		this.fable.log.info('Retold Data Service DataCloner API routes registered.');
	}

	/**
	 * Register the web UI routes on the Orator service server.
	 *
	 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
	 */
	connectWebUIRoutes(pOratorServiceServer)
	{
		require('./DataCloner-Command-WebUI.js')(this, pOratorServiceServer);

		this.fable.log.info('Retold Data Service DataCloner Web UI routes registered.');
	}

	/**
	 * Run the full clone pipeline non-interactively from a config object.
	 *
	 * @param {object} pConfig - Parsed config object
	 * @param {object} pCLIOptions - CLI options { logPath, maxRecords, schemaPath }
	 * @param {function} fCallback - (pError)
	 */
	runHeadlessPipeline(pConfig, pCLIOptions, fCallback)
	{
		require('./DataCloner-Command-Headless.js')(this, pConfig, pCLIOptions, fCallback);
	}
}

module.exports = RetoldDataServiceDataCloner;
module.exports.serviceType = 'RetoldDataServiceDataCloner';
module.exports.default_configuration = defaultDataClonerOptions;
