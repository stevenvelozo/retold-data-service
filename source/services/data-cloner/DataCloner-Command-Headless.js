/**
 * DataCloner Headless Pipeline
 *
 * Runs the full clone pipeline non-interactively from a config object:
 * connect DB → configure session → authenticate → fetch schema → deploy → sync.
 *
 * @param {Object} pDataClonerService - The RetoldDataServiceDataCloner instance
 * @param {Object} pConfig - Parsed config from the JSON file
 * @param {Object} pCLIOptions - CLI options { logPath, maxRecords, schemaPath, serverPort }
 * @param {function} fCallback - (pError)
 */
module.exports = (pDataClonerService, pConfig, pCLIOptions, fCallback) =>
{
	let tmpFable = pDataClonerService.fable;
	let tmpCloneState = pDataClonerService.cloneState;

	let libFs = require('fs');
	let libPath = require('path');

	pConfig = pDataClonerService.normalizeConfig(pConfig);

	// CLI --schema overrides config SchemaPath
	if (pCLIOptions && pCLIOptions.schemaPath)
	{
		pConfig.SchemaPath = pCLIOptions.schemaPath;
	}

	let tmpMaxRecords = (pCLIOptions && pCLIOptions.maxRecords) || 0;

	tmpFable.log.info('Data Cloner: Starting headless pipeline...');

	let tmpHttp = require('http');
	let tmpServerPort = (pCLIOptions && pCLIOptions.serverPort) || tmpFable.settings.APIServerPort || 8095;
	let tmpBaseURL = `http://localhost:${tmpServerPort}`;

	// Simple helper to POST JSON to our own server
	let fPost = (pPath, pBody, fPostCallback) =>
	{
		let tmpPayload = JSON.stringify(pBody);
		let tmpURL = new URL(tmpBaseURL + pPath);
		let tmpOpts = (
			{
				hostname: tmpURL.hostname,
				port: tmpURL.port,
				path: tmpURL.pathname,
				method: 'POST',
				headers:
					{
						'Content-Type': 'application/json',
						'Content-Length': Buffer.byteLength(tmpPayload)
					}
			});

		let tmpReq = tmpHttp.request(tmpOpts,
			(pRes) =>
			{
				let tmpChunks = [];
				pRes.on('data', (pChunk) => tmpChunks.push(pChunk));
				pRes.on('end', () =>
				{
					try
					{
						let tmpData = JSON.parse(Buffer.concat(tmpChunks).toString());
						return fPostCallback(null, tmpData);
					}
					catch (pParseError)
					{
						return fPostCallback(pParseError);
					}
				});
			});
		tmpReq.on('error', fPostCallback);
		tmpReq.write(tmpPayload);
		tmpReq.end();
	};

	// Simple helper to GET JSON from our own server
	let fGet = (pPath, fGetCallback) =>
	{
		tmpHttp.get(tmpBaseURL + pPath,
			(pRes) =>
			{
				let tmpChunks = [];
				pRes.on('data', (pChunk) => tmpChunks.push(pChunk));
				pRes.on('end', () =>
				{
					try
					{
						let tmpData = JSON.parse(Buffer.concat(tmpChunks).toString());
						return fGetCallback(null, tmpData);
					}
					catch (pParseError)
					{
						return fGetCallback(pParseError);
					}
				});
			}).on('error', fGetCallback);
	};

	let tmpPrefix = pDataClonerService.routePrefix;

	// Step 1: Connect local database
	let fStep1_ConnectDB = (fNext) =>
	{
		let tmpDB = pConfig.LocalDatabase;
		if (!tmpDB || !tmpDB.Provider || tmpDB.Provider === 'SQLite')
		{
			tmpFable.log.info('Headless: Using default SQLite connection.');
			return fNext();
		}

		tmpFable.log.info(`Headless: Connecting to ${tmpDB.Provider}...`);
		fPost(`${tmpPrefix}/connection/configure`, { Provider: tmpDB.Provider, Config: tmpDB.Config },
			(pError, pData) =>
			{
				if (pError || !pData || !pData.Success)
				{
					tmpFable.log.error(`Headless: DB connection failed: ${pError || (pData && pData.Error) || 'Unknown error'}`);
					return fCallback(new Error('DB connection failed'));
				}
				tmpFable.log.info(`Headless: ${tmpDB.Provider} connected.`);
				return fNext();
			});
	};

	// Step 2: Configure remote session
	let fStep2_ConfigureSession = (fNext) =>
	{
		let tmpSession = pConfig.RemoteSession;
		if (!tmpSession || !tmpSession.ServerURL)
		{
			tmpFable.log.error('Headless: RemoteSession.ServerURL is required in config.');
			return fCallback(new Error('RemoteSession.ServerURL is required'));
		}

		tmpFable.log.info(`Headless: Configuring session for ${tmpSession.ServerURL}...`);
		fPost(`${tmpPrefix}/session/configure`, tmpSession,
			(pError, pData) =>
			{
				if (pError || !pData || !pData.Success)
				{
					tmpFable.log.error(`Headless: Session configure failed: ${pError || (pData && pData.Error) || 'Unknown error'}`);
					return fCallback(new Error('Session configure failed'));
				}
				tmpFable.log.info(`Headless: Session configured (domain: ${pData.DomainMatch}).`);
				return fNext();
			});
	};

	// Step 3: Authenticate
	let fStep3_Authenticate = (fNext) =>
	{
		let tmpCreds = pConfig.Credentials;
		if (!tmpCreds || !tmpCreds.UserName || !tmpCreds.Password)
		{
			tmpFable.log.error('Headless: Credentials.UserName and Credentials.Password are required in config.');
			return fCallback(new Error('Credentials are required'));
		}

		tmpFable.log.info(`Headless: Authenticating as ${tmpCreds.UserName}...`);
		fPost(`${tmpPrefix}/session/authenticate`, { UserName: tmpCreds.UserName, Password: tmpCreds.Password },
			(pError, pData) =>
			{
				if (pError || !pData || !pData.Authenticated)
				{
					tmpFable.log.error(`Headless: Authentication failed: ${pError || (pData && pData.Error) || 'Not authenticated'}`);
					return fCallback(new Error('Authentication failed'));
				}
				tmpFable.log.info('Headless: Authenticated.');
				return fNext();
			});
	};

	// Step 4: Fetch schema (from local file, custom URL, or default remote endpoint)
	let fStep4_FetchSchema = (fNext) =>
	{
		let tmpSchemaBody = {};

		// If a local SchemaPath is provided, read the file and send the object directly
		if (pConfig.SchemaPath)
		{
			let tmpSchemaPath = pConfig.SchemaPath;
			if (!libPath.isAbsolute(tmpSchemaPath))
			{
				tmpSchemaPath = libPath.resolve(process.cwd(), tmpSchemaPath);
			}

			tmpFable.log.info(`Headless: Loading schema from local file ${tmpSchemaPath}...`);

			try
			{
				let tmpSchemaRaw = libFs.readFileSync(tmpSchemaPath, 'utf8');
				let tmpSchema = JSON.parse(tmpSchemaRaw);
				tmpSchemaBody.Schema = tmpSchema;
			}
			catch (pReadError)
			{
				tmpFable.log.error(`Headless: Failed to read schema file ${tmpSchemaPath}: ${pReadError.message || pReadError}`);
				return fCallback(new Error('Schema file read failed'));
			}
		}
		else if (pConfig.SchemaURL)
		{
			tmpSchemaBody.SchemaURL = pConfig.SchemaURL;
			tmpFable.log.info(`Headless: Fetching remote schema from ${pConfig.SchemaURL}...`);
		}
		else
		{
			tmpFable.log.info('Headless: Fetching remote schema from default endpoint...');
		}

		fPost(`${tmpPrefix}/schema/fetch`, tmpSchemaBody,
			(pError, pData) =>
			{
				if (pError || !pData || !pData.Success)
				{
					tmpFable.log.error(`Headless: Schema fetch failed: ${pError || (pData && pData.Error) || 'Unknown error'}`);
					return fCallback(new Error('Schema fetch failed'));
				}
				tmpFable.log.info(`Headless: Fetched ${pData.TableCount} tables.`);
				return fNext();
			});
	};

	// Step 5: Deploy tables
	let fStep5_Deploy = (fNext) =>
	{
		let tmpTables = pConfig.Tables || [];
		tmpFable.log.info(`Headless: Deploying ${tmpTables.length > 0 ? tmpTables.length + ' selected' : 'all'} tables...`);
		fPost(`${tmpPrefix}/schema/deploy`, { Tables: tmpTables },
			(pError, pData) =>
			{
				if (pError || !pData || !pData.Success)
				{
					tmpFable.log.error(`Headless: Deploy failed: ${pError || (pData && pData.Error) || 'Unknown error'}`);
					return fCallback(new Error('Deploy failed'));
				}
				tmpFable.log.info(`Headless: ${pData.Message}`);
				return fNext();
			});
	};

	// Step 6: Start sync
	let fStep6_Sync = (fNext) =>
	{
		let tmpSync = pConfig.Sync || {};
		let tmpSyncBody = (
			{
				Tables: pConfig.Tables || [],
				SyncMode: tmpSync.Mode || 'Initial',
				PageSize: tmpSync.PageSize || 100,
				SyncDeletedRecords: !!tmpSync.SyncDeletedRecords,
				MaxRecordsPerEntity: tmpMaxRecords || tmpSync.MaxRecordsPerEntity || 0,
				DateTimePrecisionMS: tmpSync.DateTimePrecisionMS
			});

		tmpFable.log.info(`Headless: Starting ${tmpSyncBody.SyncMode} sync...`);
		fPost(`${tmpPrefix}/sync/start`, tmpSyncBody,
			(pError, pData) =>
			{
				if (pError || !pData || !pData.Success)
				{
					tmpFable.log.error(`Headless: Sync start failed: ${pError || (pData && pData.Error) || 'Unknown error'}`);
					return fCallback(new Error('Sync start failed'));
				}
				tmpFable.log.info(`Headless: ${pData.Message}`);

				// Poll for completion
				let fPoll = () =>
				{
					fGet(`${tmpPrefix}/sync/status`,
						(pPollError, pStatus) =>
						{
							if (pPollError)
							{
								tmpFable.log.error(`Headless: Poll error: ${pPollError}`);
								return setTimeout(fPoll, 5000);
							}

							if (pStatus.Running)
							{
								let tmpTables = pStatus.Tables || {};
								let tmpNames = Object.keys(tmpTables);
								let tmpActive = tmpNames.filter((n) => tmpTables[n].Status === 'Syncing');
								let tmpDone = tmpNames.filter((n) => tmpTables[n].Status === 'Complete' || tmpTables[n].Status === 'Error' || tmpTables[n].Status === 'Partial');
								if (tmpActive.length > 0)
								{
									let tmpA = tmpTables[tmpActive[0]];
									tmpFable.log.info(`Headless: [${tmpDone.length}/${tmpNames.length}] Syncing ${tmpActive[0]}: ${tmpA.Synced}/${tmpA.Total}`);
								}
								return setTimeout(fPoll, 5000);
							}

							// Sync finished — fetch and write structured report
							fGet(`${tmpPrefix}/sync/report`,
								(pReportError, pReport) =>
								{
									if (!pReportError && pReport && pReport.ReportVersion)
									{
										// Write report JSON file
										let tmpReportPath = (pCLIOptions && pCLIOptions.reportPath) || null;

										// Auto-derive from log path if not explicitly set
										if (!tmpReportPath && pCLIOptions && pCLIOptions.logPath)
										{
											let tmpLogBase = pCLIOptions.logPath.replace(/\.log$/, '');
											tmpReportPath = `${tmpLogBase}-report.json`;
										}

										if (tmpReportPath)
										{
											try
											{
												libFs.writeFileSync(tmpReportPath, JSON.stringify(pReport, null, '\t'), 'utf8');
												tmpFable.log.info(`Headless: Report written to ${tmpReportPath}`);
											}
											catch (pWriteError)
											{
												tmpFable.log.error(`Headless: Failed to write report: ${pWriteError.message}`);
											}
										}
									}
									else
									{
										tmpFable.log.warn(`Headless: Could not fetch sync report: ${pReportError || 'No report available'}`);
									}

									return fNext();
								});
						});
				};
				setTimeout(fPoll, 3000);
			});
	};

	// Execute pipeline
	fStep1_ConnectDB(() =>
	{
		fStep2_ConfigureSession(() =>
		{
			fStep3_Authenticate(() =>
			{
				fStep4_FetchSchema(() =>
				{
					fStep5_Deploy(() =>
					{
						fStep6_Sync(() =>
						{
							tmpFable.log.info('Headless: Pipeline complete.');
							return fCallback();
						});
					});
				});
			});
		});
	});
};
