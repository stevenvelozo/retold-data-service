/**
 * DataCloner Connection Management Routes
 *
 * Registers /clone/connection/* endpoints for managing the local database
 * connection (status, configure, test, schemas).
 *
 * @param {Object} pDataClonerService - The RetoldDataServiceDataCloner instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
const libMeadowConnectionManager = require('meadow-connection-manager');

module.exports = (pDataClonerService, pOratorServiceServer) =>
{
	let tmpFable = pDataClonerService.fable;
	let tmpCloneState = pDataClonerService.cloneState;
	let tmpPrefix = pDataClonerService.routePrefix;

	// MCM is the canonical aggregator for connection-form schemas; the
	// DataCloner browser UI fetches /clone/connection/schemas and renders
	// its provider form straight off the result, instead of carrying
	// per-provider HTML in the bundle.  Cached on the service so we don't
	// re-walk the filesystem on every poll.
	let tmpSchemaMCM = null;
	let tmpCachedSchemas = null;
	let tmpGetSchemas = () =>
	{
		if (tmpCachedSchemas) { return tmpCachedSchemas; }
		if (!tmpSchemaMCM)
		{
			tmpSchemaMCM = new libMeadowConnectionManager(tmpFable, {}, 'datacloner-mcm-formschemas');
		}
		// Defensive: an older MCM (< 1.1.0) won't have the aggregator
		// method.  Surface an empty array rather than throwing so the
		// UI can fall back to a "schemas unavailable" message.
		if (typeof(tmpSchemaMCM.getAllProviderFormSchemas) !== 'function')
		{
			tmpFable.log.warn('DataCloner: meadow-connection-manager is older than 1.1.0; connection form schemas are not available.  Run npm update meadow-connection-manager.');
			tmpCachedSchemas = [];
			return tmpCachedSchemas;
		}
		tmpCachedSchemas = tmpSchemaMCM.getAllProviderFormSchemas();
		return tmpCachedSchemas;
	};

	// GET /clone/connection/schemas
	// Returns the form schemas for every provider whose module is
	// installed in the host environment.  Drives the connection
	// section's UI (provider picker + per-provider field block).
	pOratorServiceServer.get(`${tmpPrefix}/connection/schemas`,
		(pRequest, pResponse, fNext) =>
		{
			pResponse.send(200, { Schemas: tmpGetSchemas() });
			return fNext();
		});

	// GET /clone/connection/status
	pOratorServiceServer.get(`${tmpPrefix}/connection/status`,
		(pRequest, pResponse, fNext) =>
		{
			pResponse.send(200,
				{
					Provider: tmpCloneState.ConnectionProvider,
					Connected: tmpCloneState.ConnectionConnected,
					Config: tmpCloneState.ConnectionConfig
				});
			return fNext();
		});

	// POST /clone/connection/configure — Switch the local database provider
	pOratorServiceServer.post(`${tmpPrefix}/connection/configure`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};
			let tmpProvider = tmpBody.Provider;
			let tmpConfig = tmpBody.Config || {};

			if (!tmpProvider)
			{
				pResponse.send(400, { Success: false, Error: 'Provider is required (e.g. SQLite, MySQL, MSSQL).' });
				return fNext();
			}

			tmpFable.log.info(`Data Cloner: Configuring ${tmpProvider} connection...`);

			pDataClonerService.connectProvider(tmpProvider, tmpConfig,
				(pConnectError) =>
				{
					if (pConnectError)
					{
						tmpFable.log.error(`Data Cloner: Connection error: ${pConnectError.message}`);
						pResponse.send(500, { Success: false, Error: `Connection failed: ${pConnectError.message}` });
						return fNext();
					}

					tmpFable.log.info(`Data Cloner: ${tmpProvider} connection established.`);
					pResponse.send(200,
						{
							Success: true,
							Provider: tmpProvider,
							Message: `${tmpProvider} connection established and set as active provider.`
						});
					return fNext();
				});
		});

	// POST /clone/connection/test — Test a connection without making it permanent
	pOratorServiceServer.post(`${tmpPrefix}/connection/test`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};
			let tmpProvider = tmpBody.Provider;
			let tmpConfig = tmpBody.Config || {};

			if (!tmpProvider)
			{
				pResponse.send(400, { Success: false, Error: 'Provider is required.' });
				return fNext();
			}

			let tmpRegistryEntry = pDataClonerService.providerRegistry[tmpProvider];
			if (!tmpRegistryEntry)
			{
				pResponse.send(400, { Success: false, Error: `Unknown provider: ${tmpProvider}` });
				return fNext();
			}

			tmpFable.log.info(`Data Cloner: Testing ${tmpProvider} connection...`);

			let tmpModule;
			try
			{
				tmpModule = require(tmpRegistryEntry.moduleName);
			}
			catch (pRequireError)
			{
				pResponse.send(500, { Success: false, Error: `Module not installed: ${tmpRegistryEntry.moduleName}. Run: npm install ${tmpRegistryEntry.moduleName}` });
				return fNext();
			}

			// Create a temporary fable instance for the test
			let libFable = require('fable');
			let tmpTestFable = new libFable(
				{
					Product: 'DataClonerConnectionTest',
					LogStreams: [{ streamtype: 'console' }],
					[tmpRegistryEntry.configKey]: tmpConfig
				});

			tmpTestFable.serviceManager.addServiceType(tmpRegistryEntry.serviceName, tmpModule);
			tmpTestFable.serviceManager.instantiateServiceProvider(tmpRegistryEntry.serviceName);

			tmpTestFable[tmpRegistryEntry.serviceName].connectAsync(
				(pTestError) =>
				{
					if (pTestError)
					{
						tmpFable.log.warn(`Data Cloner: Test connection failed: ${pTestError.message || pTestError}`);
						pResponse.send(200,
							{
								Success: false,
								Provider: tmpProvider,
								Error: `Connection failed: ${pTestError.message || pTestError}`
							});
					}
					else
					{
						tmpFable.log.info(`Data Cloner: Test connection to ${tmpProvider} succeeded.`);
						pResponse.send(200,
							{
								Success: true,
								Provider: tmpProvider,
								Message: `${tmpProvider} connection test successful.`
							});
					}
					return fNext();
				});
		});
};
