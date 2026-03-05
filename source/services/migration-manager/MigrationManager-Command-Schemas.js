/**
 * MigrationManager Command - Schema Management
 *
 * Routes for schema CRUD, compilation, visualization, and file management.
 *
 * GET    /api/schemas
 * GET    /api/schemas/:name
 * GET    /api/schemas/:name/ddl
 * PUT    /api/schemas/:name/ddl
 * GET    /api/schemas/:name/files
 * GET    /api/schemas/:name/file/:filepath
 * PUT    /api/schemas/:name/file/:filepath
 * POST   /api/schemas/:name/compile
 * GET    /api/schemas/:name/visualize
 * GET    /api/schemas/:name/meadow-packages
 */
const libFs = require('fs');
const libPath = require('path');

module.exports = function(pMigrationService, pOratorServiceServer)
{
	let tmpSchemaLibrary = pMigrationService._schemaLibrary;
	let tmpStrictureAdapter = pMigrationService._strictureAdapter;
	let tmpSchemaVisualizer = pMigrationService._schemaVisualizer;
	let tmpFlowDataBuilder = pMigrationService._flowDataBuilder;
	let tmpPrefix = pMigrationService.routePrefix;

	// GET /api/schemas — list all schemas with compiled status
	pOratorServiceServer.get(tmpPrefix + '/api/schemas',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpNames = tmpSchemaLibrary.listSchemas();
				let tmpSchemas = [];

				for (let i = 0; i < tmpNames.length; i++)
				{
					let tmpEntry = tmpSchemaLibrary.getSchema(tmpNames[i]);
					tmpSchemas.push(
					{
						Name: tmpEntry.Name,
						IsCompiled: !!tmpEntry.CompiledSchema,
						LastCompiled: tmpEntry.LastCompiled || null,
						TableCount: (tmpEntry.CompiledSchema && tmpEntry.CompiledSchema.Tables)
							? (Array.isArray(tmpEntry.CompiledSchema.Tables)
								? tmpEntry.CompiledSchema.Tables.length
								: Object.keys(tmpEntry.CompiledSchema.Tables).length)
							: 0,
						HasSourceFile: !!tmpEntry.SourceFilePath
					});
				}

				pResponse.send({ Success: true, Schemas: tmpSchemas });
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});

	// GET /api/schemas/:name — full schema detail
	pOratorServiceServer.get(tmpPrefix + '/api/schemas/:name',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

				if (!tmpEntry)
				{
					pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
					return fNext();
				}

				pResponse.send(
				{
					Success: true,
					Schema:
					{
						Name: tmpEntry.Name,
						DDL: tmpEntry.DDL,
						CompiledSchema: tmpEntry.CompiledSchema,
						MeadowPackages: tmpEntry.MeadowPackages,
						IsCompiled: !!tmpEntry.CompiledSchema,
						LastCompiled: tmpEntry.LastCompiled || null,
						HasSourceFile: !!tmpEntry.SourceFilePath
					}
				});
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});

	// GET /api/schemas/:name/ddl — raw DDL text
	pOratorServiceServer.get(tmpPrefix + '/api/schemas/:name/ddl',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

				if (!tmpEntry)
				{
					pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
					return fNext();
				}

				pResponse.send({ Success: true, Name: tmpEntry.Name, DDL: tmpEntry.DDL });
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});

	// PUT /api/schemas/:name/ddl — update DDL text
	pOratorServiceServer.put(tmpPrefix + '/api/schemas/:name/ddl',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

				if (!tmpEntry)
				{
					// Create a new schema entry if it doesn't exist
					tmpEntry = tmpSchemaLibrary.addSchema(pRequest.params.name, '');
				}

				let tmpDDL = '';
				if (pRequest.body && typeof (pRequest.body) === 'object' && pRequest.body.DDL !== undefined)
				{
					tmpDDL = pRequest.body.DDL;
				}
				else if (typeof (pRequest.body) === 'string')
				{
					tmpDDL = pRequest.body;
				}

				tmpEntry.DDL = tmpDDL;
				// Clear compiled state when DDL changes
				tmpEntry.CompiledSchema = null;
				tmpEntry.MeadowPackages = null;
				tmpEntry.LastCompiled = null;

				// Also write back to the source file if it exists
				if (tmpEntry.SourceFilePath)
				{
					try
					{
						libFs.writeFileSync(tmpEntry.SourceFilePath, tmpDDL, 'utf8');
					}
					catch (pWriteError)
					{
						pMigrationService._MM.log.warn(`Failed to write back to source file [${tmpEntry.SourceFilePath}]: ${pWriteError.message}`);
					}
				}

				pResponse.send({ Success: true, Name: tmpEntry.Name });
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});

	// GET /api/schemas/:name/files — discover all DDL files (main + includes)
	pOratorServiceServer.get(tmpPrefix + '/api/schemas/:name/files',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

				if (!tmpEntry)
				{
					pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
					return fNext();
				}

				let tmpModelPath = pMigrationService.modelPath;

				if (tmpEntry.SourceFilePath && tmpModelPath)
				{
					let tmpFiles = pMigrationService.discoverIncludedFiles(tmpEntry.SourceFilePath, tmpModelPath);

					pResponse.send(
					{
						Success: true,
						Name: tmpEntry.Name,
						HasSourceFile: true,
						Files: tmpFiles.map(function(pFile)
						{
							let tmpLines = pFile.Content.split('\n');
							let tmpTableCount = 0;
							for (let k = 0; k < tmpLines.length; k++)
							{
								if (tmpLines[k].trimStart().charAt(0) === '!')
								{
									tmpTableCount++;
								}
							}
							return {
								RelativePath: pFile.RelativePath,
								Content: pFile.Content,
								IsMain: pFile.IsMain,
								IncludedBy: pFile.IncludedBy || null,
								Depth: pFile.Depth || 0,
								Bytes: Buffer.byteLength(pFile.Content, 'utf8'),
								LineCount: tmpLines.length,
								TableCount: tmpTableCount
							};
						})
					});
				}
				else
				{
					// Programmatic schema — return a single virtual file entry
					let tmpDDL = tmpEntry.DDL || '';
					let tmpDDLLines = tmpDDL.split('\n');
					let tmpDDLTableCount = 0;
					for (let k = 0; k < tmpDDLLines.length; k++)
					{
						if (tmpDDLLines[k].trimStart().charAt(0) === '!')
						{
							tmpDDLTableCount++;
						}
					}
					pResponse.send(
					{
						Success: true,
						Name: tmpEntry.Name,
						HasSourceFile: false,
						Files:
						[
							{
								RelativePath: tmpEntry.Name + '.ddl',
								Content: tmpDDL,
								IsMain: true,
								IncludedBy: null,
								Depth: 0,
								Bytes: Buffer.byteLength(tmpDDL, 'utf8'),
								LineCount: tmpDDLLines.length,
								TableCount: tmpDDLTableCount
							}
						]
					});
				}
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});

	// GET /api/schemas/:name/file/:filepath — read a specific child file
	pOratorServiceServer.get(tmpPrefix + '/api/schemas/:name/file/:filepath',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

				if (!tmpEntry)
				{
					pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
					return fNext();
				}

				if (!tmpEntry.SourceFilePath)
				{
					pResponse.send({ Success: true, Content: tmpEntry.DDL || '' });
					return fNext();
				}

				let tmpModelPath = pMigrationService.modelPath;
				let tmpRelPath = decodeURIComponent(pRequest.params.filepath);
				let tmpAbsPath = libPath.resolve(tmpModelPath, tmpRelPath);
				let tmpAbsBase = libPath.resolve(tmpModelPath);

				// Prevent directory traversal
				if (!tmpAbsPath.startsWith(tmpAbsBase))
				{
					pResponse.send(403, { Success: false, Error: 'Path outside model directory.' });
					return fNext();
				}

				let tmpContent = libFs.readFileSync(tmpAbsPath, 'utf8');
				pResponse.send({ Success: true, RelativePath: tmpRelPath, Content: tmpContent });
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});

	// PUT /api/schemas/:name/file/:filepath — write updated content to a specific child file
	pOratorServiceServer.put(tmpPrefix + '/api/schemas/:name/file/:filepath',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

				if (!tmpEntry)
				{
					pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
					return fNext();
				}

				let tmpContent = '';
				if (pRequest.body && typeof (pRequest.body) === 'object' && pRequest.body.Content !== undefined)
				{
					tmpContent = pRequest.body.Content;
				}
				else if (typeof (pRequest.body) === 'string')
				{
					tmpContent = pRequest.body;
				}

				if (!tmpEntry.SourceFilePath)
				{
					tmpEntry.DDL = tmpContent;
					tmpEntry.CompiledSchema = null;
					tmpEntry.MeadowPackages = null;
					tmpEntry.LastCompiled = null;
					pResponse.send({ Success: true });
					return fNext();
				}

				let tmpModelPath = pMigrationService.modelPath;
				let tmpRelPath = decodeURIComponent(pRequest.params.filepath);
				let tmpAbsPath = libPath.resolve(tmpModelPath, tmpRelPath);
				let tmpAbsBase = libPath.resolve(tmpModelPath);

				// Prevent directory traversal
				if (!tmpAbsPath.startsWith(tmpAbsBase))
				{
					pResponse.send(403, { Success: false, Error: 'Path outside model directory.' });
					return fNext();
				}

				libFs.writeFileSync(tmpAbsPath, tmpContent, 'utf8');

				// If this is the main file, also update the schema entry DDL
				if (tmpAbsPath === libPath.resolve(tmpEntry.SourceFilePath))
				{
					tmpEntry.DDL = tmpContent;
				}

				// Clear compiled state since a file changed
				tmpEntry.CompiledSchema = null;
				tmpEntry.MeadowPackages = null;
				tmpEntry.LastCompiled = null;

				pResponse.send({ Success: true, RelativePath: tmpRelPath });
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});

	// POST /api/schemas/:name/compile — compile DDL
	pOratorServiceServer.post(tmpPrefix + '/api/schemas/:name/compile',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

				if (!tmpEntry)
				{
					pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
					return fNext();
				}

				if (!tmpEntry.DDL)
				{
					pResponse.send(400, { Success: false, Error: 'Schema has no DDL text to compile.' });
					return fNext();
				}

				let tmpCompileHandler = (pError, pCompiledSchema, pMeadowPackages) =>
					{
						if (pError)
						{
							pResponse.send(500, { Success: false, Error: `Compilation failed: ${pError.message || pError}` });
							return fNext();
						}

						tmpEntry.CompiledSchema = pCompiledSchema;
						tmpEntry.MeadowPackages = pMeadowPackages;
						tmpEntry.LastCompiled = new Date().toJSON();

						pResponse.send(
						{
							Success: true,
							Name: tmpEntry.Name,
							CompiledSchema: tmpEntry.CompiledSchema,
							MeadowPackages: tmpEntry.MeadowPackages,
							LastCompiled: tmpEntry.LastCompiled
						});
						return fNext();
					};

				if (tmpEntry.SourceFilePath)
				{
					// Re-read the main file in case it was edited via the file API
					try
					{
						tmpEntry.DDL = libFs.readFileSync(tmpEntry.SourceFilePath, 'utf8');
					}
					catch (pReadError)
					{
						// If we can't re-read, use the existing DDL
					}

					tmpStrictureAdapter.compileFileAndGenerate(tmpEntry.SourceFilePath, tmpCompileHandler);
				}
				else
				{
					tmpStrictureAdapter.compileAndGenerate(tmpEntry.DDL, tmpCompileHandler);
				}
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
				return fNext();
			}
		});

	// GET /api/schemas/:name/visualize — visualization data
	pOratorServiceServer.get(tmpPrefix + '/api/schemas/:name/visualize',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

				if (!tmpEntry)
				{
					pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
					return fNext();
				}

				if (!tmpEntry.CompiledSchema)
				{
					pResponse.send(400, { Success: false, Error: 'Schema has not been compiled yet.' });
					return fNext();
				}

				let tmpTableList = tmpSchemaVisualizer.generateTableList(tmpEntry.CompiledSchema);
				let tmpASCIIDiagram = tmpSchemaVisualizer.generateASCIIDiagram(tmpEntry.CompiledSchema);
				let tmpRelationshipMap = tmpSchemaVisualizer.generateRelationshipMap(tmpEntry.CompiledSchema);

				let tmpTableDetails = [];
				let tmpTables = Array.isArray(tmpEntry.CompiledSchema.Tables)
					? tmpEntry.CompiledSchema.Tables
					: Object.values(tmpEntry.CompiledSchema.Tables || {});

				for (let i = 0; i < tmpTables.length; i++)
				{
					tmpTableDetails.push(tmpSchemaVisualizer.generateTableDetail(tmpTables[i]));
				}

				let tmpFlowData = tmpFlowDataBuilder.buildFlowData(tmpEntry.CompiledSchema);

				pResponse.send(
				{
					Success: true,
					Name: tmpEntry.Name,
					TableList: tmpTableList,
					ASCIIDiagram: tmpASCIIDiagram,
					RelationshipMap: tmpRelationshipMap,
					TableDetails: tmpTableDetails,
					FlowData: tmpFlowData
				});
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});

	// GET /api/schemas/:name/meadow-packages — Meadow package JSON
	pOratorServiceServer.get(tmpPrefix + '/api/schemas/:name/meadow-packages',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpEntry = tmpSchemaLibrary.getSchema(pRequest.params.name);

				if (!tmpEntry)
				{
					pResponse.send(404, { Success: false, Error: `Schema [${pRequest.params.name}] not found.` });
					return fNext();
				}

				if (!tmpEntry.CompiledSchema)
				{
					pResponse.send(400, { Success: false, Error: 'Schema has not been compiled yet.' });
					return fNext();
				}

				let tmpPackages = tmpEntry.MeadowPackages || tmpStrictureAdapter.generateMeadowPackages(tmpEntry.CompiledSchema);

				pResponse.send(
				{
					Success: true,
					Name: tmpEntry.Name,
					MeadowPackages: tmpPackages
				});
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: pError.message });
			}
			return fNext();
		});
};
