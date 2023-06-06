/**
 * Retold Data Service
 *
 * All-in-one add-ins for fable to provide endpoints.
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libOrator = require('orator');
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

		// TODO: Check if Fable already has an Orator service provider, otherwise add one.
		// TODO: First switch the new Orator to the new service provider pattern
		// TODO: Make the restify/http stuff optional, so IPC works.
		// Orator is the (usually web) server
		this.fable.Orator = new libOrator(this.fable, require('orator-serviceserver-restify'));

		// Because this requires the callback, we will have to add better plumbing for these services to initialie
		this.fable.Orator.initializeServiceServer(() =>
		{
			// TODO: This code will be much cleaner with these as services
			this._Meadow = libMeadow.new(_Fable);

			// Create DAL objects for each table in the schema
			// These will be unnecessary when meadow and meadow-endpoints are full fledged fable services
			this._DAL = {};
			this.fable.DAL = this._DAL;
			this._MeadowEndpoints = {};
			this.fable.MeadowEndpoints = this._MeadowEndpoints;

			// TODO: Change this to an option (e.g. we might want to do ALASQL)
			// Load the mysql connection for meadow if it doesn't exist yet
			_Fable.serviceManager.addAndInstantiateServiceType('MeadowMySQLProvider', require('meadow-connection-mysql'));

			this.fullModel = false;
			this.entityList = false;

			this.serviceInitialized = false;

			if (this.options.AutoInitializeDataService)
			{
				this.fable.log.info(`The Retold Data Service is Auto Initializing itself`);
				this.initializeService();
			}

			if (this.options.AutoStartOrator)
			{
				this.fable.log.info(`The Retold Data Service is Auto Starting Orator`);
				this.fable.Orator.startWebServer(
					(pError) =>
					{
						if (pError)
						{
							console.log(`Error auto-starting Orator: ${pError}`, pError);
						}
					});
			}
		});
	}

	initializeService()
	{
		if (this.serviceInitialized)
		{
			this.fable.log.error("Retold Data Service Application is being initialized but has already been initialized...");
		}
		else
		{
			this.fable.log.info("Retold Data Service Application is starting up...");

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

			this.serviceInitialized = true;
		}
	}
}

module.exports = RetoldDataService;