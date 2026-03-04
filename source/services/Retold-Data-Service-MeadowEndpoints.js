/**
 * Retold Data Service - Meadow Endpoints Service
 *
 * Fable service responsible for loading compiled model schemas,
 * creating DAL objects and Meadow Endpoints for each entity,
 * and connecting their routes to Orator.
 *
 * Supports loading multiple named models. All entities across
 * all models are merged into flat _DAL and _MeadowEndpoints maps.
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libMeadow = require('meadow');
const libMeadowEndpoints = require('meadow-endpoints');

const defaultMeadowEndpointsSettings = (
	{
		StorageProvider: 'MySQL',

		FullMeadowSchemaPath: `${process.cwd()}/model/`,
		FullMeadowSchemaFilename: `MeadowModel-Extended.json`
	});

class RetoldDataServiceMeadowEndpoints extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, JSON.parse(JSON.stringify(defaultMeadowEndpointsSettings)), pOptions);
		super(pFable, tmpOptions, pServiceHash);

		this.serviceType = 'RetoldDataServiceMeadowEndpoints';

		this._Meadow = libMeadow.new(pFable);

		this._DAL = {};
		this._MeadowEndpoints = {};

		// Named model storage -- each key is a model name, value is the parsed model object
		this.models = {};

		// Merged view across all models (rebuilt on each loadModel call)
		this.fullModel = false;
		this.entityList = false;
	}

	/**
	 * Rebuild the merged fullModel and entityList from all loaded models.
	 *
	 * Called internally after each loadModel to keep the merged view current.
	 */
	rebuildFullModel()
	{
		let tmpModelNames = Object.keys(this.models);

		if (tmpModelNames.length === 0)
		{
			this.fullModel = false;
			this.entityList = false;
			return;
		}

		let tmpMergedModel = (
			{
				Tables: {},
				TablesSequence: [],
				Authorization: {},
				Endpoints: {},
				Pict: {}
			});

		for (let i = 0; i < tmpModelNames.length; i++)
		{
			let tmpModel = this.models[tmpModelNames[i]];

			if (tmpModel.Tables)
			{
				Object.assign(tmpMergedModel.Tables, tmpModel.Tables);
			}
			if (tmpModel.TablesSequence)
			{
				tmpMergedModel.TablesSequence = tmpMergedModel.TablesSequence.concat(tmpModel.TablesSequence);
			}
			if (tmpModel.Authorization)
			{
				Object.assign(tmpMergedModel.Authorization, tmpModel.Authorization);
			}
			if (tmpModel.Endpoints)
			{
				Object.assign(tmpMergedModel.Endpoints, tmpModel.Endpoints);
			}
			if (tmpModel.Pict)
			{
				Object.assign(tmpMergedModel.Pict, tmpModel.Pict);
			}
		}

		this.fullModel = tmpMergedModel;
		this.entityList = Object.keys(this._DAL);
	}

	/**
	 * Load a parsed model object and create DAL objects and Meadow Endpoints
	 * for each entity in it.
	 *
	 * @param {string} pModelName - A name to identify this model
	 * @param {Object} pModelObject - The parsed stricture model (MeadowModel-Extended.json format)
	 * @param {string} [pStorageProvider] - Optional storage provider name override (e.g. 'SQLite', 'MySQL')
	 * @param {function} fCallback - Callback invoked as fCallback(pError) on completion
	 */
	loadModel(pModelName, pModelObject, pStorageProvider, fCallback)
	{
		// Handle optional pStorageProvider parameter
		let tmpCallback = fCallback;
		let tmpStorageProvider = pStorageProvider;
		if (typeof(pStorageProvider) === 'function')
		{
			tmpCallback = pStorageProvider;
			tmpStorageProvider = this.options.StorageProvider;
		}

		this.fable.log.info(`Retold Data Service loading model [${pModelName}]...`);

		if (this.models.hasOwnProperty(pModelName))
		{
			this.fable.log.warn(`Model [${pModelName}] is already loaded; overwriting.`);
		}

		this.models[pModelName] = pModelObject;

		let tmpEntityList = Object.keys(pModelObject.Tables);

		this.fable.log.info(`...initializing ${tmpEntityList.length} DAL objects and corresponding Meadow Endpoints for model [${pModelName}]...`);

		for (let i = 0; i < tmpEntityList.length; i++)
		{
			let tmpDALEntityName = tmpEntityList[i];

			if (this._DAL.hasOwnProperty(tmpDALEntityName))
			{
				this.fable.log.warn(`Entity [${tmpDALEntityName}] already exists in the DAL (from another model); overwriting.`);
			}

			try
			{
				let tmpDALSchema = pModelObject.Tables[tmpDALEntityName];
				let tmpDALMeadowSchema = tmpDALSchema.MeadowSchema;

				this._DAL[tmpDALEntityName] = this._Meadow.loadFromPackageObject(tmpDALMeadowSchema);
				this.fable.log.info(`...defaulting the ${tmpDALEntityName} DAL to use ${tmpStorageProvider}`);
				this._DAL[tmpDALEntityName].setProvider(tmpStorageProvider);
				this.fable.log.info(`...initializing the ${tmpDALEntityName} Meadow Endpoints`);
				this._MeadowEndpoints[tmpDALEntityName] = libMeadowEndpoints.new(this._DAL[tmpDALEntityName]);
				this.fable.log.info(`...mapping the ${tmpDALEntityName} Meadow Endpoints to Orator`);
				this._MeadowEndpoints[tmpDALEntityName].connectRoutes(this.fable.OratorServiceServer);
			}
			catch (pError)
			{
				this.fable.log.error(`Error initializing DAL and Endpoints for entity [${tmpDALEntityName}]: ${pError}`);
			}
		}

		this.rebuildFullModel();

		return tmpCallback();
	}

	/**
	 * Load a model from a JSON file on disk.
	 *
	 * @param {string} pModelName - A name to identify this model
	 * @param {string} pModelPath - Directory path containing the model file
	 * @param {string} pModelFilename - The model JSON filename
	 * @param {function} fCallback - Callback invoked as fCallback(pError) on completion
	 */
	loadModelFromFile(pModelName, pModelPath, pModelFilename, fCallback)
	{
		this.fable.log.info(`...loading model [${pModelName}] from file [${pModelPath}${pModelFilename}]...`);

		let tmpModelObject;
		try
		{
			tmpModelObject = require(`${pModelPath}${pModelFilename}`);
		}
		catch (pError)
		{
			this.fable.log.error(`Error loading model file [${pModelPath}${pModelFilename}]: ${pError}`);
			return fCallback(pError);
		}

		return this.loadModel(pModelName, tmpModelObject, fCallback);
	}

	/**
	 * Initialize data endpoints by loading the default model from options.
	 *
	 * This is the standard initialization path used by initializeService
	 * in the main RetoldDataService. Loads a single model using the configured
	 * FullMeadowSchemaPath and FullMeadowSchemaFilename options.
	 *
	 * @param {function} fCallback - Callback invoked as fCallback(pError) on completion
	 */
	initializeDataEndpoints(fCallback)
	{
		this.fable.log.info("Retold Data Service initializing Endpoints...");

		// Derive a model name from the filename (e.g. "MeadowModel-Extended.json" -> "MeadowModel-Extended")
		let tmpModelName = this.options.FullMeadowSchemaFilename.replace(/\.json$/i, '');

		return this.loadModelFromFile(tmpModelName, this.options.FullMeadowSchemaPath, this.options.FullMeadowSchemaFilename, fCallback);
	}
}

module.exports = RetoldDataServiceMeadowEndpoints;
module.exports.serviceType = 'RetoldDataServiceMeadowEndpoints';
module.exports.default_configuration = defaultMeadowEndpointsSettings;
