/**
 * Retold Data Service - Connection Manager
 *
 * Fable service that manages named database connections.
 * Each connection has a name, provider type, provider module,
 * configuration, and active status.
 *
 * Provides REST endpoints under /1.0/Retold/Connection(s) for
 * managing connections at runtime.
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceProviderBase = require('fable-serviceproviderbase');

class RetoldDataServiceConnectionManager extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.serviceType = 'RetoldDataServiceConnectionManager';

		// Named connection storage: { connectionName: { Name, Provider, ProviderModule, Config, Active } }
		this.connections = {};
	}

	/**
	 * Add a named connection. Stores the definition and instantiates the
	 * provider service in fable.
	 *
	 * @param {string} pName - Connection name
	 * @param {Object} pConnectionDefinition - Connection config object
	 * @param {string} pConnectionDefinition.Provider - Provider name (e.g. 'SQLite', 'MySQL')
	 * @param {string} pConnectionDefinition.ProviderModule - npm module name (e.g. 'meadow-connection-sqlite')
	 * @param {Object} pConnectionDefinition.Config - Provider-specific configuration
	 * @param {function} fCallback - Callback invoked as fCallback(pError)
	 */
	addConnection(pName, pConnectionDefinition, fCallback)
	{
		if (!pName || typeof(pName) !== 'string')
		{
			return fCallback(new Error('Connection name is required and must be a string.'));
		}
		if (!pConnectionDefinition || !pConnectionDefinition.Provider || !pConnectionDefinition.ProviderModule)
		{
			return fCallback(new Error('Connection definition must include Provider and ProviderModule.'));
		}

		if (this.connections.hasOwnProperty(pName))
		{
			this.fable.log.warn(`Connection [${pName}] already exists; overwriting.`);
		}

		let tmpConnection = (
			{
				Name: pName,
				Provider: pConnectionDefinition.Provider,
				ProviderModule: pConnectionDefinition.ProviderModule,
				Config: pConnectionDefinition.Config || {},
				Active: false
			});

		this.connections[pName] = tmpConnection;

		// Merge config into fable settings under the provider key
		// (e.g. fable.settings.SQLite = { SQLiteFilePath: ':memory:' })
		if (tmpConnection.Config && Object.keys(tmpConnection.Config).length > 0)
		{
			this.fable.settings[tmpConnection.Provider] = this.fable.Utility.extend(
				this.fable.settings[tmpConnection.Provider] || {},
				tmpConnection.Config);
		}

		// Instantiate the provider service
		let tmpServiceTypeName = `Meadow${tmpConnection.Provider}Provider`;
		try
		{
			this.fable.serviceManager.addAndInstantiateServiceType(tmpServiceTypeName, require(tmpConnection.ProviderModule));
			tmpConnection.Active = true;
			this.fable.log.info(`Connection [${pName}] added and provider [${tmpServiceTypeName}] instantiated.`);
		}
		catch (pError)
		{
			this.fable.log.error(`Error instantiating provider for connection [${pName}]: ${pError}`);
			return fCallback(pError);
		}

		return fCallback();
	}

	/**
	 * Remove a named connection.
	 *
	 * @param {string} pName - Connection name
	 * @param {function} fCallback - Callback invoked as fCallback(pError)
	 */
	removeConnection(pName, fCallback)
	{
		if (!this.connections.hasOwnProperty(pName))
		{
			return fCallback(new Error(`Connection [${pName}] does not exist.`));
		}

		delete this.connections[pName];
		this.fable.log.info(`Connection [${pName}] removed.`);
		return fCallback();
	}

	/**
	 * Test a named connection by verifying the provider service exists and is reachable.
	 *
	 * @param {string} pName - Connection name
	 * @param {function} fCallback - Callback invoked as fCallback(pError, pResult)
	 */
	testConnection(pName, fCallback)
	{
		if (!this.connections.hasOwnProperty(pName))
		{
			return fCallback(new Error(`Connection [${pName}] does not exist.`));
		}

		let tmpConnection = this.connections[pName];
		let tmpServiceTypeName = `Meadow${tmpConnection.Provider}Provider`;

		// Check that the provider service is available in fable
		let tmpProviderService = this.fable[tmpServiceTypeName];
		if (!tmpProviderService)
		{
			return fCallback(null, { Connection: pName, Status: 'Error', Message: `Provider service [${tmpServiceTypeName}] not found in fable.` });
		}

		// If the provider has a connected property, check it
		if (typeof(tmpProviderService.connected) !== 'undefined')
		{
			return fCallback(null, { Connection: pName, Status: tmpProviderService.connected ? 'Connected' : 'Disconnected', Provider: tmpConnection.Provider });
		}

		// Provider exists but no connected flag
		return fCallback(null, { Connection: pName, Status: 'Available', Provider: tmpConnection.Provider });
	}

	/**
	 * Get a single connection's metadata (without sensitive config details).
	 *
	 * @param {string} pName - Connection name
	 * @return {Object|false} Connection metadata or false if not found
	 */
	getConnection(pName)
	{
		if (!this.connections.hasOwnProperty(pName))
		{
			return false;
		}

		let tmpConnection = this.connections[pName];
		return (
			{
				Name: tmpConnection.Name,
				Provider: tmpConnection.Provider,
				Active: tmpConnection.Active
			});
	}

	/**
	 * Get summary metadata for all connections.
	 *
	 * @return {Array} Array of connection summaries
	 */
	getConnections()
	{
		let tmpConnectionList = [];
		let tmpConnectionNames = Object.keys(this.connections);

		for (let i = 0; i < tmpConnectionNames.length; i++)
		{
			tmpConnectionList.push(this.getConnection(tmpConnectionNames[i]));
		}

		return tmpConnectionList;
	}

	/**
	 * Register REST routes for connection management on the Orator service server.
	 *
	 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
	 */
	connectRoutes(pOratorServiceServer)
	{
		let tmpSelf = this;

		// GET /1.0/Retold/Connections — list all connections
		pOratorServiceServer.get('/1.0/Retold/Connections',
			(pRequest, pResponse, fNext) =>
			{
				pResponse.send(200, tmpSelf.getConnections());
				return fNext();
			});

		// GET /1.0/Retold/Connection/:Name — get a single connection
		pOratorServiceServer.get('/1.0/Retold/Connection/:Name',
			(pRequest, pResponse, fNext) =>
			{
				let tmpConnection = tmpSelf.getConnection(pRequest.params.Name);
				if (!tmpConnection)
				{
					pResponse.send(404, { Error: `Connection [${pRequest.params.Name}] not found.` });
					return fNext();
				}
				pResponse.send(200, tmpConnection);
				return fNext();
			});

		// POST /1.0/Retold/Connection — add a connection
		pOratorServiceServer.postWithBodyParser('/1.0/Retold/Connection',
			(pRequest, pResponse, fNext) =>
			{
				let tmpBody = pRequest.body;
				if (!tmpBody || !tmpBody.Name)
				{
					pResponse.send(400, { Error: 'Request body must include Name, Provider, and ProviderModule.' });
					return fNext();
				}

				tmpSelf.addConnection(tmpBody.Name, tmpBody,
					(pError) =>
					{
						if (pError)
						{
							pResponse.send(500, { Error: pError.message });
							return fNext();
						}
						pResponse.send(200, tmpSelf.getConnection(tmpBody.Name));
						return fNext();
					});
			});

		// DEL /1.0/Retold/Connection/:Name — remove a connection
		pOratorServiceServer.del('/1.0/Retold/Connection/:Name',
			(pRequest, pResponse, fNext) =>
			{
				tmpSelf.removeConnection(pRequest.params.Name,
					(pError) =>
					{
						if (pError)
						{
							pResponse.send(404, { Error: pError.message });
							return fNext();
						}
						pResponse.send(200, { Message: `Connection [${pRequest.params.Name}] removed.` });
						return fNext();
					});
			});

		// GET /1.0/Retold/Connection/:Name/Test — test a connection
		pOratorServiceServer.get('/1.0/Retold/Connection/:Name/Test',
			(pRequest, pResponse, fNext) =>
			{
				tmpSelf.testConnection(pRequest.params.Name,
					(pError, pResult) =>
					{
						if (pError)
						{
							pResponse.send(404, { Error: pError.message });
							return fNext();
						}
						pResponse.send(200, pResult);
						return fNext();
					});
			});

		this.fable.log.info('Retold Data Service ConnectionManager routes registered.');
	}
}

module.exports = RetoldDataServiceConnectionManager;
module.exports.serviceType = 'RetoldDataServiceConnectionManager';
module.exports.default_configuration = {};
