/**
 * Example Application: Data Cloner
 *
 * Clones a remote retold-based database to a local SQLite database.
 * Demonstrates retold-data-service, pict-sessionmanager, meadow-integration
 * (clone sync services), and meadow-migrationmanager working together.
 *
 * Flow:
 *   1. Configure and authenticate a remote session (cookie mode)
 *   2. Fetch the remote schema (model definition)
 *   3. Deploy selected tables to local SQLite
 *   4. Synchronize data via meadow-integration's MeadowSync
 *
 * Available endpoints:
 *   /clone/                                 Web UI
 *   /clone/session/configure       POST     Configure remote session
 *   /clone/session/authenticate    POST     Authenticate
 *   /clone/session/check           GET      Check session
 *   /clone/session/deauthenticate  POST     Deauthenticate
 *   /clone/schema/fetch            POST     Fetch remote schema
 *   /clone/schema                  GET      Get fetched schema
 *   /clone/schema/deploy           POST     Deploy tables to local DB
 *   /clone/sync/start              POST     Start data sync
 *   /clone/sync/status             GET      Get sync progress
 *   /clone/sync/stop               POST     Stop sync
 *   /meadow-migrationmanager/               Migration manager web UI
 *   /meadow-migrationmanager/api/*          Migration manager API
 *   Per-entity CRUD (after deploy)          /1.0/{Entity}s, etc.
 *
 * Usage:
 *   cd example_applications/data-cloner
 *   npm install
 *   node data-cloner.js
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFable = require('fable');
const libPict = require('pict');
const libPictSessionManager = require('pict-sessionmanager');
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');
const libRetoldDataService = require('retold-data-service');

const libMeadowCloneRestClient = require('meadow-integration/source/services/clone/Meadow-Service-RestClient');
const libMeadowSync = require('meadow-integration/source/services/clone/Meadow-Service-Sync');

const libFs = require('fs');
const libPath = require('path');

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
				SQLiteFilePath: libPath.join(__dirname, 'data', 'cloned.sqlite')
			}
	});

// Ensure the data directory exists
let _DataDir = libPath.join(__dirname, 'data');
if (!libFs.existsSync(_DataDir))
{
	libFs.mkdirSync(_DataDir, { recursive: true });
}

let _Fable = new libFable(_Settings);

// ================================================================
// Session Manager (separate Pict instance for remote auth)
// ================================================================

let _Pict = new libPict(
	{
		Product: 'DataClonerSession',
		TraceLog: true,
		LogStreams:
			[
				{
					streamtype: 'console'
				}
			]
	});

_Pict.serviceManager.addServiceType('SessionManager', libPictSessionManager);
_Pict.serviceManager.instantiateServiceProvider('SessionManager');

// ================================================================
// Cloner State
// ================================================================

let _CloneState = (
	{
		// Remote session configuration
		SessionConfigured: false,
		SessionAuthenticated: false,
		RemoteServerURL: '',

		// Fetched remote schema
		RemoteSchema: false,
		RemoteModelObject: false,

		// Sync progress
		SyncRunning: false,
		SyncStopping: false,
		SyncProgress: {},

		// Per-table REST error counters (set up during sync)
		SyncRESTErrors: {}
	});

// ================================================================
// SQLite Setup
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

		// Set default Meadow provider to SQLite so all Meadow DAL instances
		// created by MeadowSync will use the SQLite connection automatically.
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
						MigrationManagerWebUI: true
					}
			});

		// Enable JSON body parsing for POST/PUT requests
		tmpDataService.onBeforeInitialize = (fCallback) =>
		{
			_Fable.OratorServiceServer.server.use(_Fable.OratorServiceServer.bodyParser());
			return fCallback();
		};

		// ================================================================
		// Custom /clone/* Endpoints
		// ================================================================

		tmpDataService.onAfterInitialize = (fCallback) =>
		{
			let tmpServer = _Fable.OratorServiceServer;

			// ---- Web UI ----

			let tmpHTMLPath = libPath.join(__dirname, 'data-cloner-web.html');
			tmpServer.get('/clone/',
				(pRequest, pResponse, fNext) =>
				{
					try
					{
						let tmpHTML = libFs.readFileSync(tmpHTMLPath, 'utf8');
						pResponse.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
						pResponse.write(tmpHTML);
						pResponse.end();
					}
					catch (pReadError)
					{
						pResponse.send(500, { Success: false, Error: 'Failed to load web UI.' });
					}
					return fNext();
				});

			tmpServer.get('/clone',
				(pRequest, pResponse, fNext) =>
				{
					pResponse.redirect('/clone/', fNext);
				});

			// ---- Session Management ----

			// POST /clone/session/configure
			tmpServer.post('/clone/session/configure',
				(pRequest, pResponse, fNext) =>
				{
					let tmpBody = pRequest.body || {};
					let tmpServerURL = tmpBody.ServerURL;

					if (!tmpServerURL)
					{
						pResponse.send(400, { Success: false, Error: 'ServerURL is required.' });
						return fNext();
					}

					_CloneState.RemoteServerURL = tmpServerURL;

					// Remove existing session if reconfiguring
					if (_Pict.SessionManager.getSession('Remote'))
					{
						_Pict.SessionManager.deauthenticate('Remote');
						// Remove the old session by clearing and re-adding
						delete _Pict.SessionManager.sessions['Remote'];
					}

					// Extract domain from ServerURL for cookie matching
					let tmpDomainMatch = tmpBody.DomainMatch;
					if (!tmpDomainMatch)
					{
						try
						{
							let tmpURL = new URL(tmpServerURL);
							tmpDomainMatch = tmpURL.hostname;
						}
						catch (pParseError)
						{
							tmpDomainMatch = tmpServerURL;
						}
					}

					// Helper: ensure a URI template is fully qualified with the server URL
					let fQualifyURI = (pTemplate, pDefault) =>
					{
						if (!pTemplate)
						{
							return tmpServerURL + pDefault;
						}
						// If the template starts with '/' it is a relative path -- prepend the server URL
						if (pTemplate.charAt(0) === '/')
						{
							return tmpServerURL + pTemplate;
						}
						return pTemplate;
					};

					let tmpSessionConfig = (
						{
							Type: 'Cookie',

							// Authentication
							AuthenticationMethod: tmpBody.AuthenticationMethod || 'get',
							AuthenticationURITemplate: fQualifyURI(tmpBody.AuthenticationURITemplate, '/1.0/Authenticate/{~D:Record.UserName~}/{~D:Record.Password~}'),
							AuthenticationRetryCount: 2,
							AuthenticationRetryDebounce: 200,

							// Session check
							CheckSessionURITemplate: fQualifyURI(tmpBody.CheckSessionURITemplate, '/1.0/CheckSession'),
							CheckSessionLoginMarkerType: tmpBody.CheckSessionLoginMarkerType || 'boolean',
							CheckSessionLoginMarker: tmpBody.CheckSessionLoginMarker || 'LoggedIn',

							// Cookie injection
							DomainMatch: tmpDomainMatch,
							CookieName: tmpBody.CookieName || 'SessionID',
							CookieValueAddress: tmpBody.CookieValueAddress || 'SessionID',
							CookieValueTemplate: tmpBody.CookieValueTemplate || false
						});

					// If authentication is POST-based, set up the request body template
					if (tmpBody.AuthenticationMethod === 'post')
					{
						tmpSessionConfig.AuthenticationRequestBody = tmpBody.AuthenticationRequestBody || (
							{
								username: '{~D:Record.UserName~}',
								password: '{~D:Record.Password~}'
							});
					}

					_Pict.SessionManager.addSession('Remote', tmpSessionConfig);
					_Pict.SessionManager.connectToRestClient();

					_CloneState.SessionConfigured = true;
					_CloneState.SessionAuthenticated = false;

					_Fable.log.info(`Data Cloner: Session configured for ${tmpServerURL} (domain: ${tmpDomainMatch})`);

					pResponse.send(200,
						{
							Success: true,
							ServerURL: tmpServerURL,
							DomainMatch: tmpDomainMatch,
							AuthenticationMethod: tmpSessionConfig.AuthenticationMethod
						});
					return fNext();
				});

			// POST /clone/session/authenticate
			tmpServer.post('/clone/session/authenticate',
				(pRequest, pResponse, fNext) =>
				{
					if (!_CloneState.SessionConfigured)
					{
						pResponse.send(400, { Success: false, Error: 'Session not configured. Call POST /clone/session/configure first.' });
						return fNext();
					}

					let tmpBody = pRequest.body || {};
					let tmpCredentials = (
						{
							UserName: tmpBody.UserName || tmpBody.username,
							Password: tmpBody.Password || tmpBody.password
						});

					if (!tmpCredentials.UserName || !tmpCredentials.Password)
					{
						pResponse.send(400, { Success: false, Error: 'UserName and Password are required.' });
						return fNext();
					}

					_Fable.log.info(`Data Cloner: Authenticating as ${tmpCredentials.UserName}...`);

					_Pict.SessionManager.authenticate('Remote', tmpCredentials,
						(pAuthError, pSessionState) =>
						{
							if (pAuthError)
							{
								_Fable.log.error(`Data Cloner: Authentication failed: ${pAuthError.message || pAuthError}`);
								_CloneState.SessionAuthenticated = false;
								pResponse.send(401,
									{
										Success: false,
										Error: `Authentication failed: ${pAuthError.message || pAuthError}`
									});
								return fNext();
							}

							_CloneState.SessionAuthenticated = pSessionState && pSessionState.Authenticated;

							_Fable.log.info(`Data Cloner: Authentication ${_CloneState.SessionAuthenticated ? 'succeeded' : 'failed'}.`);

							pResponse.send(200,
								{
									Success: _CloneState.SessionAuthenticated,
									Authenticated: _CloneState.SessionAuthenticated,
									SessionData: pSessionState ? pSessionState.SessionData : {}
								});
							return fNext();
						});
				});

			// GET /clone/session/check
			tmpServer.get('/clone/session/check',
				(pRequest, pResponse, fNext) =>
				{
					if (!_CloneState.SessionConfigured)
					{
						pResponse.send(200,
							{
								Configured: false,
								Authenticated: false
							});
						return fNext();
					}

					_Pict.SessionManager.checkSession('Remote',
						(pCheckError, pAuthenticated, pCheckData) =>
						{
							_CloneState.SessionAuthenticated = pAuthenticated;

							pResponse.send(200,
								{
									Configured: _CloneState.SessionConfigured,
									Authenticated: pAuthenticated,
									ServerURL: _CloneState.RemoteServerURL,
									CheckData: pCheckData || {}
								});
							return fNext();
						});
				});

			// POST /clone/session/deauthenticate
			tmpServer.post('/clone/session/deauthenticate',
				(pRequest, pResponse, fNext) =>
				{
					if (_CloneState.SessionConfigured)
					{
						_Pict.SessionManager.deauthenticate('Remote');
					}
					_CloneState.SessionAuthenticated = false;

					_Fable.log.info('Data Cloner: Session deauthenticated.');

					pResponse.send(200, { Success: true, Authenticated: false });
					return fNext();
				});

			// ---- Schema Management ----

			// POST /clone/schema/fetch
			tmpServer.post('/clone/schema/fetch',
				(pRequest, pResponse, fNext) =>
				{
					let tmpBody = pRequest.body || {};
					let tmpSchemaURL = tmpBody.SchemaURL;

					if (!tmpSchemaURL)
					{
						// Default to the standard retold model endpoint
						if (_CloneState.RemoteServerURL)
						{
							tmpSchemaURL = _CloneState.RemoteServerURL + '/1.0/Retold/Models';
						}
						else
						{
							pResponse.send(400, { Success: false, Error: 'SchemaURL is required (or configure a session first).' });
							return fNext();
						}
					}

					_Fable.log.info(`Data Cloner: Fetching remote schema from ${tmpSchemaURL}...`);

					_Pict.RestClient.getJSON(tmpSchemaURL,
						(pError, pHTTPResponse, pData) =>
						{
							if (pError)
							{
								_Fable.log.error(`Data Cloner: Schema fetch error: ${pError.message || pError}`);
								pResponse.send(500, { Success: false, Error: `Schema fetch error: ${pError.message || pError}` });
								return fNext();
							}

							if (!pHTTPResponse || pHTTPResponse.statusCode !== 200)
							{
								let tmpStatus = pHTTPResponse ? pHTTPResponse.statusCode : 'unknown';
								_Fable.log.error(`Data Cloner: Schema fetch returned HTTP ${tmpStatus} — body: ${JSON.stringify(pData)}`);
								pResponse.send(500, { Success: false, Error: `Schema fetch returned HTTP ${tmpStatus}` });
								return fNext();
							}

							_CloneState.RemoteSchema = pData;
							_CloneState.RemoteModelObject = pData;

							// Extract table names for the UI
							let tmpTableNames = [];
							if (pData && pData.Tables)
							{
								tmpTableNames = Object.keys(pData.Tables);
							}

							_Fable.log.info(`Data Cloner: Fetched schema with ${tmpTableNames.length} tables: [${tmpTableNames.join(', ')}]`);

							pResponse.send(200,
								{
									Success: true,
									SchemaURL: tmpSchemaURL,
									TableCount: tmpTableNames.length,
									Tables: tmpTableNames
								});
							return fNext();
						});
				});

			// GET /clone/schema
			tmpServer.get('/clone/schema',
				(pRequest, pResponse, fNext) =>
				{
					if (!_CloneState.RemoteSchema)
					{
						pResponse.send(200, { Fetched: false, Tables: [] });
						return fNext();
					}

					let tmpTableNames = [];
					if (_CloneState.RemoteSchema.Tables)
					{
						tmpTableNames = Object.keys(_CloneState.RemoteSchema.Tables);
					}

					pResponse.send(200,
						{
							Fetched: true,
							TableCount: tmpTableNames.length,
							Tables: tmpTableNames
						});
					return fNext();
				});

			// POST /clone/reset — Delete the local SQLite database and start fresh
			tmpServer.post('/clone/reset',
				(pRequest, pResponse, fNext) =>
				{
					let tmpSQLitePath = _Settings.SQLite.SQLiteFilePath;
					_Fable.log.info(`Data Cloner: Resetting local database [${tmpSQLitePath}]...`);

					try
					{
						// Close the existing SQLite connection and reset the provider state
						if (_Fable.MeadowSQLiteProvider)
						{
							if (_Fable.MeadowSQLiteProvider._database)
							{
								_Fable.MeadowSQLiteProvider._database.close();
							}
							// Reset the connected flag so connectAsync will re-open
							_Fable.MeadowSQLiteProvider.connected = false;
						}
					}
					catch (pCloseError)
					{
						_Fable.log.warn(`Data Cloner: Error closing SQLite connection: ${pCloseError}`);
					}

					try
					{
						// Delete the database file
						if (libFs.existsSync(tmpSQLitePath))
						{
							libFs.unlinkSync(tmpSQLitePath);
							_Fable.log.info('Data Cloner: SQLite database file deleted.');
						}
					}
					catch (pDeleteError)
					{
						_Fable.log.error(`Data Cloner: Error deleting SQLite file: ${pDeleteError}`);
						pResponse.send(500, { Success: false, Error: `Failed to delete database: ${pDeleteError}` });
						return fNext();
					}

					// Reconnect to create a fresh database
					_Fable.MeadowSQLiteProvider.connectAsync(
						(pReconnectError) =>
						{
							if (pReconnectError)
							{
								_Fable.log.error(`Data Cloner: Error reconnecting SQLite: ${pReconnectError}`);
								pResponse.send(500, { Success: false, Error: `Failed to reconnect: ${pReconnectError}` });
								return fNext();
							}

							// Clear sync state
							_CloneState.SyncProgress = {};
							_CloneState.SyncRESTErrors = {};

							_Fable.log.info('Data Cloner: Database reset complete — fresh SQLite file ready.');

							pResponse.send(200, { Success: true, Message: 'Database reset. Deploy a schema to recreate tables.' });
							return fNext();
						});
				});

			// POST /clone/schema/deploy
			tmpServer.post('/clone/schema/deploy',
				(pRequest, pResponse, fNext) =>
				{
					if (!_CloneState.RemoteModelObject)
					{
						pResponse.send(400, { Success: false, Error: 'No schema fetched. Call POST /clone/schema/fetch first.' });
						return fNext();
					}

					let tmpBody = pRequest.body || {};
					let tmpSelectedTables = tmpBody.Tables || null;

					let tmpFullModel = _CloneState.RemoteModelObject;

					// Build a filtered model with ONLY the selected tables.
					// Avoid deep-cloning the entire remote model (can be huge).
					let tmpFilteredTables = {};
					let tmpFilteredSequence = [];
					let tmpSourceTables = tmpFullModel.Tables || {};

					if (tmpSelectedTables && Array.isArray(tmpSelectedTables) && tmpSelectedTables.length > 0)
					{
						for (let i = 0; i < tmpSelectedTables.length; i++)
						{
							let tmpTableName = tmpSelectedTables[i];
							if (tmpSourceTables[tmpTableName])
							{
								tmpFilteredTables[tmpTableName] = tmpSourceTables[tmpTableName];
								tmpFilteredSequence.push(tmpTableName);
							}
						}
					}
					else
					{
						// No selection — use all tables
						tmpFilteredTables = tmpSourceTables;
						tmpFilteredSequence = Object.keys(tmpSourceTables);
					}

					let tmpModelObject = { Tables: tmpFilteredTables, TablesSequence: tmpFilteredSequence };

					let tmpTableNames = Object.keys(tmpModelObject.Tables || {});
					_Fable.log.info(`Data Cloner: Deploying ${tmpTableNames.length} tables to local SQLite: [${tmpTableNames.join(', ')}]`);

					// ---- Set up MeadowCloneRestClient ----
					// Bridge remote data fetching to pict-sessionmanager's
					// authenticated RestClient so session cookies are injected.
					if (!_Fable.MeadowCloneRestClient)
					{
						_Fable.serviceManager.instantiateServiceProvider('MeadowCloneRestClient',
							{
								ServerURL: _CloneState.RemoteServerURL + '/1.0/'
							});
					}
					else
					{
						// Update the server URL if reconfigured
						_Fable.MeadowCloneRestClient.serverURL = _CloneState.RemoteServerURL + '/1.0/';
					}

					// Override getJSON to delegate through pict-sessionmanager's
					// RestClient, which already handles cookie injection & domain matching.
					// Also adds debug logging and error tracking per entity.
					_Fable.MeadowCloneRestClient.getJSON = (pURL, fCallback) =>
					{
						let tmpFullURL = _Fable.MeadowCloneRestClient.serverURL + pURL;
						_Fable.log.trace(`Data Cloner: [REST] GET ${tmpFullURL}`);

						// Extract the entity name from the URL for error tracking
						// URLs look like: "Customer/Max/IDCustomer" or "Customers/FilteredTo/..."
						let tmpEntityHint = pURL.split('/')[0].replace(/s$/, '');

						_Pict.RestClient.getJSON(tmpFullURL,
							(pError, pResponse, pBody) =>
							{
								if (pError)
								{
									_Fable.log.error(`Data Cloner: [REST] Error for ${pURL}: ${pError}`);
									if (_CloneState.SyncRESTErrors[tmpEntityHint] !== undefined)
									{
										_CloneState.SyncRESTErrors[tmpEntityHint]++;
									}
								}
								else
								{
									let tmpIsArray = Array.isArray(pBody);
									let tmpPreview = tmpIsArray ? `Array[${pBody.length}]` : (pBody ? `${typeof(pBody)}:${JSON.stringify(pBody).substring(0, 200)}` : 'null/undefined');
									_Fable.log.info(`Data Cloner: [REST] Response for ${pURL}: ${tmpPreview}`);

									// Track when the server returns a non-array for list endpoints
									// (FilteredTo, Count, etc.) — this usually indicates an auth or permission error
									if (pURL.indexOf('FilteredTo') > -1 && !tmpIsArray)
									{
										_Fable.log.warn(`Data Cloner: [REST] FilteredTo response for ${tmpEntityHint} is NOT an array — expected Array, got ${typeof(pBody)}`);
										if (_CloneState.SyncRESTErrors[tmpEntityHint] !== undefined)
										{
											_CloneState.SyncRESTErrors[tmpEntityHint]++;
										}
									}
								}
								return fCallback(pError, pResponse, pBody);
							});
					};

					// ---- Set up MeadowSync ----
					// MeadowSync.loadMeadowSchema handles:
					//   1. Creating a MeadowSyncEntityInitial per table
					//   2. Each entity's initialize() calls createTable via
					//      Meadow.provider.getProvider().createTable()
					//   3. Index creation (skips gracefully when no ConnectionManager)
					// This replaces manual createTables/createAllIndices calls.

					// MeadowSync constructor reads ProgramConfiguration for sync settings.
					// Ensure it exists so the hasOwnProperty checks don't fail.
					if (!_Fable.ProgramConfiguration)
					{
						_Fable.ProgramConfiguration = {};
					}

					_Fable.serviceManager.instantiateServiceProvider('MeadowSync',
						{
							SyncEntityList: tmpTableNames,
							PageSize: 100
						});

					// Load the schema into MeadowSync — this creates a
					// MeadowSyncEntityInitial for each entity with a Meadow DAL
					// connected to our SQLite provider, and creates the tables.
					_Fable.MeadowSync.loadMeadowSchema(tmpModelObject,
						(pSyncInitError) =>
						{
							if (pSyncInitError)
							{
								_Fable.log.warn(`Data Cloner: MeadowSync schema init warning: ${pSyncInitError}`);
							}

							let tmpInitializedEntities = Object.keys(_Fable.MeadowSync.MeadowSyncEntities);
							_Fable.log.info(`Data Cloner: MeadowSync initialized ${tmpInitializedEntities.length} sync entities: [${tmpInitializedEntities.join(', ')}]`);

							// ---- Instrument sync entity DAL operations ----
							// Wrap each entity's Meadow doRead/doCreate so we can trace
							// exactly what happens to each record during sync.
							for (let e = 0; e < tmpInitializedEntities.length; e++)
							{
								let tmpEntityName = tmpInitializedEntities[e];
								let tmpSyncEntity = _Fable.MeadowSync.MeadowSyncEntities[tmpEntityName];

								if (tmpSyncEntity && tmpSyncEntity.Meadow)
								{
									let tmpEntityMeadow = tmpSyncEntity.Meadow;

									// Wrap doRead
									let tmpOriginalDoRead = tmpEntityMeadow.doRead.bind(tmpEntityMeadow);
									tmpEntityMeadow.doRead = (pQuery, fCallback) =>
									{
										tmpOriginalDoRead(pQuery,
											(pError, pQuery, pRecord) =>
											{
												if (pError)
												{
													_Fable.log.info(`Data Cloner: [DAL] doRead ${tmpEntityName}: ERROR ${pError}`);
												}
												else
												{
													_Fable.log.info(`Data Cloner: [DAL] doRead ${tmpEntityName}: found=${!!pRecord} (type=${typeof(pRecord)})`);
												}
												return fCallback(pError, pQuery, pRecord);
											});
									};

									// Wrap doCreate
									let tmpOriginalDoCreate = tmpEntityMeadow.doCreate.bind(tmpEntityMeadow);
									tmpEntityMeadow.doCreate = (pQuery, fCallback) =>
									{
										tmpOriginalDoCreate(pQuery,
											(pError, pQuery, pRecord) =>
											{
												if (pError)
												{
													_Fable.log.info(`Data Cloner: [DAL] doCreate ${tmpEntityName}: ERROR ${pError}`);
												}
												else
												{
													let tmpID = pRecord ? pRecord[tmpSyncEntity.DefaultIdentifier] : '?';
													_Fable.log.info(`Data Cloner: [DAL] doCreate ${tmpEntityName}: success ID=${tmpID}`);
												}
												return fCallback(pError, pQuery, pRecord);
											});
									};
								}
							}

							_Fable.log.info(`Data Cloner: Loading model for CRUD endpoints...`);

							// Load the filtered model so CRUD endpoints are available
							_Fable.RetoldDataServiceMeadowEndpoints.loadModel('RemoteClone', tmpModelObject, 'SQLite',
								(pLoadError) =>
								{
									if (pLoadError)
									{
										_Fable.log.error(`Data Cloner: Model load error: ${pLoadError}`);
									}
									else
									{
										_Fable.log.info(`Data Cloner: CRUD endpoints available for: [${tmpTableNames.join(', ')}]`);
									}

									pResponse.send(200,
										{
											Success: true,
											TablesDeployed: tmpTableNames,
											SyncEntities: tmpInitializedEntities,
											Message: `${tmpInitializedEntities.length} / ${tmpTableNames.length} tables deployed. meadow-integration sync ready.`
										});
									return fNext();
								});
						});
				});

			// ---- Data Synchronization ----

			// POST /clone/sync/start
			tmpServer.post('/clone/sync/start',
				(pRequest, pResponse, fNext) =>
				{
					if (_CloneState.SyncRunning)
					{
						pResponse.send(400, { Success: false, Error: 'Sync is already running.' });
						return fNext();
					}

					if (!_CloneState.RemoteServerURL)
					{
						pResponse.send(400, { Success: false, Error: 'No remote server configured.' });
						return fNext();
					}

					if (!_Fable.MeadowSync || !_Fable.MeadowSync.MeadowSyncEntities)
					{
						pResponse.send(400, { Success: false, Error: 'No sync entities available. Deploy a schema first.' });
						return fNext();
					}

					let tmpBody = pRequest.body || {};
					let tmpSelectedTables = tmpBody.Tables || [];

					// If no tables specified, sync all entities that MeadowSync knows about
					if (tmpSelectedTables.length === 0)
					{
						tmpSelectedTables = _Fable.MeadowSync.SyncEntityList || Object.keys(_Fable.MeadowSync.MeadowSyncEntities);
					}

					if (tmpSelectedTables.length === 0)
					{
						pResponse.send(400, { Success: false, Error: 'No tables available for sync. Deploy a schema first.' });
						return fNext();
					}

					_Fable.log.info(`Data Cloner: Starting sync for ${tmpSelectedTables.length} tables via meadow-integration`);

					// Initialize progress tracking
					_CloneState.SyncRunning = true;
					_CloneState.SyncStopping = false;
					_CloneState.SyncProgress = {};
					_CloneState.SyncRESTErrors = {};

					for (let i = 0; i < tmpSelectedTables.length; i++)
					{
						_CloneState.SyncProgress[tmpSelectedTables[i]] = (
							{
								Status: 'Pending',
								Total: 0,
								Synced: 0,
								Errors: 0,
								StartTime: null,
								EndTime: null
							});
						_CloneState.SyncRESTErrors[tmpSelectedTables[i]] = 0;
					}

					// Start the sync process asynchronously
					fSyncTables(tmpSelectedTables);

					pResponse.send(200,
						{
							Success: true,
							Tables: tmpSelectedTables,
							Message: 'Sync started via meadow-integration.'
						});
					return fNext();
				});

			// GET /clone/sync/status
			tmpServer.get('/clone/sync/status',
				(pRequest, pResponse, fNext) =>
				{
					// Update progress from MeadowSync operation trackers
					if (_Fable.MeadowSync && _Fable.MeadowSync.MeadowSyncEntities)
					{
						let tmpEntityNames = Object.keys(_Fable.MeadowSync.MeadowSyncEntities);
						for (let i = 0; i < tmpEntityNames.length; i++)
						{
							let tmpEntityName = tmpEntityNames[i];
							let tmpProgress = _CloneState.SyncProgress[tmpEntityName];
							if (tmpProgress && (tmpProgress.Status === 'Syncing' || tmpProgress.Status === 'Pending'))
							{
								let tmpSyncEntity = _Fable.MeadowSync.MeadowSyncEntities[tmpEntityName];
								if (tmpSyncEntity && tmpSyncEntity.operation)
								{
									let tmpTracker = tmpSyncEntity.operation.progressTrackers[`FullSync-${tmpEntityName}`];
									if (tmpTracker)
									{
										tmpProgress.Total = tmpTracker.TotalCount || 0;
										tmpProgress.Synced = Math.max(tmpTracker.CurrentCount || 0, 0);
									}
								}
								// Include REST error count in real-time status
								let tmpRESTErrors = _CloneState.SyncRESTErrors[tmpEntityName] || 0;
								if (tmpRESTErrors > 0)
								{
									tmpProgress.Errors = tmpRESTErrors;
								}
							}
						}
					}

					pResponse.send(200,
						{
							Running: _CloneState.SyncRunning,
							Stopping: _CloneState.SyncStopping,
							Tables: _CloneState.SyncProgress
						});
					return fNext();
				});

			// POST /clone/sync/stop
			tmpServer.post('/clone/sync/stop',
				(pRequest, pResponse, fNext) =>
				{
					if (_CloneState.SyncRunning)
					{
						_CloneState.SyncStopping = true;
						_Fable.log.info('Data Cloner: Sync stop requested.');
					}

					pResponse.send(200, { Success: true, Message: 'Sync stop requested.' });
					return fNext();
				});

			_Fable.log.info('Data Cloner: Custom /clone/* endpoints registered.');
			return fCallback();
		};

		// ================================================================
		// Sync Engine (powered by meadow-integration)
		// ================================================================

		/**
		 * Synchronize data for a list of tables sequentially using
		 * meadow-integration's MeadowSyncEntityInitial service.
		 *
		 * Each entity's sync() method handles:
		 *   - Counting local vs remote records
		 *   - Paginated downloads via MeadowCloneRestClient
		 *   - Record marshaling (objects→JSON, DateTime normalization, etc.)
		 *   - Writing via Meadow DAL (doCreate with identity insert)
		 *
		 * @param {Array<string>} pTables - Table names to sync
		 */
		function fSyncTables(pTables)
		{
			let tmpTableIndex = 0;

			let fSyncNextTable = () =>
			{
				if (_CloneState.SyncStopping || tmpTableIndex >= pTables.length)
				{
					_CloneState.SyncRunning = false;
					_CloneState.SyncStopping = false;
					_Fable.log.info('Data Cloner: Sync complete.');
					return;
				}

				let tmpTableName = pTables[tmpTableIndex];
				tmpTableIndex++;

				let tmpProgress = _CloneState.SyncProgress[tmpTableName];
				if (!tmpProgress)
				{
					fSyncNextTable();
					return;
				}

				tmpProgress.Status = 'Syncing';
				tmpProgress.StartTime = new Date().toJSON();

				_Fable.log.info(`Data Cloner: Sync [${tmpTableName}] — starting via meadow-integration...`);

				// Use meadow-integration's sync entity
				_Fable.MeadowSync.syncEntity(tmpTableName,
					(pError) =>
					{
						// Extract final progress from the operation tracker.
						// NOTE: meadow-integration's sync() always calls fCallback()
						// without propagating errors, so pError will typically be
						// undefined even when errors occurred. We detect issues via
						// the progress tracker and our REST error counters.
						let tmpSyncEntity = _Fable.MeadowSync.MeadowSyncEntities[tmpTableName];
						if (tmpSyncEntity && tmpSyncEntity.operation)
						{
							let tmpTracker = tmpSyncEntity.operation.progressTrackers[`FullSync-${tmpTableName}`];
							if (tmpTracker)
							{
								tmpProgress.Total = tmpTracker.TotalCount || 0;
								tmpProgress.Synced = Math.max(tmpTracker.CurrentCount || 0, 0);
							}
						}

						// Incorporate REST-level errors tracked by our getJSON override
						let tmpRESTErrors = _CloneState.SyncRESTErrors[tmpTableName] || 0;
						tmpProgress.Errors = tmpRESTErrors;

						// Calculate how many records were expected but not synced
						// (due to GUID conflicts, create errors, etc.)
						let tmpMissing = tmpProgress.Total - tmpProgress.Synced;

						if (pError)
						{
							_Fable.log.error(`Data Cloner: Error syncing [${tmpTableName}]: ${pError}`);
							tmpProgress.Status = 'Error';
							tmpProgress.ErrorMessage = `${pError}`;
						}
						else if (tmpRESTErrors > 0)
						{
							// REST errors occurred (timeouts, auth failures, non-array responses)
							tmpProgress.Status = 'Error';
							tmpProgress.ErrorMessage = `${tmpRESTErrors} REST error(s) during sync`;
							_Fable.log.warn(`Data Cloner: Sync [${tmpTableName}] — completed with ${tmpRESTErrors} REST error(s). ${tmpProgress.Synced}/${tmpProgress.Total} records synced.`);
						}
						else if (tmpProgress.Total > 0 && tmpMissing > 0)
						{
							// Some records were expected but not created
							// (GUID conflicts, other Meadow create errors)
							tmpProgress.Status = 'Partial';
							tmpProgress.Skipped = tmpMissing;
							_Fable.log.warn(`Data Cloner: Sync [${tmpTableName}] — partial. ${tmpProgress.Synced}/${tmpProgress.Total} records synced, ${tmpMissing} skipped (GUID conflicts or other errors).`);
						}
						else
						{
							tmpProgress.Status = 'Complete';
							_Fable.log.info(`Data Cloner: Sync [${tmpTableName}] — complete. ${tmpProgress.Synced}/${tmpProgress.Total} records synced.`);
						}
						tmpProgress.EndTime = new Date().toJSON();

						// Continue to next table regardless of error
						fSyncNextTable();
					});
			};

			fSyncNextTable();
		}

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
			});
	});
