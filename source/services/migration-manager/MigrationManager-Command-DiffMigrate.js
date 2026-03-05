/**
 * MigrationManager Command - Diff & Migration
 *
 * Routes for schema diffing and SQL migration script generation.
 *
 * POST   /api/schemas/diff
 * POST   /api/schemas/generate-migration
 */
module.exports = function(pMigrationService, pOratorServiceServer)
{
	let tmpSchemaLibrary = pMigrationService._schemaLibrary;
	let tmpSchemaDiff = pMigrationService._schemaDiff;
	let tmpMigrationGenerator = pMigrationService._migrationGenerator;
	let tmpDatabaseProviderFactory = pMigrationService._databaseProviderFactory;
	let tmpPrefix = pMigrationService.routePrefix;

	// POST /api/schemas/diff — diff two schemas (DDL↔DDL, DDL↔DB, DB↔DB)
	pOratorServiceServer.post(tmpPrefix + '/api/schemas/diff',
		(pRequest, pResponse, fNext) =>
		{
			let tmpSourceName = pRequest.body && pRequest.body.source;
			let tmpTargetName = pRequest.body && pRequest.body.target;
			let tmpSourceConnection = pRequest.body && pRequest.body.sourceConnection;
			let tmpTargetConnection = pRequest.body && pRequest.body.targetConnection;

			// Resolve the source side
			let fResolveSource = (fDone) =>
			{
				if (tmpSourceConnection)
				{
					tmpDatabaseProviderFactory.introspectConnection(tmpSourceConnection,
						(pError, pSchema) =>
						{
							if (pError)
							{
								return fDone(pError);
							}
							return fDone(null, pSchema, `DB:${tmpSourceConnection}`);
						});
				}
				else if (tmpSourceName)
				{
					let tmpSourceEntry = tmpSchemaLibrary.getSchema(tmpSourceName);

					if (!tmpSourceEntry)
					{
						return fDone(new Error(`Source schema [${tmpSourceName}] not found.`));
					}

					if (!tmpSourceEntry.CompiledSchema)
					{
						return fDone(new Error(`Source schema [${tmpSourceName}] has not been compiled.`));
					}

					return fDone(null, pMigrationService.normalizeSchemaForDiff(tmpSourceEntry.CompiledSchema), tmpSourceName);
				}
				else
				{
					return fDone(new Error('Either source or sourceConnection is required.'));
				}
			};

			// Resolve the target side
			let fResolveTarget = (fDone) =>
			{
				if (tmpTargetConnection)
				{
					tmpDatabaseProviderFactory.introspectConnection(tmpTargetConnection,
						(pError, pSchema) =>
						{
							if (pError)
							{
								return fDone(pError);
							}
							return fDone(null, pSchema, `DB:${tmpTargetConnection}`);
						});
				}
				else if (tmpTargetName)
				{
					let tmpTargetEntry = tmpSchemaLibrary.getSchema(tmpTargetName);

					if (!tmpTargetEntry)
					{
						return fDone(new Error(`Target schema [${tmpTargetName}] not found.`));
					}

					if (!tmpTargetEntry.CompiledSchema)
					{
						return fDone(new Error(`Target schema [${tmpTargetName}] has not been compiled.`));
					}

					return fDone(null, pMigrationService.normalizeSchemaForDiff(tmpTargetEntry.CompiledSchema), tmpTargetName);
				}
				else
				{
					return fDone(new Error('Either target or targetConnection is required.'));
				}
			};

			fResolveSource(
				(pSourceError, pSourceSchema, pSourceLabel) =>
				{
					if (pSourceError)
					{
						pResponse.send(400, { Success: false, Error: pSourceError.message });
						return fNext();
					}

					fResolveTarget(
						(pTargetError, pTargetSchema, pTargetLabel) =>
						{
							if (pTargetError)
							{
								pResponse.send(400, { Success: false, Error: pTargetError.message });
								return fNext();
							}

							try
							{
								let tmpDiffResult = tmpSchemaDiff.diffSchemas(pSourceSchema, pTargetSchema);

								pResponse.send(
								{
									Success: true,
									Source: pSourceLabel,
									Target: pTargetLabel,
									Diff: tmpDiffResult
								});
							}
							catch (pDiffError)
							{
								pResponse.send(500, { Success: false, Error: pDiffError.message });
							}
							return fNext();
						});
				});
		});

	// POST /api/schemas/generate-migration — generate SQL migration script
	pOratorServiceServer.post(tmpPrefix + '/api/schemas/generate-migration',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpDiff = pRequest.body && pRequest.body.diff;
				let tmpDatabaseType = (pRequest.body && pRequest.body.databaseType) || 'MySQL';

				if (!tmpDiff)
				{
					pResponse.send(400, { Success: false, Error: 'A diff result object is required.' });
					return fNext();
				}

				let tmpScript = tmpMigrationGenerator.generateMigrationScript(tmpDiff, tmpDatabaseType);

				pResponse.send(
				{
					Success: true,
					DatabaseType: tmpDatabaseType,
					Script: tmpScript
				});
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});
};
