/**
 * Retold Data Service - Model Manager
 *
 * Fable service that manages named model definitions and provides
 * REST endpoints for uploading models, inspecting schemas, and
 * connecting models to database connections.
 *
 * Routes are split into read (schema inspection, always available)
 * and write (model upload/delete/connect, configurable) groups.
 *
 * Delegates to RetoldDataServiceMeadowEndpoints for DAL/endpoint
 * creation and RetoldDataServiceConnectionManager for connection lookups.
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceProviderBase = require('fable-serviceproviderbase');

class RetoldDataServiceModelManager extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.serviceType = 'RetoldDataServiceModelManager';

		// Named model storage: { modelName: { Name, Model, ConnectionName, Initialized } }
		this.modelDefinitions = {};
	}

	/**
	 * Add a named model definition. This stores the model but does NOT
	 * create DAL objects or endpoints. Use connectModelToConnection()
	 * to activate a model's endpoints.
	 *
	 * @param {string} pName - Model name
	 * @param {Object} pModelObject - Parsed stricture model (MeadowModel-Extended.json format)
	 * @param {function} fCallback - Callback invoked as fCallback(pError)
	 */
	addModel(pName, pModelObject, fCallback)
	{
		if (!pName || typeof(pName) !== 'string')
		{
			return fCallback(new Error('Model name is required and must be a string.'));
		}
		if (!pModelObject || !pModelObject.Tables || typeof(pModelObject.Tables) !== 'object')
		{
			return fCallback(new Error('Model must include a Tables object.'));
		}

		if (this.modelDefinitions.hasOwnProperty(pName))
		{
			this.fable.log.warn(`Model [${pName}] already exists; overwriting.`);
		}

		this.modelDefinitions[pName] = (
			{
				Name: pName,
				Model: pModelObject,
				ConnectionName: false,
				Initialized: false
			});

		this.fable.log.info(`Model [${pName}] added with ${Object.keys(pModelObject.Tables).length} entities.`);
		return fCallback();
	}

	/**
	 * Remove a named model definition.
	 *
	 * @param {string} pName - Model name
	 * @param {function} fCallback - Callback invoked as fCallback(pError)
	 */
	removeModel(pName, fCallback)
	{
		if (!this.modelDefinitions.hasOwnProperty(pName))
		{
			return fCallback(new Error(`Model [${pName}] does not exist.`));
		}

		delete this.modelDefinitions[pName];
		this.fable.log.info(`Model [${pName}] removed.`);
		return fCallback();
	}

	/**
	 * Get a single model's metadata.
	 *
	 * @param {string} pName - Model name
	 * @return {Object|false} Model metadata or false if not found
	 */
	getModel(pName)
	{
		if (!this.modelDefinitions.hasOwnProperty(pName))
		{
			return false;
		}

		return this.modelDefinitions[pName];
	}

	/**
	 * Get summary metadata for all models.
	 *
	 * @return {Array} Array of model summaries
	 */
	getModels()
	{
		let tmpModelList = [];
		let tmpModelNames = Object.keys(this.modelDefinitions);

		for (let i = 0; i < tmpModelNames.length; i++)
		{
			let tmpModelDef = this.modelDefinitions[tmpModelNames[i]];
			tmpModelList.push(
				{
					Name: tmpModelDef.Name,
					EntityCount: Object.keys(tmpModelDef.Model.Tables).length,
					ConnectionName: tmpModelDef.ConnectionName,
					Initialized: tmpModelDef.Initialized
				});
		}

		return tmpModelList;
	}

	/**
	 * Connect a named model to a named connection, activating its
	 * DAL objects and CRUD endpoints.
	 *
	 * @param {string} pModelName - Model name (must exist in modelDefinitions)
	 * @param {string} pConnectionName - Connection name (must exist in ConnectionManager)
	 * @param {function} fCallback - Callback invoked as fCallback(pError)
	 */
	connectModelToConnection(pModelName, pConnectionName, fCallback)
	{
		if (!this.modelDefinitions.hasOwnProperty(pModelName))
		{
			return fCallback(new Error(`Model [${pModelName}] does not exist.`));
		}

		let tmpConnectionManager = this.fable.RetoldDataServiceConnectionManager;
		let tmpConnection = tmpConnectionManager.getConnection(pConnectionName);

		if (!tmpConnection)
		{
			return fCallback(new Error(`Connection [${pConnectionName}] does not exist.`));
		}
		if (!tmpConnection.Active)
		{
			return fCallback(new Error(`Connection [${pConnectionName}] is not active.`));
		}

		let tmpModelDef = this.modelDefinitions[pModelName];

		this.fable.log.info(`Connecting model [${pModelName}] to connection [${pConnectionName}] (provider: ${tmpConnection.Provider})...`);

		// Delegate to MeadowEndpoints to create DAL objects and wire routes
		this.fable.RetoldDataServiceMeadowEndpoints.loadModel(pModelName, tmpModelDef.Model, tmpConnection.Provider,
			(pError) =>
			{
				if (pError)
				{
					return fCallback(pError);
				}

				tmpModelDef.ConnectionName = pConnectionName;
				tmpModelDef.Initialized = true;
				this.fable.log.info(`Model [${pModelName}] connected to [${pConnectionName}] and endpoints activated.`);
				return fCallback();
			});
	}

	/**
	 * Register schema READ routes on the Orator service server.
	 * These routes are always available regardless of endpoint configuration.
	 *
	 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
	 */
	connectReadRoutes(pOratorServiceServer)
	{
		let tmpSelf = this;

		// GET /1.0/Retold/Models — list all models
		pOratorServiceServer.get('/1.0/Retold/Models',
			(pRequest, pResponse, fNext) =>
			{
				pResponse.send(200, tmpSelf.getModels());
				return fNext();
			});

		// GET /1.0/Retold/Model/:Name — get a single model's full definition
		pOratorServiceServer.get('/1.0/Retold/Model/:Name',
			(pRequest, pResponse, fNext) =>
			{
				let tmpModel = tmpSelf.getModel(pRequest.params.Name);
				if (!tmpModel)
				{
					pResponse.send(404, { Error: `Model [${pRequest.params.Name}] not found.` });
					return fNext();
				}
				pResponse.send(200, tmpModel);
				return fNext();
			});

		// GET /1.0/Retold/Model/:Name/Entities — list entities in a model
		pOratorServiceServer.get('/1.0/Retold/Model/:Name/Entities',
			(pRequest, pResponse, fNext) =>
			{
				let tmpModel = tmpSelf.getModel(pRequest.params.Name);
				if (!tmpModel)
				{
					pResponse.send(404, { Error: `Model [${pRequest.params.Name}] not found.` });
					return fNext();
				}
				let tmpEntities = Object.keys(tmpModel.Model.Tables);
				pResponse.send(200, { Name: pRequest.params.Name, Entities: tmpEntities });
				return fNext();
			});

		// GET /1.0/Retold/Model/:Name/Entity/:EntityName — entity detail
		pOratorServiceServer.get('/1.0/Retold/Model/:Name/Entity/:EntityName',
			(pRequest, pResponse, fNext) =>
			{
				let tmpModel = tmpSelf.getModel(pRequest.params.Name);
				if (!tmpModel)
				{
					pResponse.send(404, { Error: `Model [${pRequest.params.Name}] not found.` });
					return fNext();
				}

				let tmpEntityName = pRequest.params.EntityName;
				if (!tmpModel.Model.Tables.hasOwnProperty(tmpEntityName))
				{
					pResponse.send(404, { Error: `Entity [${tmpEntityName}] not found in model [${pRequest.params.Name}].` });
					return fNext();
				}

				let tmpEntity = tmpModel.Model.Tables[tmpEntityName];
				pResponse.send(200, tmpEntity);
				return fNext();
			});

		this.fable.log.info('Retold Data Service ModelManager read routes registered.');
	}

	/**
	 * Register model management WRITE routes on the Orator service server.
	 * These routes allow runtime model upload, deletion, and activation.
	 *
	 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
	 */
	connectWriteRoutes(pOratorServiceServer)
	{
		let tmpSelf = this;

		// POST /1.0/Retold/Model — upload a named model
		pOratorServiceServer.postWithBodyParser('/1.0/Retold/Model',
			(pRequest, pResponse, fNext) =>
			{
				let tmpBody = pRequest.body;
				if (!tmpBody || !tmpBody.Name || !tmpBody.Model)
				{
					pResponse.send(400, { Error: 'Request body must include Name and Model.' });
					return fNext();
				}

				tmpSelf.addModel(tmpBody.Name, tmpBody.Model,
					(pError) =>
					{
						if (pError)
						{
							pResponse.send(500, { Error: pError.message });
							return fNext();
						}

						let tmpModelDef = tmpSelf.modelDefinitions[tmpBody.Name];
						pResponse.send(200,
							{
								Name: tmpModelDef.Name,
								EntityCount: Object.keys(tmpModelDef.Model.Tables).length,
								ConnectionName: tmpModelDef.ConnectionName,
								Initialized: tmpModelDef.Initialized
							});
						return fNext();
					});
			});

		// DEL /1.0/Retold/Model/:Name — remove a model
		pOratorServiceServer.del('/1.0/Retold/Model/:Name',
			(pRequest, pResponse, fNext) =>
			{
				tmpSelf.removeModel(pRequest.params.Name,
					(pError) =>
					{
						if (pError)
						{
							pResponse.send(404, { Error: pError.message });
							return fNext();
						}
						pResponse.send(200, { Message: `Model [${pRequest.params.Name}] removed.` });
						return fNext();
					});
			});

		// POST /1.0/Retold/Model/:Name/Connect/:ConnectionName — connect model to connection
		pOratorServiceServer.postWithBodyParser('/1.0/Retold/Model/:Name/Connect/:ConnectionName',
			(pRequest, pResponse, fNext) =>
			{
				tmpSelf.connectModelToConnection(pRequest.params.Name, pRequest.params.ConnectionName,
					(pError) =>
					{
						if (pError)
						{
							pResponse.send(500, { Error: pError.message });
							return fNext();
						}
						let tmpModelDef = tmpSelf.modelDefinitions[pRequest.params.Name];
						pResponse.send(200,
							{
								Name: tmpModelDef.Name,
								EntityCount: Object.keys(tmpModelDef.Model.Tables).length,
								ConnectionName: tmpModelDef.ConnectionName,
								Initialized: tmpModelDef.Initialized
							});
						return fNext();
					});
			});

		this.fable.log.info('Retold Data Service ModelManager write routes registered.');
	}
}

module.exports = RetoldDataServiceModelManager;
module.exports.serviceType = 'RetoldDataServiceModelManager';
module.exports.default_configuration = {};
