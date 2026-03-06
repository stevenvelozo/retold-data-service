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
				SyncProgress: {},
				SyncDeletedRecords: false,
				SyncMode: 'Initial',

				// Per-table REST error counters
				SyncRESTErrors: {}
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

		// Set the provider configuration on fable settings
		this.fable.settings[tmpRegistryEntry.configKey] = pConfig;

		// Register and instantiate the provider if not already present
		if (!this.fable[tmpRegistryEntry.serviceName])
		{
			this.fable.serviceManager.addServiceType(tmpRegistryEntry.serviceName, tmpModule);
			this.fable.serviceManager.instantiateServiceProvider(tmpRegistryEntry.serviceName);
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

	/**
	 * The sync engine — synchronize data for a list of tables sequentially.
	 *
	 * @param {Array<string>} pTables - Table names to sync
	 */
	syncTables(pTables)
	{
		let tmpTableIndex = 0;

		let fSyncNextTable = () =>
		{
			if (this._cloneState.SyncStopping || tmpTableIndex >= pTables.length)
			{
				this._cloneState.SyncRunning = false;
				this._cloneState.SyncStopping = false;
				this.fable.log.info('Data Cloner: Sync complete.');
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

					let tmpRESTErrors = this._cloneState.SyncRESTErrors[tmpTableName] || 0;
					tmpProgress.Errors = tmpRESTErrors;

					let tmpMissing = tmpProgress.Total - tmpProgress.Synced;

					if (pError)
					{
						this.fable.log.error(`Data Cloner: Error syncing [${tmpTableName}]: ${pError}`);
						tmpProgress.Status = 'Error';
						tmpProgress.ErrorMessage = `${pError}`;
					}
					else if (tmpRESTErrors > 0)
					{
						tmpProgress.Status = 'Error';
						tmpProgress.ErrorMessage = `${tmpRESTErrors} REST error(s) during sync`;
						this.fable.log.warn(`Data Cloner: Sync [${tmpTableName}] — completed with ${tmpRESTErrors} REST error(s). ${tmpProgress.Synced}/${tmpProgress.Total} records synced.`);
					}
					else if (tmpProgress.Total > 0 && tmpMissing > 0)
					{
						tmpProgress.Status = 'Partial';
						tmpProgress.Skipped = tmpMissing;
						this.fable.log.warn(`Data Cloner: Sync [${tmpTableName}] — partial. ${tmpProgress.Synced}/${tmpProgress.Total} records synced, ${tmpMissing} skipped (GUID conflicts or other errors).`);
					}
					else
					{
						tmpProgress.Status = 'Complete';
						this.fable.log.info(`Data Cloner: Sync [${tmpTableName}] — complete. ${tmpProgress.Synced}/${tmpProgress.Total} records synced.`);
					}
					tmpProgress.EndTime = new Date().toJSON();

					fSyncNextTable();
				});
		};

		fSyncNextTable();
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
