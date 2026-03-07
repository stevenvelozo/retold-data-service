/**
 * Retold Data Service
 *
 * All-in-one add-ins for fable to provide endpoints.
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libOrator = require('orator');
const libOratorServiceServerRestify = require('orator-serviceserver-restify');

const libRetoldDataServiceMeadowEndpoints = require('./services/Retold-Data-Service-MeadowEndpoints.js');
const libRetoldDataServiceConnectionManager = require('./services/Retold-Data-Service-ConnectionManager.js');
const libRetoldDataServiceModelManager = require('./services/Retold-Data-Service-ModelManager.js');
const libRetoldDataServiceStricture = require('./services/stricture/Retold-Data-Service-Stricture.js');
const libRetoldDataServiceMeadowIntegration = require('./services/meadow-integration/Retold-Data-Service-MeadowIntegration.js');
const libRetoldDataServiceMigrationManager = require('./services/migration-manager/Retold-Data-Service-MigrationManager.js');
const libRetoldDataServiceDataCloner = require('./services/data-cloner/Retold-Data-Service-DataCloner.js');
const libRetoldDataServiceIntegrationTelemetry = require('./services/integration-telemetry/Retold-Data-Service-IntegrationTelemetry.js');

const defaultDataServiceSettings = (
	{
		StorageProvider: false,
		StorageProviderModule: false,

		FullMeadowSchemaPath: `${process.cwd()}/model/`,
		FullMeadowSchemaFilename: false,

		AutoInitializeDataService: true,
		AutoStartOrator: true,

		// Endpoint allow-list.  Only enabled groups have their routes wired.
		// Schema read routes (GET /1.0/Retold/Models, Model/:Name, etc.) are always available.
		Endpoints:
			{
				// Runtime connection management (POST/DEL /1.0/Retold/Connection*)
				ConnectionManager: false,
				// Runtime model upload/delete/connect (POST/DEL /1.0/Retold/Model*)
				ModelManagerWrite: false,
				// DDL compilation and code generation (/1.0/Retold/Stricture/*)
				Stricture: false,
				// CSV/TSV/JSON data transformation (/1.0/Retold/MeadowIntegration/*)
				MeadowIntegration: false,
				// Per-entity CRUD endpoints (e.g. /1.0/Book, /1.0/Authors)
				MeadowEndpoints: true,
				// Migration manager API endpoints (/api/*)
				MigrationManager: false,
				// Migration manager web UI (GET /, /lib/*)
				MigrationManagerWebUI: false,
				// Data cloner API endpoints (/clone/*)
				DataCloner: false,
				// Data cloner web UI (GET /clone/)
				DataClonerWebUI: false,
				// Integration telemetry API endpoints (/telemetry/*)
				IntegrationTelemetry: false
			},

		// Migration manager configuration
		MigrationManager:
			{
				// Directory containing .mddl/.ddl files to auto-import at startup
				ModelPath: false,
				// Route prefix for all migration manager endpoints (API + web UI)
				RoutePrefix: '/meadow-migrationmanager'
			},

		// Data cloner configuration
		DataCloner:
			{
				// Route prefix for all data cloner endpoints (API + web UI)
				RoutePrefix: '/clone'
			},

		// Integration telemetry configuration
		IntegrationTelemetry:
			{
				// Route prefix for all telemetry endpoints
				RoutePrefix: '/telemetry',
				// Default tenant identifier when none is provided
				DefaultTenantID: 'default'
			}
	});

class RetoldDataService extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		// Intersect default options, parent constructor, service information
		let tmpOptions = Object.assign({}, JSON.parse(JSON.stringify(defaultDataServiceSettings)), pOptions);
		super(pFable, tmpOptions, pServiceHash);

        this.serviceType = 'RetoldDataService';

		// Re-apply defaults without mutating the module-level defaultDataServiceSettings object.
		this.options = Object.assign({}, JSON.parse(JSON.stringify(defaultDataServiceSettings)), this.options);

		// Add the restify server provider and orator base class to fable
		this.fable.serviceManager.addServiceType('OratorServiceServer', libOratorServiceServerRestify);
		this.fable.serviceManager.addServiceType('Orator', libOrator);

		// Initialize Restify
		this.fable.serviceManager.instantiateServiceProvider('OratorServiceServer', this.options);

		// Initialize Orator, which will automatically use the default `OratorServiceServer` service we just instantiated
		this.fable.serviceManager.instantiateServiceProvider('Orator', this.options);

		// Register and instantiate the MeadowEndpoints service
		this.fable.serviceManager.addServiceType('RetoldDataServiceMeadowEndpoints', libRetoldDataServiceMeadowEndpoints);
		this.fable.serviceManager.instantiateServiceProvider('RetoldDataServiceMeadowEndpoints',
			{
				StorageProvider: this.options.StorageProvider,
				FullMeadowSchemaPath: this.options.FullMeadowSchemaPath,
				FullMeadowSchemaFilename: this.options.FullMeadowSchemaFilename
			});

		// Register and instantiate the ConnectionManager service
		this.fable.serviceManager.addServiceType('RetoldDataServiceConnectionManager', libRetoldDataServiceConnectionManager);
		this.fable.serviceManager.instantiateServiceProvider('RetoldDataServiceConnectionManager');

		// Register and instantiate the ModelManager service
		this.fable.serviceManager.addServiceType('RetoldDataServiceModelManager', libRetoldDataServiceModelManager);
		this.fable.serviceManager.instantiateServiceProvider('RetoldDataServiceModelManager');

		// Register and instantiate the Stricture service
		this.fable.serviceManager.addServiceType('RetoldDataServiceStricture', libRetoldDataServiceStricture);
		this.fable.serviceManager.instantiateServiceProvider('RetoldDataServiceStricture');

		// Register and instantiate the MeadowIntegration service
		this.fable.serviceManager.addServiceType('RetoldDataServiceMeadowIntegration', libRetoldDataServiceMeadowIntegration);
		this.fable.serviceManager.instantiateServiceProvider('RetoldDataServiceMeadowIntegration');

		// Register and instantiate the MigrationManager service
		this.fable.serviceManager.addServiceType('RetoldDataServiceMigrationManager', libRetoldDataServiceMigrationManager);
		this.fable.serviceManager.instantiateServiceProvider('RetoldDataServiceMigrationManager');

		// Register and instantiate the DataCloner service
		this.fable.serviceManager.addServiceType('RetoldDataServiceDataCloner', libRetoldDataServiceDataCloner);
		this.fable.serviceManager.instantiateServiceProvider('RetoldDataServiceDataCloner');

		// Register and instantiate the IntegrationTelemetry service
		this.fable.serviceManager.addServiceType('RetoldDataServiceIntegrationTelemetry', libRetoldDataServiceIntegrationTelemetry);
		this.fable.serviceManager.instantiateServiceProvider('RetoldDataServiceIntegrationTelemetry');

		// Expose the DAL and MeadowEndpoints from the service on this object and on fable for backward compatibility
		this._DAL = this.fable.RetoldDataServiceMeadowEndpoints._DAL;
		this._MeadowEndpoints = this.fable.RetoldDataServiceMeadowEndpoints._MeadowEndpoints;
		this.fable.DAL = this._DAL;
		this.fable.MeadowEndpoints = this._MeadowEndpoints;

		this.serviceInitialized = false;
	}

	// Proxy accessors for model data that lives on the MeadowEndpoints service
	get fullModel()
	{
		return this.fable.RetoldDataServiceMeadowEndpoints.fullModel;
	}

	get entityList()
	{
		return this.fable.RetoldDataServiceMeadowEndpoints.entityList;
	}

	get models()
	{
		return this.fable.RetoldDataServiceMeadowEndpoints.models;
	}

	loadModel(pModelName, pModelObject, pStorageProvider, fCallback)
	{
		return this.fable.RetoldDataServiceMeadowEndpoints.loadModel(pModelName, pModelObject, pStorageProvider, fCallback);
	}

	loadModelFromFile(pModelName, pModelPath, pModelFilename, fCallback)
	{
		return this.fable.RetoldDataServiceMeadowEndpoints.loadModelFromFile(pModelName, pModelPath, pModelFilename, fCallback);
	}

	/**
	 * Check if an endpoint group is enabled in the Endpoints configuration.
	 *
	 * @param {string} pGroupName - The endpoint group name (e.g. 'ConnectionManager', 'Stricture')
	 * @return {boolean} True if the group is enabled
	 */
	isEndpointGroupEnabled(pGroupName)
	{
		if (!this.options.Endpoints)
		{
			return false;
		}
		if (!this.options.Endpoints.hasOwnProperty(pGroupName))
		{
			return false;
		}
		return !!this.options.Endpoints[pGroupName];
	}

	onBeforeInitialize(fCallback)
	{
		return fCallback();
	}

	onInitialize(fCallback)
	{
		return fCallback();
	}

	onAfterInitialize(fCallback)
	{
		return fCallback();
	}

	initializePersistenceEngine(fCallback)
	{
		// Only instantiate a default provider if StorageProviderModule is configured.
		// When launching with no model, ConnectionManager handles provider instantiation.
		if (this.options.StorageProviderModule)
		{
			this.fable.serviceManager.addAndInstantiateServiceType(`Meadow${this.options.StorageProvider}Provider`, require(this.options.StorageProviderModule));
		}
		return fCallback();
	}

	initializeService(fCallback)
	{
		if (this.serviceInitialized)
		{
			return fCallback(new Error("Retold Data Service Application is being initialized but has already been initialized..."));
		}
		else
		{
			let tmpAnticipate = this.fable.newAnticipate();

			this.fable.log.info(`The Retold Data Service is initializing...`);

			// Log endpoint configuration
			let tmpGroupNames = ['ConnectionManager', 'ModelManagerWrite', 'Stricture', 'MeadowIntegration', 'MeadowEndpoints', 'MigrationManager', 'MigrationManagerWebUI', 'DataCloner', 'DataClonerWebUI', 'IntegrationTelemetry'];
			let tmpEnabledGroups = [];
			let tmpDisabledGroups = [];
			for (let i = 0; i < tmpGroupNames.length; i++)
			{
				if (this.isEndpointGroupEnabled(tmpGroupNames[i]))
				{
					tmpEnabledGroups.push(tmpGroupNames[i]);
				}
				else
				{
					tmpDisabledGroups.push(tmpGroupNames[i]);
				}
			}
			this.fable.log.info(`Endpoint groups enabled: [${tmpEnabledGroups.join(', ')}]`);
			if (tmpDisabledGroups.length > 0)
			{
				this.fable.log.info(`Endpoint groups disabled: [${tmpDisabledGroups.join(', ')}]`);
			}
			this.fable.log.info(`Schema read endpoints are always enabled.`);

			tmpAnticipate.anticipate(this.onBeforeInitialize.bind(this));

			tmpAnticipate.anticipate(
				(fInitCallback) =>
				{
					if (this.options.AutoStartOrator)
					{
						this.fable.Orator.startWebServer(fInitCallback);
					}
					else
					{
						return fInitCallback();
					}
				});

			tmpAnticipate.anticipate(this.initializePersistenceEngine.bind(this));

			tmpAnticipate.anticipate(this.onInitialize.bind(this));

			// Wire endpoint routes based on the Endpoints allow-list configuration
			tmpAnticipate.anticipate(
				(fInitCallback) =>
				{
					// ConnectionManager routes (runtime connection hotloading)
					if (this.isEndpointGroupEnabled('ConnectionManager'))
					{
						this.fable.RetoldDataServiceConnectionManager.connectRoutes(this.fable.OratorServiceServer);
					}

					// ModelManager schema READ routes are ALWAYS available
					this.fable.RetoldDataServiceModelManager.connectReadRoutes(this.fable.OratorServiceServer);

					// ModelManager WRITE routes (model upload, delete, connect)
					if (this.isEndpointGroupEnabled('ModelManagerWrite'))
					{
						this.fable.RetoldDataServiceModelManager.connectWriteRoutes(this.fable.OratorServiceServer);
					}

					// Stricture routes (DDL compilation and code generation)
					if (this.isEndpointGroupEnabled('Stricture'))
					{
						this.fable.RetoldDataServiceStricture.connectRoutes(this.fable.OratorServiceServer);
					}

					// MeadowIntegration routes (CSV/TSV/JSON data transformation)
					if (this.isEndpointGroupEnabled('MeadowIntegration'))
					{
						this.fable.RetoldDataServiceMeadowIntegration.connectRoutes(this.fable.OratorServiceServer);
					}

					// MigrationManager API routes (/api/*)
					if (this.isEndpointGroupEnabled('MigrationManager'))
					{
						this.fable.RetoldDataServiceMigrationManager.connectRoutes(this.fable.OratorServiceServer);
					}

					// MigrationManager Web UI routes (GET /, /lib/*)
					if (this.isEndpointGroupEnabled('MigrationManagerWebUI'))
					{
						this.fable.RetoldDataServiceMigrationManager.connectWebUIRoutes(this.fable.OratorServiceServer);
					}

					// DataCloner API routes (/clone/*)
					if (this.isEndpointGroupEnabled('DataCloner'))
					{
						this.fable.RetoldDataServiceDataCloner.connectRoutes(this.fable.OratorServiceServer);
					}

					// DataCloner Web UI routes (GET /clone/)
					if (this.isEndpointGroupEnabled('DataClonerWebUI'))
					{
						this.fable.RetoldDataServiceDataCloner.connectWebUIRoutes(this.fable.OratorServiceServer);
					}

					// IntegrationTelemetry API routes (/telemetry/*)
					if (this.isEndpointGroupEnabled('IntegrationTelemetry'))
					{
						this.fable.RetoldDataServiceIntegrationTelemetry.connectRoutes(this.fable.OratorServiceServer);
					}

					return fInitCallback();
				});

			// Initialize MigrationManager (scan ModelPath, import DDL files, auto-compile)
			// if either MigrationManager or MigrationManagerWebUI is enabled
			tmpAnticipate.anticipate(
				(fInitCallback) =>
				{
					if (!this.isEndpointGroupEnabled('MigrationManager') && !this.isEndpointGroupEnabled('MigrationManagerWebUI'))
					{
						return fInitCallback();
					}

					this.fable.RetoldDataServiceMigrationManager.initializeMigrationManager(fInitCallback);
				});

			// Only load the default model if MeadowEndpoints are enabled and a schema file is configured
			tmpAnticipate.anticipate(
				(fInitCallback) =>
				{
					if (!this.isEndpointGroupEnabled('MeadowEndpoints'))
					{
						this.fable.log.info('MeadowEndpoints are disabled in configuration; skipping data endpoint initialization.');
						return fInitCallback();
					}

					if (this.options.FullMeadowSchemaFilename)
					{
						this.fable.RetoldDataServiceMeadowEndpoints.initializeDataEndpoints(fInitCallback);
					}
					else
					{
						this.fable.log.info('No default model configured; skipping data endpoint initialization. Use the Model and Connection management endpoints to add models at runtime.');
						return fInitCallback();
					}
				});

			tmpAnticipate.anticipate(this.onAfterInitialize.bind(this));

			tmpAnticipate.wait(
				(pError)=>
				{
					if (pError)
					{
						this.log.error(`Error initializing Retold Data Service: ${pError}`);
						return fCallback(pError);
					}
					this.serviceInitialized = true;
					return fCallback();
				});
		}
	}

	stopService(fCallback)
	{
		if (!this.serviceInitialized)
		{
			return fCallback(new Error("Retold Data Service Application is being stopped but is not initialized..."));
		}
		else
		{
			this.fable.log.info(`The Retold Data Service is stopping Orator`);

			let tmpAnticipate = this.fable.newAnticipate();

			tmpAnticipate.anticipate(this.fable.Orator.stopWebServer.bind(this.fable.Orator));

			tmpAnticipate.wait(
				(pError)=>
				{
					if (pError)
					{
						this.log.error(`Error stopping Retold Data Service: ${pError}`);
						return fCallback(pError);
					}
					this.serviceInitialized = false;
					return fCallback();
				});
		}
	}
}

module.exports = RetoldDataService;
