#!/usr/bin/env node
/**
 * Retold Data Cloner — CLI Entry Point
 *
 * Starts a retold-data-service instance with the DataCloner execution mode enabled.
 * Supports both a web UI for interactive cloning and a headless pipeline mode
 * (--config + --run) for automated cloning.
 *
 * Usage:
 *   retold-data-clone                           Start web UI only
 *   retold-data-clone --config <path> --run      Headless clone from config file
 *   retold-data-clone --config-json '{}' --run   Headless clone from inline JSON
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFable = require('fable');
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');
const libRetoldDataService = require('../source/Retold-Data-Service.js');

const libMeadowCloneRestClient = require('meadow-integration/source/services/clone/Meadow-Service-RestClient');
const libMeadowSync = require('meadow-integration/source/services/clone/Meadow-Service-Sync');

const libFs = require('fs');
const libPath = require('path');

// ================================================================
// CLI Arguments
// ================================================================

let _CLIConfig = null;
let _CLIRunHeadless = false;
let _CLILogPath = null;
let _CLIMaxRecords = 0;
let _CLISchemaPath = null;

for (let i = 2; i < process.argv.length; i++)
{
	if ((process.argv[i] === '--config' || process.argv[i] === '-c') && process.argv[i + 1])
	{
		let tmpConfigPath = libPath.resolve(process.argv[i + 1]);
		try
		{
			let tmpRaw = libFs.readFileSync(tmpConfigPath, 'utf8');
			_CLIConfig = JSON.parse(tmpRaw);
			console.log(`Data Cloner: Loaded config from ${tmpConfigPath}`);
		}
		catch (pConfigError)
		{
			console.error(`Data Cloner: Failed to load config from ${tmpConfigPath}: ${pConfigError.message}`);
			process.exit(1);
		}
		i++;
	}
	else if (process.argv[i] === '--config-json' && process.argv[i + 1])
	{
		try
		{
			_CLIConfig = JSON.parse(process.argv[i + 1]);
			console.log('Data Cloner: Loaded config from inline JSON');
		}
		catch (pParseError)
		{
			console.error(`Data Cloner: Failed to parse inline JSON: ${pParseError.message}`);
			process.exit(1);
		}
		i++;
	}
	else if (process.argv[i] === '--run' || process.argv[i] === '-r')
	{
		_CLIRunHeadless = true;
	}
	else if ((process.argv[i] === '--port' || process.argv[i] === '-p') && process.argv[i + 1])
	{
		process.env.PORT = process.argv[i + 1];
		i++;
	}
	else if (process.argv[i] === '--log' || process.argv[i] === '-l')
	{
		if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-'))
		{
			_CLILogPath = libPath.resolve(process.argv[i + 1]);
			i++;
		}
		else
		{
			_CLILogPath = `${process.cwd()}/DataCloner-Run-${libFable.generateFileNameDateStamp()}.log`;
		}
	}
	else if ((process.argv[i] === '--max' || process.argv[i] === '-m') && process.argv[i + 1])
	{
		_CLIMaxRecords = parseInt(process.argv[i + 1], 10) || 0;
		i++;
	}
	else if ((process.argv[i] === '--schema' || process.argv[i] === '-s') && process.argv[i + 1])
	{
		_CLISchemaPath = libPath.resolve(process.argv[i + 1]);
		i++;
	}
	else if (process.argv[i] === '--help' || process.argv[i] === '-h')
	{
		console.log(`
Retold Data Cloner

Usage:
  retold-data-clone                           Start web UI only
  retold-data-clone --config <path> --run      Headless clone from config file
  retold-data-clone --config-json '{}' --run   Headless clone from inline JSON

Options:
  --config, -c <path>      Path to a JSON config file (generate from the web UI)
  --config-json <json>     Inline JSON config string (for one-liner commands)
  --run, -r                Auto-run the clone pipeline (requires --config or --config-json)
  --port, -p <port>        Override the API server port (default: 8095)
  --log, -l [path]         Write log output to a file (default: ./DataCloner-Run-<timestamp>.log)
  --max, -m <n>            Limit sync to first n records per entity (for testing)
  --schema, -s <path>      Path to a local schema JSON file (skip remote schema fetch)
  --help, -h               Show this help
`);
		process.exit(0);
	}
}

if (_CLIRunHeadless && !_CLIConfig)
{
	console.error('Data Cloner: --run requires --config <path> or --config-json <json>');
	process.exit(1);
}

// ================================================================
// Configuration
// ================================================================

let _Settings = (
	{
		Product: 'RetoldDataCloner',
		ProductVersion: '1.0.0',
		APIServerPort: parseInt(process.env.PORT, 10) || 8095,
		LogStreams:
			[
				{
					streamtype: 'console'
				}
			],

		SQLite:
			{
				SQLiteFilePath: libPath.join(process.cwd(), 'data', 'cloned.sqlite')
			}
	});

if (_CLILogPath)
{
	_Settings.LogStreams.push(
		{
			loggertype: 'simpleflatfile',
			outputloglinestoconsole: false,
			showtimestamps: true,
			formattedtimestamps: true,
			level: 'trace',
			path: _CLILogPath
		});
}

// Ensure the data directory exists
let _DataDir = libPath.join(process.cwd(), 'data');
if (!libFs.existsSync(_DataDir))
{
	libFs.mkdirSync(_DataDir, { recursive: true });
}

let _Fable = new libFable(_Settings);

// ================================================================
// SQLite Setup (default — connects automatically)
// ================================================================

_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

_Fable.MeadowSQLiteProvider.connectAsync(
	(pError) =>
	{
		if (pError)
		{
			_Fable.log.error(`SQLite connection error: ${pError}`);
			process.exit(1);
		}

		// Set default Meadow provider to SQLite
		_Fable.settings.MeadowProvider = 'SQLite';

		// Register meadow-integration services for clone sync
		_Fable.serviceManager.addServiceType('MeadowCloneRestClient', libMeadowCloneRestClient);
		_Fable.serviceManager.addServiceType('MeadowSync', libMeadowSync);

		_Fable.serviceManager.addServiceType('RetoldDataService', libRetoldDataService);
		let tmpDataService = _Fable.serviceManager.instantiateServiceProvider('RetoldDataService',
			{
				StorageProvider: 'SQLite',
				StorageProviderModule: 'meadow-connection-sqlite',

				// No default schema — models loaded at runtime after fetch
				FullMeadowSchemaFilename: false,

				Endpoints:
					{
						ConnectionManager: true,
						ModelManagerWrite: true,
						Stricture: false,
						MeadowIntegration: false,
						MeadowEndpoints: true,
						MigrationManager: true,
						MigrationManagerWebUI: true,
						DataCloner: true,
						DataClonerWebUI: true
					}
			});

		// Enable JSON body parsing for POST/PUT requests
		tmpDataService.onBeforeInitialize = (fCallback) =>
		{
			_Fable.OratorServiceServer.server.use(_Fable.OratorServiceServer.bodyParser());
			return fCallback();
		};

		// Update the DataCloner clone state with the SQLite connection info
		tmpDataService.onAfterInitialize = (fCallback) =>
		{
			let tmpClonerService = _Fable.RetoldDataServiceDataCloner;
			if (tmpClonerService)
			{
				tmpClonerService.cloneState.ConnectionProvider = 'SQLite';
				tmpClonerService.cloneState.ConnectionConnected = true;
				tmpClonerService.cloneState.ConnectionConfig = _Settings.SQLite;
			}
			return fCallback();
		};

		// ================================================================
		// Start the service
		// ================================================================

		tmpDataService.initializeService(
			(pInitError) =>
			{
				if (pInitError)
				{
					_Fable.log.error(`Initialization error: ${pInitError}`);
					process.exit(1);
				}
				_Fable.log.info(`Data Cloner running on port ${_Settings.APIServerPort}`);
				_Fable.log.info(`Web UI:          http://localhost:${_Settings.APIServerPort}/clone/`);
				_Fable.log.info(`Migration Mgr:   http://localhost:${_Settings.APIServerPort}/meadow-migrationmanager/`);

				// ---- Headless auto-run from config file ----
				if (_CLIConfig && _CLIRunHeadless)
				{
					_Fable.RetoldDataServiceDataCloner.runHeadlessPipeline(_CLIConfig,
						{
							logPath: _CLILogPath,
							maxRecords: _CLIMaxRecords,
							schemaPath: _CLISchemaPath,
							serverPort: _Settings.APIServerPort
						},
						(pPipelineError) =>
						{
							if (pPipelineError)
							{
								_Fable.log.error(`Pipeline error: ${pPipelineError}`);
								process.exit(1);
							}
							process.exit(0);
						});
				}
			});
	});
