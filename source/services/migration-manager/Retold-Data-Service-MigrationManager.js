/**
 * Retold Data Service - Migration Manager Service
 *
 * Fable service that exposes meadow-migrationmanager capabilities via REST
 * endpoints.  Creates an isolated MeadowMigrationManager instance (extends
 * Pict) and instantiates all migration-manager services on it.
 *
 * Two route groups:
 *   connectRoutes()      — JSON API endpoints under /api/*
 *   connectWebUIRoutes() — Web UI HTML + /lib/* static JS libraries
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libFs = require('fs');
const libPath = require('path');

const libMeadowMigrationManager = require('meadow-migrationmanager');

class RetoldDataServiceMigrationManager extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.serviceType = 'RetoldDataServiceMigrationManager';

		// Create an isolated MeadowMigrationManager instance (extends Pict).
		// This keeps migration-manager state completely separate from the
		// main Fable context.
		this._MM = new libMeadowMigrationManager(
			{
				Product: 'RetoldDataServiceMigrationManager',
				LogStreams: pFable.settings.LogStreams || [{ streamtype: 'console' }]
			});

		// Instantiate migration-manager services on the isolated context
		this._schemaLibrary = this._MM.instantiateServiceProvider('SchemaLibrary');
		this._strictureAdapter = this._MM.instantiateServiceProvider('StrictureAdapter');
		this._schemaVisualizer = this._MM.instantiateServiceProvider('SchemaVisualizer');
		this._schemaDiff = this._MM.instantiateServiceProvider('SchemaDiff');
		this._migrationGenerator = this._MM.instantiateServiceProvider('MigrationGenerator');
		this._flowDataBuilder = this._MM.instantiateServiceProvider('FlowDataBuilder');
		this._connectionLibrary = this._MM.instantiateServiceProvider('ConnectionLibrary');
		this._databaseProviderFactory = this._MM.instantiateServiceProvider('DatabaseProviderFactory');
	}

	/**
	 * The underlying MeadowMigrationManager (Pict) instance.
	 */
	get migrationManager()
	{
		return this._MM;
	}

	/**
	 * The route prefix for all migration manager endpoints.
	 */
	get routePrefix()
	{
		let tmpConfig = this.fable.RetoldDataService.options.MigrationManager || {};
		return tmpConfig.RoutePrefix || '';
	}

	/**
	 * The model path for DDL files.
	 */
	get modelPath()
	{
		let tmpMigrationManagerConfig = this.fable.RetoldDataService.options.MigrationManager || {};
		return tmpMigrationManagerConfig.ModelPath || false;
	}

	// ================================================================
	// Helper functions (from MigrationManager-Server-Setup.js)
	// ================================================================

	/**
	 * Scan a directory for DDL files (.mddl and .ddl) non-recursively.
	 *
	 * @param {string} pDirPath - Directory path to scan
	 * @return {Array<string>} Array of absolute file paths
	 */
	scanForDDLFiles(pDirPath)
	{
		let tmpFiles = [];

		try
		{
			let tmpEntries = libFs.readdirSync(pDirPath);

			for (let i = 0; i < tmpEntries.length; i++)
			{
				let tmpEntry = tmpEntries[i];

				if (tmpEntry.endsWith('.mddl') || tmpEntry.endsWith('.ddl'))
				{
					tmpFiles.push(libPath.join(pDirPath, tmpEntry));
				}
			}
		}
		catch (pError)
		{
			// Directory read failed; return empty
		}

		return tmpFiles;
	}

	/**
	 * Normalize a compiled schema's Tables property from hash to array.
	 *
	 * @param {Object} pCompiledSchema - A compiled schema object
	 * @return {Object} Schema with Tables normalized to array format
	 */
	normalizeSchemaForDiff(pCompiledSchema)
	{
		if (!pCompiledSchema || !pCompiledSchema.Tables)
		{
			return { Tables: [] };
		}

		if (Array.isArray(pCompiledSchema.Tables))
		{
			return pCompiledSchema;
		}

		let tmpNormalized = Object.assign({}, pCompiledSchema);
		let tmpTables = [];
		let tmpTableKeys = Object.keys(pCompiledSchema.Tables);

		for (let i = 0; i < tmpTableKeys.length; i++)
		{
			tmpTables.push(pCompiledSchema.Tables[tmpTableKeys[i]]);
		}

		tmpNormalized.Tables = tmpTables;
		return tmpNormalized;
	}

	/**
	 * Recursively discover all DDL files referenced by [Include ...] directives.
	 *
	 * @param {string} pFilePath - Absolute path to the DDL file to parse
	 * @param {string} pBaseDir  - The base model directory for relative path calculation
	 * @param {Set}    [pVisited] - Set of already-visited absolute paths
	 * @param {string} [pIncludedBy] - Relative path of the file that included this one
	 * @param {number} [pDepth] - Include depth level
	 * @return {Array<Object>} Array of file descriptor objects
	 */
	discoverIncludedFiles(pFilePath, pBaseDir, pVisited, pIncludedBy, pDepth)
	{
		let tmpVisited = pVisited || new Set();
		let tmpResults = [];
		let tmpDepth = pDepth || 0;

		let tmpAbsPath = libPath.resolve(pFilePath);
		let tmpAbsBase = libPath.resolve(pBaseDir);

		// Prevent directory traversal outside base dir
		if (!tmpAbsPath.startsWith(tmpAbsBase))
		{
			return tmpResults;
		}

		// Prevent circular includes
		if (tmpVisited.has(tmpAbsPath))
		{
			return tmpResults;
		}

		tmpVisited.add(tmpAbsPath);

		let tmpContent = '';
		try
		{
			tmpContent = libFs.readFileSync(tmpAbsPath, 'utf8');
		}
		catch (pError)
		{
			return tmpResults;
		}

		let tmpRelPath = libPath.relative(tmpAbsBase, tmpAbsPath);

		tmpResults.push(
		{
			RelativePath: tmpRelPath,
			AbsolutePath: tmpAbsPath,
			Content: tmpContent,
			IsMain: (tmpVisited.size === 1),
			IncludedBy: pIncludedBy || null,
			Depth: tmpDepth
		});

		// Parse [Include ...] directives
		let tmpLines = tmpContent.split('\n');
		let tmpFileDir = libPath.dirname(tmpAbsPath);

		for (let i = 0; i < tmpLines.length; i++)
		{
			let tmpLine = tmpLines[i].trim();
			let tmpMatch = tmpLine.match(/^\[Include\s+(.+)\]$/i);

			if (tmpMatch)
			{
				let tmpIncludePath = tmpMatch[1].trim();
				let tmpIncludeAbs = libPath.resolve(tmpFileDir, tmpIncludePath);

				let tmpChildFiles = this.discoverIncludedFiles(tmpIncludeAbs, tmpAbsBase, tmpVisited, tmpRelPath, tmpDepth + 1);

				for (let j = 0; j < tmpChildFiles.length; j++)
				{
					tmpResults.push(tmpChildFiles[j]);
				}
			}
		}

		return tmpResults;
	}

	// ================================================================
	// Initialization
	// ================================================================

	/**
	 * Initialize the migration manager: scan ModelPath for DDL files,
	 * import them into the SchemaLibrary, and auto-compile.
	 *
	 * @param {function} fCallback - Callback(pError)
	 */
	initializeMigrationManager(fCallback)
	{
		let tmpModelPath = this.modelPath;

		if (!tmpModelPath)
		{
			this.fable.log.info('MigrationManager: No ModelPath configured; schema library is empty.');
			return fCallback();
		}

		// Scan for DDL files
		let tmpDDLFiles = this.scanForDDLFiles(tmpModelPath);
		let tmpImportCount = 0;

		for (let i = 0; i < tmpDDLFiles.length; i++)
		{
			this._schemaLibrary.importSchemaFromFile(tmpDDLFiles[i],
				(pError, pEntry) =>
				{
					if (!pError && pEntry)
					{
						tmpImportCount++;
					}
				});
		}

		this.fable.log.info(`MigrationManager: Imported ${tmpImportCount} schema(s) from ${tmpModelPath}`);

		// Auto-compile all imported schemas
		let tmpSchemaNames = this._schemaLibrary.listSchemas();
		let tmpCompilesPending = tmpSchemaNames.length;
		let tmpCompilesDone = 0;

		let fOnAllCompiled = () =>
		{
			this.fable.log.info(`MigrationManager: Compiled ${tmpCompilesDone} of ${tmpSchemaNames.length} schema(s).`);
			return fCallback();
		};

		if (tmpSchemaNames.length === 0)
		{
			return fCallback();
		}

		for (let i = 0; i < tmpSchemaNames.length; i++)
		{
			let tmpSchemaName = tmpSchemaNames[i];
			let tmpSchemaEntry = this._schemaLibrary.getSchema(tmpSchemaName);

			if (!tmpSchemaEntry || !tmpSchemaEntry.DDL)
			{
				tmpCompilesPending--;
				if (tmpCompilesPending <= 0)
				{
					fOnAllCompiled();
				}
				continue;
			}

			let tmpCompileCallback = (pError, pCompiledSchema, pMeadowPackages) =>
				{
					if (!pError && pCompiledSchema)
					{
						tmpSchemaEntry.CompiledSchema = pCompiledSchema;
						tmpSchemaEntry.MeadowPackages = pMeadowPackages;
						tmpSchemaEntry.LastCompiled = new Date().toJSON();
						tmpCompilesDone++;
					}
					else if (pError)
					{
						this._MM.log.warn(`MigrationManager: Failed to compile schema [${tmpSchemaName}]: ${pError.message || pError}`);
					}

					tmpCompilesPending--;
					if (tmpCompilesPending <= 0)
					{
						fOnAllCompiled();
					}
				};

			if (tmpSchemaEntry.SourceFilePath)
			{
				this._strictureAdapter.compileFileAndGenerate(tmpSchemaEntry.SourceFilePath, tmpCompileCallback);
			}
			else
			{
				this._strictureAdapter.compileAndGenerate(tmpSchemaEntry.DDL, tmpCompileCallback);
			}
		}
	}

	// ================================================================
	// Route registration
	// ================================================================

	/**
	 * Register all migration manager API routes on the Orator service server.
	 *
	 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
	 */
	connectRoutes(pOratorServiceServer)
	{
		require('./MigrationManager-Command-Schemas.js')(this, pOratorServiceServer);
		require('./MigrationManager-Command-Connections.js')(this, pOratorServiceServer);
		require('./MigrationManager-Command-DiffMigrate.js')(this, pOratorServiceServer);

		this.fable.log.info('Retold Data Service MigrationManager API routes registered.');
	}

	/**
	 * Register the web UI and static library routes on the Orator service server.
	 *
	 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
	 */
	connectWebUIRoutes(pOratorServiceServer)
	{
		require('./MigrationManager-Command-WebUI.js')(this, pOratorServiceServer);

		this.fable.log.info('Retold Data Service MigrationManager Web UI routes registered.');
	}
}

module.exports = RetoldDataServiceMigrationManager;
module.exports.serviceType = 'RetoldDataServiceMigrationManager';
module.exports.default_configuration = {};
