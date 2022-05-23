// ##### Part of the **[retold](https://stevenvelozo.github.io/retold/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/
const libAsync = require('async');
const libOrator = require('orator');
const libMeadow = require('meadow');
const libMeadowEndpoints = require('meadow-endpoints');

const libProviderBase = require('./ProviderHelpers/Meadow-Provider-Helper-Base.js');

const libGraphSolver = require('./GraphGet.js');
const libCumulation = require('./Cumulation.js');
/**
* Retold Data Service
* 
* Load all schemas from a model, and serve up the endpoints.  Provide join autofills, graph 
* solver and other data niceties.
* 
* Configuration stanza expectation:
RetoldDataService: {
	SchemaFile: 'SchemaFileLocation',
	-- OR --
	Schema: [{ ... schemas in here ... }, { ... more schemas ... }],

	AutoLoad: true,

	MapExtraEndpoints: true,

	SchemaGraphEndpoint: 'SchemaGraph'
}


* The first four settings are very obvious what they do.  The last one is the endpoint that
* serves the entire schema graph.
* 
*
* @class RetoldDataService
*/
class RetoldDataService
{
	constructor(pConfiguration)
	{
		let tmpConfiguration = (typeof(pConfiguration) === 'object') ? pConfiguration : {};

		this._Orator = libOrator.new(tmpConfiguration);

		this._Fable = this._Orator.fable;
		this._Settings = this._Fable.settings;

		this._Meadow = libMeadow.new(this._Fable);
		this._MeadowModelGraph = {};

		this._DAL = {};
		this._MeadowEndpoints = {};

		this._Providers = {};

		this._GraphSolver = false;

		this.log = this._Fable.log;

		// Load the configurations
		if (this._Settings.hasOwnProperty('Retold'))
		{
			if (this._Settings.Retold.hasOwnProperty('MeadowModel'))
			{
				// One or many full Model file path(s) has been set
				this._Settings.Retold.MeadowModel = `${process.cwd()}/model/MeadowModel.json`;
			}
			
			if (this._Settings.Retold.hasOwnProperty('MeadowEntitySchemaPrefix'))
			{
				// One or many Entity Schema file path(s) is set
				this._Settings.Retold.MeadowEntitySchemaPrefix = `${process.cwd()}/model/meadow/MeadowSchema`;
			}
		}
		else
		{
			// Create a retold entry with defaults
			this._Settings.Retold = (
			{
				// This setting will automatically load the model
				"AutoLoadModel": true,
				// This setting will automatically connect the provider via the helper
				// (e.g. connect to MySQL)
				"AutoConnectProvider": true,
				// This setting will automatically connect the backplane endpoints
				"AutoMapBackplaneEndpoints": true,
				// This setting will automatically map the entity endpoints when entities are loaded
				"AutoMapEntityEndpoints": true,
				// This setting autostarts the orator server
				"AutoStartAPIServer": true,

				// These allow the deeper behaviors of the provider helpers (e.g. creating tables)
				"AllowDatabaseCreate": false,
				"AllowTableCreate": false,
				"AllowTableUpdate": false,

				// This will never work because the base provider just uses English.
				// Maybe switch to ALASQL by default for stateless services.
				"DefaultMeadowDataProvider": "Base",

				// Either the Meadow side or Stricture side should be set.
				// Try to use the opinionated Stricture locations if they arent (you really should set this though!)
				"MeadowModel": `${process.cwd()}/model/MeadowModel.json`,
				"MeadowEntitySchemaPrefix": `${process.cwd()}/model/meadow/MeadowSchema`,

				"StrictureDDL": false
			});
		}

		this.initialize();
	}

	initialize(fCallback)
	{
		let tmpCallback = (typeof(fCallback) == 'function') ? fCallback : ()=>{};
		libAsync.waterfall(
			[
				(fStageComplete) =>
				{
					if (this._Settings.Retold.AutoLoadModel)
					{
						this.loadModels();
					}

					return fStageComplete();
				},
				(fStageComplete) =>
				{
					if (this._Settings.Retold.AutoConnectProvider)
					{
						this.initializeDefaultProvider();					
					}
					return fStageComplete();
				},
				(fStageComplete) =>
				{
					if (this._Settings.Retold.AutoMapBackplaneEndpoints)
					{
						this.mapBackplaneEndpoints();
					}

					return fStageComplete();
				},
				(fStageComplete) =>
				{
					// Initialize the graph solver library
					this.initializeGraphEndpoints();
					// Map the graph endpoints to it
					// TODO: Decide if this follows the Meadow pattern or some other prefix pattern
					this._Orator.webServer.post(`/1.0/GraphRead/:Entity`,
						(pRequest, pResponse, fNext) =>
						{
							let tmpGraphRequestEntity = pRequest.params.Entity;
							let tmpGraphRequestFilter = pRequest.body;

							// TODO: Discuss how to pass in request settings -- what was in there worked for the web client and works for tokens so maybe it's okay?
							let tmpCumulation = new libCumulation(this._Fable, {});

							this._GraphSolver.get(tmpGraphRequestEntity, tmpGraphRequestFilter, tmpCumulation,
								(pError, pRecords, pValidFilters, pFinalFilters, pJoinedDataSets, pValidIdentities) =>
								{
									pResponse.send(
										{
											GraphRequestEntity: tmpGraphRequestEntity,
											GraphRequestFilter: tmpGraphRequestFilter,

											Records: pRecords,

											ValidFilters: pValidFilters,
											Finalfilters: pFinalFilters,

											JoinedDataSets: pJoinedDataSets,
											ValidIdentities: pValidIdentities,

											Error: pError
										});
									return fNext();		
								});
						});
		
					return fStageComplete();
				},
				(fStageComplete) =>
				{
					if (this._Settings.Retold.AutoStartAPIServer)
					{
						this.start(fStageComplete);
					}
					else
					{
						return fStageComplete();
					}
				}
			],
			(pError)=>
			{
				if (pError)
				{
					this._Fable.log.error('Error initializing Retold Data Service: '+pError.toString(), pError);
				}

				tmpCallback(pError);
			});
	}

	initializeDefaultProvider()
	{
		let libProvider = require(`./ProviderHelpers/Meadow-Provider-Helper-${this._Settings.Retold.DefaultMeadowDataProvider}.js`);
		
		// This is to support multiple providers
		this._Providers.Default = new libProvider(this._Fable);
		
		return this._Providers.Default.connect();
	}

	initializeGraphEndpoints()
	{
		this._GraphSolver = new libGraphSolver(this._Fable, this._MeadowModelGraph);
	}

	mapBackplaneEndpoints()
	{
		const tmpBackplanePrefix = 'BACKPLANE';
		// Pull version from the config file.
		const tmpEndpointVersion = this._Fable.settings.MeadowEndpointVersion || '1.0';

		const tmpBackplaneEndpointPrefix = `/${tmpBackplanePrefix}/${tmpEndpointVersion}`;

		// TODO: Break this out into separate classes
		this._Orator.webServer.get(`${tmpBackplaneEndpointPrefix}/Model`,
			(pRequest, pResponse, fNext) =>
			{
				pResponse.send(this._MeadowModelGraph);
				return fNext();
			});
	}

	// Lock the service to a specific session (this will bypass auth)
	lockServiceSession(pSessionData)
	{
		if (typeof(pSessionData) != 'object')
		{
			this.log.error(`Error locking service session -- invalid object passed in.`, pSessionData);
			return false;
		}

		_Fable.log.info(`...Creating Mock User Session and adding it to all requests on Restify/Orator`, pSessionData);
		var fMockAuthentication = (pRequest, pResponse, fNext) =>
		{
			pRequest.UserSession = pSessionData;
			fNext();
		};
		this._Orator.webServer.use(fMockAuthentication);
	}

	// Load models based on what's in the configuration
	loadModels()
	{
		if (this._Settings.Retold.MeadowModel)
		{
			this.loadMeadowModelFile(this._Settings.Retold.MeadowModel);
		}
	}

	loadMeadowModelFile(pModelFilePath)
	{
		// TODO: Wrap this in a try/catch/finally
		this._MeadowModelGraph = require(pModelFilePath);
		this.loadMeadowModel(this._MeadowModelGraph);
	}

	loadMeadowModel(pModelObject)
	{
		// Create DAL objects for each table in the schema
		// 1. Validate the model object
		if (typeof(pModelObject) !== 'object')
		{
			this.log.error(`Could not load Meadow model object: Invalid object passed.`, pModelObject);
			return false;
		}
		if (!pModelObject.hasOwnProperty('Tables')
			|| typeof(pModelObject.Tables) != 'object')
		{
			this.log.error(`Could not load Meadow model object: Object does not contain a Tables property.`, pModelObject);
			return false;
		}
		// 2. Extract an array of each table in the schema
		let tmpModelTableList = Object.keys(pModelObject.Tables);
		let tmpDefaultProvider = (this._Fable.settings.Retold.DefaultMeadowDataProvider) ? this._Fable.settings.Retold.DefaultMeadowDataProvider : 'Base';
		// 3. Enumerate each entry in the compiled model and load a DAL for that table
		this.log.info(`...Creating ${tmpModelTableList.length} DAL entries...`);
		for (let i = 0; i < tmpModelTableList.length; i++)
		{
			let tmpDALEntityName = tmpModelTableList[i];
			this.log.info(`   -> Creating the [${tmpDALEntityName}] DAL...`);
			// 4. Create the DAL for each entry (e.g. it would be at _DAL.Book or _DAL.Author)
			// TODO: I don't like this ... stricture should just generate a huge file of these in an array, which could be loaded with the new injector
			this._DAL[tmpDALEntityName] = this._Meadow.loadFromPackage(`${this._Settings.Retold.MeadowEntitySchemaPrefix}${tmpDALEntityName}.json`);
			// 5. Tell this DAL object to use the default provider
			this._DAL[tmpDALEntityName].setProvider(tmpDefaultProvider);
			// 6. Create a Meadow Endpoints class for this DAL
			this._MeadowEndpoints[tmpDALEntityName] = libMeadowEndpoints.new(this._DAL[tmpDALEntityName]);
			// 7. Expose the meadow endpoints on Orator
			if (this._Fable.settings.Retold.AutoMapEntityEndpoints)
			{
				this._MeadowEndpoints[tmpDALEntityName].connectRoutes(this._Orator.webServer);
				this._MeadowEndpoints[tmpDALEntityName].RoutesConnected = true;
			}
		}
	}

	start(fCallback)
	{
		this._Orator.startWebServer(fCallback);
	}

	get orator()
	{
		return this._Orator;
	}

	get fable()
	{
		return this._Fable;
	}

	get settings()
	{
		return this._Fable.settings;
	}
}

module.exports = RetoldDataService;