/**
 * Retold Data Service - Stricture Service
 *
 * Fable service that exposes stricture compilation and generation
 * capabilities via REST endpoints under /1.0/Retold/Stricture/.
 *
 * Stricture is a procedural CLI tool (not a service provider), so this
 * service calls its internal compiler and generator functions directly,
 * creating fresh Fable contexts for each operation to avoid state leakage.
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libFable = require('fable');
const libFS = require('fs');
const libPath = require('path');
const libOS = require('os');

// Require stricture internals directly — these are plain functions, not service providers
const libStrictureCompile = require('stricture/source/Stricture-Compile.js');
const libStricturePrepare = require('stricture/source/Stricture-Run-Prepare.js');

class RetoldDataServiceStricture extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.serviceType = 'RetoldDataServiceStricture';
	}

	/**
	 * Create a fresh Fable instance configured for a stricture operation.
	 *
	 * Each operation gets its own isolated context to avoid state leakage
	 * between concurrent requests.
	 *
	 * @param {Object} pSettings - Settings to merge into the Fable instance
	 * @return {Object} A Fable instance ready for stricture operations
	 */
	_createStrictureContext(pSettings)
	{
		let tmpSettings = Object.assign(
			{
				Product: 'RetoldDataServiceStricture',
				LogStreams: [{ streamtype: 'console', level: 'fatal' }]
			}, pSettings);

		let tmpFable = libFable.new(tmpSettings);

		// Set up stricture extensions (LoadJSON, GenerateIndexedTables)
		libStricturePrepare(tmpFable, () => {});

		return tmpFable;
	}

	/**
	 * Create a temporary directory for stricture I/O.
	 *
	 * @return {string} Absolute path to the temp directory
	 */
	createTempDir()
	{
		return libFS.mkdtempSync(libPath.join(libOS.tmpdir(), 'retold-stricture-'));
	}

	/**
	 * Recursively remove a temporary directory and all its contents.
	 *
	 * @param {string} pDir - Absolute path to the temp directory
	 */
	cleanupTempDir(pDir)
	{
		try
		{
			libFS.rmSync(pDir, { recursive: true, force: true });
		}
		catch (pError)
		{
			this.fable.log.warn(`Failed to clean up temp directory [${pDir}]: ${pError}`);
		}
	}

	/**
	 * Read all files from a directory and return them as a map of filename → content.
	 *
	 * @param {string} pDir - Directory to read
	 * @return {Object} Map of filename → file content (string)
	 */
	readAllFiles(pDir)
	{
		let tmpFiles = {};
		let tmpEntries = libFS.readdirSync(pDir, { withFileTypes: true });

		for (let i = 0; i < tmpEntries.length; i++)
		{
			if (tmpEntries[i].isFile())
			{
				tmpFiles[tmpEntries[i].name] = libFS.readFileSync(libPath.join(pDir, tmpEntries[i].name), 'utf8');
			}
		}

		return tmpFiles;
	}

	/**
	 * Compile DDL content to a stricture model.
	 *
	 * Accepts either:
	 *   - { DDL: "string content" } for a single DDL file
	 *   - { Files: { "name.ddl": "content", ... }, EntryPoint: "name.ddl" } for multi-file
	 *
	 * @param {Object} pInput - The DDL input
	 * @param {function} fCallback - Callback as fCallback(pError, pCompiledModel)
	 */
	compileFromDDL(pInput, fCallback)
	{
		let tmpInputDir = this.createTempDir();
		let tmpOutputDir = this.createTempDir();

		let tmpEntryPoint;

		try
		{
			if (pInput.DDL && typeof(pInput.DDL) === 'string')
			{
				// Single DDL string shorthand
				tmpEntryPoint = 'Model.ddl';
				libFS.writeFileSync(libPath.join(tmpInputDir, tmpEntryPoint), pInput.DDL, 'utf8');
			}
			else if (pInput.Files && typeof(pInput.Files) === 'object')
			{
				// Multi-file virtual filesystem
				let tmpFileNames = Object.keys(pInput.Files);
				for (let i = 0; i < tmpFileNames.length; i++)
				{
					let tmpFilePath = libPath.join(tmpInputDir, tmpFileNames[i]);
					// Create subdirectories for paths like "entities/Author.ddl"
					let tmpFileDir = libPath.dirname(tmpFilePath);
					if (!libFS.existsSync(tmpFileDir))
					{
						libFS.mkdirSync(tmpFileDir, { recursive: true });
					}
					libFS.writeFileSync(tmpFilePath, pInput.Files[tmpFileNames[i]], 'utf8');
				}
				tmpEntryPoint = pInput.EntryPoint || tmpFileNames[0];
			}
			else
			{
				this.cleanupTempDir(tmpInputDir);
				this.cleanupTempDir(tmpOutputDir);
				return fCallback(new Error('Request body must include DDL (string) or Files (object).'));
			}

			let tmpEntryPointPath = libPath.join(tmpInputDir, tmpEntryPoint);

			// Create a fresh stricture context for this compilation
			let tmpStrictureContext = this._createStrictureContext(
				{
					InputFileName: tmpEntryPointPath,
					OutputLocation: tmpOutputDir + '/',
					OutputFileName: 'Model'
				});

			// Call the compiler directly — it reads DDL from InputFileName,
			// writes JSON to OutputLocation, and stores the model in tmpStrictureContext.Stricture
			libStrictureCompile(tmpStrictureContext,
				(pError) =>
				{
					let tmpResult = null;

					if (!pError)
					{
						// The compiler stores the compiled model in the fable context's Stricture property
						tmpResult = tmpStrictureContext.Stricture;
					}

					this.cleanupTempDir(tmpInputDir);
					this.cleanupTempDir(tmpOutputDir);
					return fCallback(pError, tmpResult);
				});
		}
		catch (pError)
		{
			this.cleanupTempDir(tmpInputDir);
			this.cleanupTempDir(tmpOutputDir);
			return fCallback(pError);
		}
	}

	/**
	 * Run a stricture generator function against a model and return the output files.
	 *
	 * Creates a fresh Fable context, sets up the model and indices,
	 * runs the generator, reads the output files, and cleans up.
	 *
	 * @param {function} pGeneratorFunction - The stricture generator function (e.g. require('stricture/source/Stricture-Generate-MySQL.js'))
	 * @param {Object} pModel - The compiled stricture model (Extended JSON format)
	 * @param {function} fCallback - Callback as fCallback(pError, pFiles)
	 */
	generateFromModel(pGeneratorFunction, pModel, fCallback)
	{
		if (!pModel || !pModel.Tables)
		{
			return fCallback(new Error('Model must include a Tables object.'));
		}

		let tmpOutputDir = this.createTempDir();

		try
		{
			// Create a fresh context with output settings
			let tmpStrictureContext = this._createStrictureContext(
				{
					InputFileName: 'unused',
					OutputLocation: tmpOutputDir + '/',
					OutputFileName: 'Model'
				});

			// Set up the model data that generators read from
			tmpStrictureContext.Model = pModel;
			tmpStrictureContext.ModelIndices = tmpStrictureContext.StrictureExtensions.GenerateIndexedTables(pModel);
			tmpStrictureContext.settings.ExtendedModel = pModel.hasOwnProperty('Authorization');

			// Generators are synchronous — they write files directly to OutputLocation
			pGeneratorFunction(tmpStrictureContext);

			let tmpFiles = this.readAllFiles(tmpOutputDir);
			this.cleanupTempDir(tmpOutputDir);
			return fCallback(null, tmpFiles);
		}
		catch (pError)
		{
			this.cleanupTempDir(tmpOutputDir);
			return fCallback(pError);
		}
	}

	/**
	 * Helper to register a generator endpoint route.
	 *
	 * Creates a POST endpoint at /1.0/Retold/Stricture/Generate/{pRouteSuffix}
	 * that accepts a model in the body and returns generated files.
	 *
	 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
	 * @param {string} pRouteSuffix - Route suffix (e.g. 'MySQL', 'Meadow')
	 * @param {function} pGeneratorFunction - The stricture generator function
	 */
	registerGenerateEndpoint(pOratorServiceServer, pRouteSuffix, pGeneratorFunction)
	{
		let tmpSelf = this;

		pOratorServiceServer.postWithBodyParser(`/1.0/Retold/Stricture/Generate/${pRouteSuffix}`,
			(pRequest, pResponse, fNext) =>
			{
				if (!pRequest.body || !pRequest.body.Model)
				{
					pResponse.send(400, { Error: 'Request body must include Model.' });
					return fNext();
				}

				tmpSelf.generateFromModel(pGeneratorFunction, pRequest.body.Model,
					(pError, pFiles) =>
					{
						if (pError)
						{
							pResponse.send(500, { Error: pError.message });
							return fNext();
						}
						pResponse.send(200, { Files: pFiles });
						return fNext();
					});
			});
	}

	/**
	 * Register all stricture REST routes on the Orator service server.
	 *
	 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
	 */
	connectRoutes(pOratorServiceServer)
	{
		// Load and register each command module
		require('./Stricture-Command-Compile.js')(this, pOratorServiceServer);
		require('./Stricture-Command-Generate-MySQL.js')(this, pOratorServiceServer);
		require('./Stricture-Command-Generate-MySQLMigrate.js')(this, pOratorServiceServer);
		require('./Stricture-Command-Generate-Meadow.js')(this, pOratorServiceServer);
		require('./Stricture-Command-Generate-Markdown.js')(this, pOratorServiceServer);
		require('./Stricture-Command-Generate-LaTeX.js')(this, pOratorServiceServer);
		require('./Stricture-Command-Generate-DictionaryCSV.js')(this, pOratorServiceServer);
		require('./Stricture-Command-Generate-ModelGraph.js')(this, pOratorServiceServer);
		require('./Stricture-Command-Generate-AuthorizationChart.js')(this, pOratorServiceServer);
		require('./Stricture-Command-Generate-Pict.js')(this, pOratorServiceServer);
		require('./Stricture-Command-Generate-TestObjectContainers.js')(this, pOratorServiceServer);

		this.fable.log.info('Retold Data Service Stricture routes registered.');
	}
}

module.exports = RetoldDataServiceStricture;
module.exports.serviceType = 'RetoldDataServiceStricture';
module.exports.default_configuration = {};
