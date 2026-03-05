/**
 * MigrationManager Command - Connection Management
 *
 * Routes for database connection CRUD, testing, introspection, and
 * provider listing.
 *
 * GET    /api/providers
 * GET    /api/connections
 * POST   /api/connections
 * DELETE /api/connections/:name
 * POST   /api/connections/:name/test
 * POST   /api/connections/test
 * POST   /api/connections/:name/introspect
 */
module.exports = function(pMigrationService, pOratorServiceServer)
{
	let tmpConnectionLibrary = pMigrationService._connectionLibrary;
	let tmpDatabaseProviderFactory = pMigrationService._databaseProviderFactory;
	let tmpSchemaLibrary = pMigrationService._schemaLibrary;
	let tmpPrefix = pMigrationService.routePrefix;

	// GET /api/providers — list available database provider types
	pOratorServiceServer.get(tmpPrefix + '/api/providers',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				pResponse.send(
				{
					Success: true,
					Providers: tmpDatabaseProviderFactory.listAvailableProviders()
				});
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});

	// GET /api/connections — list all saved connections
	pOratorServiceServer.get(tmpPrefix + '/api/connections',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpNames = tmpConnectionLibrary.listConnections();
				let tmpConnections = [];

				for (let i = 0; i < tmpNames.length; i++)
				{
					let tmpEntry = tmpConnectionLibrary.getConnection(tmpNames[i]);
					tmpConnections.push(
					{
						Name: tmpEntry.Name,
						Type: tmpEntry.Type,
						Config:
						{
							server: tmpEntry.Config.server || tmpEntry.Config.host || '',
							port: tmpEntry.Config.port || '',
							user: tmpEntry.Config.user || '',
							database: tmpEntry.Config.database || ''
							// Intentionally omit password
						}
					});
				}

				pResponse.send({ Success: true, Connections: tmpConnections });
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});

	// POST /api/connections — add a new connection
	pOratorServiceServer.post(tmpPrefix + '/api/connections',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpName = pRequest.body && pRequest.body.Name;
				let tmpType = pRequest.body && pRequest.body.Type;
				let tmpConfig = pRequest.body && pRequest.body.Config;

				if (!tmpName || !tmpType || !tmpConfig)
				{
					pResponse.send(400, { Success: false, Error: 'Name, Type, and Config are required.' });
					return fNext();
				}

				tmpConnectionLibrary.addConnection(tmpName, tmpType, tmpConfig);

				pResponse.send({ Success: true, Name: tmpName });
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});

	// DELETE /api/connections/:name — remove a connection
	pOratorServiceServer.del(tmpPrefix + '/api/connections/:name',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpRemoved = tmpConnectionLibrary.removeConnection(pRequest.params.name);

				if (!tmpRemoved)
				{
					pResponse.send(404, { Success: false, Error: `Connection [${pRequest.params.name}] not found.` });
					return fNext();
				}

				pResponse.send({ Success: true });
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});

	// POST /api/connections/:name/test — test a saved connection
	pOratorServiceServer.post(tmpPrefix + '/api/connections/:name/test',
		(pRequest, pResponse, fNext) =>
		{
			tmpDatabaseProviderFactory.testConnection(pRequest.params.name,
				(pError, pTableList) =>
				{
					if (pError)
					{
						pResponse.send(500, { Success: false, Error: `Connection test failed: ${pError.message || pError}` });
						return fNext();
					}

					pResponse.send(
					{
						Success: true,
						TableCount: pTableList.length,
						Tables: pTableList
					});
					return fNext();
				});
		});

	// POST /api/connections/test — test an unsaved connection config
	pOratorServiceServer.post(tmpPrefix + '/api/connections/test',
		(pRequest, pResponse, fNext) =>
		{
			let tmpType = pRequest.body && pRequest.body.Type;
			let tmpConfig = pRequest.body && pRequest.body.Config;

			if (!tmpType || !tmpConfig)
			{
				pResponse.send(400, { Success: false, Error: 'Type and Config are required.' });
				return fNext();
			}

			tmpDatabaseProviderFactory.testConnectionConfig(tmpType, tmpConfig,
				(pError, pTableList) =>
				{
					if (pError)
					{
						pResponse.send(500, { Success: false, Error: `Connection test failed: ${pError.message || pError}` });
						return fNext();
					}

					pResponse.send(
					{
						Success: true,
						TableCount: pTableList.length,
						Tables: pTableList
					});
					return fNext();
				});
		});

	// POST /api/connections/:name/introspect — introspect a saved connection
	pOratorServiceServer.post(tmpPrefix + '/api/connections/:name/introspect',
		(pRequest, pResponse, fNext) =>
		{
			tmpDatabaseProviderFactory.introspectConnection(pRequest.params.name,
				(pError, pSchema) =>
				{
					if (pError)
					{
						pResponse.send(500, { Success: false, Error: `Introspection failed: ${pError.message || pError}` });
						return fNext();
					}

					let tmpSaveAs = pRequest.body && pRequest.body.saveAs;

					if (tmpSaveAs)
					{
						let tmpEntry = tmpSchemaLibrary.addSchema(tmpSaveAs, '');
						tmpEntry.CompiledSchema = pSchema;
						tmpEntry.LastCompiled = new Date().toJSON();

						pResponse.send(
						{
							Success: true,
							Schema: pSchema,
							SavedAs: tmpSaveAs
						});
						return fNext();
					}

					pResponse.send(
					{
						Success: true,
						Schema: pSchema
					});
					return fNext();
				});
		});
};
