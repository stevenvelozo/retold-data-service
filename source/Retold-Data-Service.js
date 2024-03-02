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

const libMeadow = require('meadow');
const libMeadowEndpoints = require('meadow-endpoints');

const defaultDataServiceSettings = (
	{
		FullMeadowSchemaPath: `${process.cwd()}/model/`,
		FullMeadowSchemaFilename: `Model-Extended.json`,

		DALMeadowSchemaPath: `${process.cwd()}/model/meadow/`,
		DALMeadowSchemaPrefix: `Model-MeadowSchema-`,
		DALMeadowSchemaPostfix: ``,

		AutoInitializeDataService: true,
		AutoStartOrator: true
	});

class RetoldDataService extends libFableServiceProviderBase
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

        this.serviceType = 'RetoldDataService';

		this.options = this.fable.Utility.extend(defaultDataServiceSettings, this.options);

		// Add the restify server provider and orator base class to fable
		this.fable.serviceManager.addServiceType('OratorServiceServer', libOratorServiceServerRestify);
		this.fable.serviceManager.addServiceType('Orator', libOrator);

		// Initialize Restify
		this.fable.serviceManager.instantiateServiceProvider('OratorServiceServer', this.options);

		// Initialize Orator, which will automatically use the default `OratorServiceServer` service we just instantiated
		this.fable.serviceManager.instantiateServiceProvider('Orator', this.options);

		// TODO: This code will be much cleaner with meadow and meadow-endpoints as services
		this._Meadow = libMeadow.new(_Fable);

		// Create DAL objects for each table in the schema
		// These will be unnecessary when meadow and meadow-endpoints are full fledged fable services
		this._DAL = {};
		this._MeadowEndpoints = {};

		// Decorate fable with the same -- this is a temporary hack until meadow and meadow-endpoints are full fledged fable services
		this.fable.DAL = this._DAL;
		this.fable.MeadowEndpoints = this._MeadowEndpoints;

		// Storage for the model and entities
		this.fullModel = false;
		this.entityList = false;

		this.serviceInitialized = false;
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
		// TODO: Change this to an option (e.g. we might want to do ALASQL)
		// Load the mysql connection for meadow if it doesn't exist yet
		this.fable.serviceManager.addAndInstantiateServiceType('MeadowMySQLProvider', require('meadow-connection-mysql'));
		return fCallback();
	}
	initializeDataEndpoints(fCallback)
	{
		this.fable.log.info("Retold Data Service initializing Endpoints...");

		// Create DAL objects for each table in the schema

		// 1. Load full compiled schema of the model from stricture
		_Fable.log.info(`...loading full model stricture schema...`);
		this.fullModel = require (`${this.options.FullMeadowSchemaPath}${this.options.FullMeadowSchemaFilename}`);
		_Fable.log.info(`...full model stricture schema loaded.`);

		// 2. Extract an array of each table in the schema
		_Fable.log.info(`...getting entity list...`);
		this.entityList = Object.keys(this.fullModel.Tables);

		// 3. Enumerate each entry in the compiled model and load a DAL for that table
		_Fable.log.info(`...initializing ${this.entityList.length} DAL objects and corresponding Meadow Endpoints...`);
		for (let i = 0; i < this.entityList.length; i++)
		{
			// 4. Create the DAL for each entry (e.g. it would be at _DAL.Movie for the Movie entity)
			let tmpDALEntityName = this.entityList[i];
			let tmpDALPackageFile = `${this.options.DALMeadowSchemaPath}${this.options.DALMeadowSchemaPrefix}${tmpDALEntityName}${this.options.DALMeadowSchemaPostfix}.json`
			_Fable.log.info(`Initializing the ${tmpDALEntityName} DAL from [${tmpDALPackageFile}]...`);
			this._DAL[tmpDALEntityName] = this._Meadow.loadFromPackage(tmpDALPackageFile);
			// 5. Tell this DAL object to use MySQL
			_Fable.log.info(`...defaulting the ${tmpDALEntityName} DAL to use MySQL`);
			this._DAL[tmpDALEntityName].setProvider('MySQL');
			// 6. Create a Meadow Endpoints class for this DAL
			_Fable.log.info(`...initializing the ${tmpDALEntityName} Meadow Endpoints to use MySQL`);
			this._MeadowEndpoints[tmpDALEntityName] = libMeadowEndpoints.new(this._DAL[tmpDALEntityName]);
			// 8. Expose the meadow endpoints on Orator
			_Fable.log.info(`...mapping the ${tmpDALEntityName} Meadow Endpoints to Orator`);
			this._MeadowEndpoints[tmpDALEntityName].connectRoutes(this.fable.Orator.webServer);
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

			this.fable.log.info(`The Retold Data Service is Auto Starting Orator`);

			tmpAnticipate.anticipate(this.onBeforeInitialize.bind(this));

			tmpAnticipate.anticipate(this.fable.Orator.startWebServer.bind(this.fable.Orator));
			tmpAnticipate.anticipate(this.initializePersistenceEngine.bind(this));

			tmpAnticipate.anticipate(this.onInitialize.bind(this));

			tmpAnticipate.anticipate(this.initializeDataEndpoints.bind(this));

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
}

module.exports = RetoldDataService;