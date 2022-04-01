// ##### Part of the **[retold](https://stevenvelozo.github.io/retold/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/
const libAsync = require('async');
const libOrator = require('orator');
const libMeadowEndpoints = require('meadow-endpoints');
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

		this._DAL = {};
		this._MeadowEndpoints = {};

		this.log = this._Fable.log;

		// Load the configurations
		if (this._Fable.settings.hasOwnProperty('Retold'))
		{
			if (this._Fable.settings.Retold.hasOwnProperty('MeadowModel'))
			{
				// One or many full Model file path(s) has been set
			}
			
			if (this._Fable.settings.Retold.hasOwnProperty('MeadowEntitySchema'))
			{
				// One or many Entity Schema file path(s) is set
			}
		}
		else
		{
			// Create a retold entry with defaults
			this._Fable.settings.Retold = (
			{
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

				"MeadowModel": false,
				"MeadowEntitySchema": false,
				"StrictureDDL": false
			})
		}
	}

	initialize()
	{
		libAsync.waterfall(
			[
				(fStageComplete) =>
				{
					fStageComplete();
				}
			],
			(pError)=>
			{

			});
	}

	mapBackplaneEndpoints()
	{
		const tmpBackplanePrefix = 'Backplane';
		// Pull version from the config file.
		const tmpEndpointVersion = _Fable.settings.MeadowEndpointVersion || '1.0';

		const tmpBackplaneEndpointPrefix = `/${tmpEndpointVersion}`;
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
			this._DAL[tmpDALEntityName] = _Meadow.loadFromPackageObject(pModelObject.Tables[tmpDALEntityName]);
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