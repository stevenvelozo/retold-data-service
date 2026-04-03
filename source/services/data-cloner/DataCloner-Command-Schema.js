/**
 * DataCloner Schema Management Routes
 *
 * Registers /clone/schema/* endpoints for fetching remote schemas,
 * deploying tables to the local database, and resetting the database.
 *
 * @param {Object} pDataClonerService - The RetoldDataServiceDataCloner instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = (pDataClonerService, pOratorServiceServer) =>
{
	let tmpFable = pDataClonerService.fable;
	let tmpCloneState = pDataClonerService.cloneState;
	let tmpPict = pDataClonerService.pict;
	let tmpPrefix = pDataClonerService.routePrefix;

	let libFs = require('fs');
	let _ProviderRegistry = require('./DataCloner-ProviderRegistry.js');

	// POST /clone/schema/fetch
	// Accepts either:
	//   { SchemaURL: "..." }           — fetch from a remote URL
	//   { Schema: { Tables: {...} } }  — use a pre-loaded schema object directly
	//   {}                             — default to RemoteServerURL + 'Retold/Models'
	pOratorServiceServer.post(`${tmpPrefix}/schema/fetch`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};

			// If a raw Schema object was provided, use it directly (no remote fetch)
			if (tmpBody.Schema && typeof tmpBody.Schema === 'object')
			{
				tmpFable.log.info('Data Cloner: Using pre-loaded schema object...');

				tmpCloneState.RemoteSchema = tmpBody.Schema;
				tmpCloneState.RemoteModelObject = tmpBody.Schema;

				let tmpTableNames = [];
				if (tmpBody.Schema.Tables)
				{
					tmpTableNames = Object.keys(tmpBody.Schema.Tables);
				}

				tmpFable.log.info(`Data Cloner: Loaded schema with ${tmpTableNames.length} tables: [${tmpTableNames.join(', ')}]`);

				pResponse.send(200,
					{
						Success: true,
						Source: 'local',
						TableCount: tmpTableNames.length,
						Tables: tmpTableNames
					});
				return fNext();
			}

			let tmpSchemaURL = tmpBody.SchemaURL;

			if (!tmpSchemaURL)
			{
				// Default to the standard retold model endpoint
				if (tmpCloneState.RemoteServerURL)
				{
					tmpSchemaURL = tmpCloneState.RemoteServerURL + 'Retold/Models';
				}
				else
				{
					pResponse.send(400, { Success: false, Error: 'SchemaURL is required (or configure a session first).' });
					return fNext();
				}
			}

			tmpFable.log.info(`Data Cloner: Fetching remote schema from ${tmpSchemaURL}...`);

			tmpPict.RestClient.getJSON(tmpSchemaURL,
				(pError, pHTTPResponse, pData) =>
				{
					if (pError)
					{
						tmpFable.log.error(`Data Cloner: Schema fetch error: ${pError.message || pError}`);
						pResponse.send(500, { Success: false, Error: `Schema fetch error: ${pError.message || pError}` });
						return fNext();
					}

					if (!pHTTPResponse || pHTTPResponse.statusCode !== 200)
					{
						let tmpStatus = pHTTPResponse ? pHTTPResponse.statusCode : 'unknown';
						tmpFable.log.error(`Data Cloner: Schema fetch returned HTTP ${tmpStatus} — body: ${JSON.stringify(pData)}`);
						pResponse.send(500, { Success: false, Error: `Schema fetch returned HTTP ${tmpStatus}` });
						return fNext();
					}

					tmpCloneState.RemoteSchema = pData;
					tmpCloneState.RemoteModelObject = pData;

					// Extract table names for the UI
					let tmpTableNames = [];
					if (pData && pData.Tables)
					{
						tmpTableNames = Object.keys(pData.Tables);
					}

					tmpFable.log.info(`Data Cloner: Fetched schema with ${tmpTableNames.length} tables: [${tmpTableNames.join(', ')}]`);

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
	pOratorServiceServer.get(`${tmpPrefix}/schema`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpCloneState.RemoteSchema)
			{
				pResponse.send(200, { Fetched: false, Tables: [] });
				return fNext();
			}

			let tmpTableNames = [];
			if (tmpCloneState.RemoteSchema.Tables)
			{
				tmpTableNames = Object.keys(tmpCloneState.RemoteSchema.Tables);
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
	pOratorServiceServer.post(`${tmpPrefix}/reset`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpSQLitePath = tmpFable.settings.SQLite && tmpFable.settings.SQLite.SQLiteFilePath;
			if (!tmpSQLitePath)
			{
				pResponse.send(400, { Success: false, Error: 'No SQLite file path configured.' });
				return fNext();
			}

			tmpFable.log.info(`Data Cloner: Resetting local database [${tmpSQLitePath}]...`);

			try
			{
				// Close the existing SQLite connection and reset the provider state
				if (tmpFable.MeadowSQLiteProvider)
				{
					if (tmpFable.MeadowSQLiteProvider._database)
					{
						tmpFable.MeadowSQLiteProvider._database.close();
					}
					tmpFable.MeadowSQLiteProvider.connected = false;
				}
			}
			catch (pCloseError)
			{
				tmpFable.log.warn(`Data Cloner: Error closing SQLite connection: ${pCloseError}`);
			}

			try
			{
				// Delete the database file
				if (libFs.existsSync(tmpSQLitePath))
				{
					libFs.unlinkSync(tmpSQLitePath);
					tmpFable.log.info('Data Cloner: SQLite database file deleted.');
				}
			}
			catch (pDeleteError)
			{
				tmpFable.log.error(`Data Cloner: Error deleting SQLite file: ${pDeleteError}`);
				pResponse.send(500, { Success: false, Error: `Failed to delete database: ${pDeleteError}` });
				return fNext();
			}

			// Reconnect to create a fresh database
			tmpFable.MeadowSQLiteProvider.connectAsync(
				(pReconnectError) =>
				{
					if (pReconnectError)
					{
						tmpFable.log.error(`Data Cloner: Error reconnecting SQLite: ${pReconnectError}`);
						pResponse.send(500, { Success: false, Error: `Failed to reconnect: ${pReconnectError}` });
						return fNext();
					}

					// Clear sync state
					tmpCloneState.SyncProgress = {};
					tmpCloneState.SyncRESTErrors = {};

					tmpFable.log.info('Data Cloner: Database reset complete — fresh SQLite file ready.');

					pResponse.send(200, { Success: true, Message: 'Database reset. Deploy a schema to recreate tables.' });
					return fNext();
				});
		});

	// POST /clone/schema/deploy
	pOratorServiceServer.post(`${tmpPrefix}/schema/deploy`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpCloneState.RemoteModelObject)
			{
				pResponse.send(400, { Success: false, Error: 'No schema fetched. Call POST /clone/schema/fetch first.' });
				return fNext();
			}

			let tmpBody = pRequest.body || {};
			let tmpSelectedTables = tmpBody.Tables || null;

			let tmpFullModel = tmpCloneState.RemoteModelObject;

			// Build a filtered model with ONLY the selected tables
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
			tmpFable.log.info(`Data Cloner: Deploying ${tmpTableNames.length} tables to local ${tmpCloneState.ConnectionProvider}: [${tmpTableNames.join(', ')}]`);

			// ---- Set up MeadowCloneRestClient ----
			if (!tmpFable.MeadowCloneRestClient)
			{
				tmpFable.serviceManager.instantiateServiceProvider('MeadowCloneRestClient',
					{
						ServerURL: tmpCloneState.RemoteServerURL,
						RequestTimeout: 60000,
						MaxRequestTimeout: 300000
					});
			}
			else
			{
				tmpFable.MeadowCloneRestClient.serverURL = tmpCloneState.RemoteServerURL;
			}

			// Override getJSON to delegate through pict-sessionmanager's
			// RestClient, which already handles cookie injection & domain matching.
			let libHttps = require('https');
			libHttps.globalAgent.options.timeout = tmpFable.MeadowCloneRestClient.maxRequestTimeout;
			tmpFable.MeadowCloneRestClient.getJSON = (pURL, fCallback) =>
			{
				let tmpFullURL = tmpFable.MeadowCloneRestClient.serverURL + pURL;

				// Extract the entity name from the URL for error tracking
				let tmpEntityHint = pURL.split('/')[0].replace(/s$/, '');

				// Use the longer timeout for Max and Count queries (which can be
				// slow on large tables with millions of rows)
				let tmpIsHeavyQuery = (pURL.indexOf('/Max/') > -1) || (pURL.match(/\/Count(\/|$)/) !== null);
				let tmpPreviousTimeout = libHttps.globalAgent.options.timeout;
				libHttps.globalAgent.options.timeout = tmpIsHeavyQuery
					? tmpFable.MeadowCloneRestClient.maxRequestTimeout
					: tmpFable.MeadowCloneRestClient.requestTimeout;

				tmpPict.RestClient.getJSON(tmpFullURL,
					(pError, pHTTPResponse, pBody) =>
					{
						if (pError)
						{
							tmpFable.log.error(`Data Cloner: REST error for ${pURL}: ${pError}`);
							if (tmpCloneState.SyncRESTErrors[tmpEntityHint] !== undefined)
							{
								tmpCloneState.SyncRESTErrors[tmpEntityHint]++;
							}
						}
						else
						{
							// Track when the server returns a non-array for list endpoints
							// Count/FilteredTo returns {"Count":N} (an object, not an array) which is expected
							if (pURL.indexOf('FilteredTo') > -1 && pURL.indexOf('Count/FilteredTo') < 0 && !Array.isArray(pBody))
							{
								let tmpBodyPreview = (typeof(pBody) === 'string') ? pBody.substring(0, 300) : JSON.stringify(pBody).substring(0, 300);
								tmpFable.log.warn(`Data Cloner: FilteredTo response for ${tmpEntityHint} is not an array — URL: ${pURL} — Response: ${tmpBodyPreview}`);
								if (tmpCloneState.SyncRESTErrors[tmpEntityHint] !== undefined)
								{
									tmpCloneState.SyncRESTErrors[tmpEntityHint]++;
								}
							}
						}
						libHttps.globalAgent.options.timeout = tmpPreviousTimeout;
						return fCallback(pError, pHTTPResponse, pBody);
					});
			};

			// ---- Set up MeadowSync ----
			if (!tmpFable.ProgramConfiguration)
			{
				tmpFable.ProgramConfiguration = {};
			}

			let tmpMeadowSync = tmpFable.serviceManager.instantiateServiceProvider('MeadowSync',
				{
					SyncEntityList: tmpTableNames,
					PageSize: 100,
					SyncDeletedRecords: tmpCloneState.SyncDeletedRecords
				});
			// Ensure the new instance is the default — instantiateServiceProvider
			// only sets the default on the FIRST call for a given service type,
			// so re-deploys would otherwise use the stale MeadowSync.
			tmpFable.serviceManager.setDefaultServiceInstantiation('MeadowSync', tmpMeadowSync.Hash);

			tmpFable.MeadowSync.loadMeadowSchema(tmpModelObject,
				(pSyncInitError) =>
				{
					if (pSyncInitError)
					{
						tmpFable.log.warn(`Data Cloner: MeadowSync schema init warning: ${pSyncInitError}`);
					}

					let tmpInitializedEntities = Object.keys(tmpFable.MeadowSync.MeadowSyncEntities);
					tmpFable.log.info(`Data Cloner: MeadowSync initialized ${tmpInitializedEntities.length} sync entities: [${tmpInitializedEntities.join(', ')}]`);

					// Store the deployed model so sync mode switches can re-create entities
					tmpCloneState.DeployedModelObject = tmpModelObject;

					// ---- Schema migration: detect and apply column deltas ----
					let tmpMigrationResults = [];

					let fFinalizeDeploy = () =>
					{
						tmpFable.log.info(`Data Cloner: Loading model for CRUD endpoints...`);

						// Load the filtered model so CRUD endpoints are available
						tmpFable.RetoldDataServiceMeadowEndpoints.loadModel('RemoteClone', tmpModelObject, tmpCloneState.ConnectionProvider,
							(pLoadError) =>
							{
								if (pLoadError)
								{
									tmpFable.log.error(`Data Cloner: Model load error: ${pLoadError}`);
								}
								else
								{
									tmpFable.log.info(`Data Cloner: CRUD endpoints available for: [${tmpTableNames.join(', ')}]`);
								}

								let tmpTotalColumnsAdded = tmpMigrationResults.reduce((pSum, pR) => pSum + pR.ColumnsAdded.length, 0);
								let tmpMessage = `${tmpInitializedEntities.length} / ${tmpTableNames.length} tables deployed.`;
								if (tmpTotalColumnsAdded > 0)
								{
									tmpMessage += ` ${tmpTotalColumnsAdded} column(s) added via schema migration.`;
								}
								tmpMessage += ` meadow-integration sync ready.`;

								pResponse.send(200,
									{
										Success: true,
										TablesDeployed: tmpTableNames,
										SyncEntities: tmpInitializedEntities,
										MigrationsApplied: tmpMigrationResults,
										Message: tmpMessage
									});
								return fNext();
							});
					};

					// Resolve the active connection provider for introspection and SQL execution
					let tmpProviderName = tmpCloneState.ConnectionProvider;
					let tmpProviderRegistryEntry = _ProviderRegistry[tmpProviderName];
					let tmpActiveProvider = tmpProviderRegistryEntry ? tmpFable[tmpProviderRegistryEntry.serviceName] : null;

					if (!tmpFable.RetoldDataServiceMigrationManager || !tmpActiveProvider || !tmpActiveProvider.connected)
					{
						// Migration manager or provider not available — skip migration step
						return fFinalizeDeploy();
					}

					let tmpMM = tmpFable.RetoldDataServiceMigrationManager;

					tmpFable.log.info(`Data Cloner: Checking schema deltas for ${tmpTableNames.length} tables against ${tmpProviderName}...`);

					tmpFable.Utility.eachLimit(tmpTableNames, 1,
						(pTableName, fNextTable) =>
						{
							if (typeof(tmpActiveProvider.introspectTableColumns) !== 'function')
							{
								// Provider does not support introspection — skip
								return fNextTable();
							}

							tmpActiveProvider.introspectTableColumns(pTableName,
								(pIntrospectError, pActualColumns) =>
								{
									if (pIntrospectError || !Array.isArray(pActualColumns))
									{
										tmpFable.log.warn(`Data Cloner: Could not introspect ${pTableName}: ${pIntrospectError || 'no columns returned'}`);
										return fNextTable();
									}

									// Build source schema (actual database) in the format SchemaDiff expects
									let tmpSourceSchema = { Tables: [{ TableName: pTableName, Columns: pActualColumns }] };

									// Build target schema (expected from remote model)
									let tmpTargetSchema = tmpMM.normalizeSchemaForDiff({ Tables: { [pTableName]: tmpModelObject.Tables[pTableName] } });

									let tmpDiff = tmpMM._schemaDiff.diffSchemas(tmpSourceSchema, tmpTargetSchema);

									let tmpColumnsAdded = [];
									let tmpColumnsModified = [];
									if (tmpDiff.TablesModified && tmpDiff.TablesModified.length > 0)
									{
										for (let t = 0; t < tmpDiff.TablesModified.length; t++)
										{
											let tmpMod = tmpDiff.TablesModified[t];
											if (Array.isArray(tmpMod.ColumnsAdded))
											{
												for (let c = 0; c < tmpMod.ColumnsAdded.length; c++)
												{
													tmpColumnsAdded.push(tmpMod.ColumnsAdded[c].Column);
												}
											}
											if (Array.isArray(tmpMod.ColumnsModified))
											{
												for (let c = 0; c < tmpMod.ColumnsModified.length; c++)
												{
													tmpColumnsModified.push(tmpMod.ColumnsModified[c].Column);
												}
											}
										}
									}

									if (tmpColumnsAdded.length < 1 && tmpColumnsModified.length < 1)
									{
										return fNextTable();
									}

									// Generate provider-appropriate ALTER TABLE statements
									let tmpStatements = tmpMM._migrationGenerator.generateMigrationStatements(tmpDiff, tmpProviderName);

									let tmpLogParts = [];
									if (tmpColumnsAdded.length > 0)
									{
										tmpLogParts.push(`adding ${tmpColumnsAdded.length} column(s): [${tmpColumnsAdded.join(', ')}]`);
									}
									if (tmpColumnsModified.length > 0)
									{
										tmpLogParts.push(`modifying ${tmpColumnsModified.length} column(s): [${tmpColumnsModified.join(', ')}]`);
									}
									tmpFable.log.info(`Data Cloner: Migrating ${pTableName} — ${tmpLogParts.join('; ')}`);

									let tmpExecutedStatements = [];

									// Filter out comment-only lines (e.g. "-- SQLite does not support ALTER COLUMN...")
									// generated by MigrationGenerator for column modifications that can't be
									// applied automatically.  We only want to execute actual SQL statements.
									tmpStatements = tmpStatements.filter((pStmt) => !pStmt.trimStart().startsWith('--'));

									// Execute statements provider-agnostically
									let fExecNext = (pIndex) =>
									{
										if (pIndex >= tmpStatements.length)
										{
											tmpMigrationResults.push(
												{
													Table: pTableName,
													ColumnsAdded: tmpColumnsAdded,
													ColumnsModified: tmpColumnsModified,
													Statements: tmpExecutedStatements
												});
											return fNextTable();
										}

										let tmpSQL = tmpStatements[pIndex];

										// SQLite: synchronous execution via better-sqlite3
										if (tmpProviderName === 'SQLite' && tmpActiveProvider.db)
										{
											try
											{
												tmpActiveProvider.db.exec(tmpSQL);
												tmpFable.log.info(`Data Cloner: Migration applied: ${tmpSQL}`);
												tmpExecutedStatements.push(tmpSQL);
											}
											catch (pExecError)
											{
												tmpFable.log.warn(`Data Cloner: Migration failed: ${tmpSQL} — ${pExecError}`);
											}
											return fExecNext(pIndex + 1);
										}

										// MySQL / MSSQL / PostgreSQL: async execution via connection pool
										// MySQL pool.query uses callbacks; MSSQL/PostgreSQL pool.query returns a promise.
										if (tmpActiveProvider.pool)
										{
											let tmpQueryResult = tmpActiveProvider.pool.query(tmpSQL,
												(pQueryError) =>
												{
													// Callback-style (MySQL) — only fires if pool.query
													// accepted the callback parameter
													if (pQueryError)
													{
														tmpFable.log.warn(`Data Cloner: Migration failed: ${tmpSQL} — ${pQueryError}`);
													}
													else
													{
														tmpFable.log.info(`Data Cloner: Migration applied: ${tmpSQL}`);
														tmpExecutedStatements.push(tmpSQL);
													}
													return fExecNext(pIndex + 1);
												});

											// Promise-style (MSSQL / PostgreSQL) — if query returned a thenable,
											// handle it; the callback above will not fire in this case.
											if (tmpQueryResult && typeof(tmpQueryResult.then) === 'function')
											{
												tmpQueryResult
													.then(() =>
													{
														tmpFable.log.info(`Data Cloner: Migration applied: ${tmpSQL}`);
														tmpExecutedStatements.push(tmpSQL);
														return fExecNext(pIndex + 1);
													})
													.catch((pPromiseError) =>
													{
														tmpFable.log.warn(`Data Cloner: Migration failed: ${tmpSQL} — ${pPromiseError}`);
														return fExecNext(pIndex + 1);
													});
											}
										}
										else
										{
											tmpFable.log.warn(`Data Cloner: No execution handle available for ${tmpProviderName}; skipping: ${tmpSQL}`);
											return fExecNext(pIndex + 1);
										}
									};

									fExecNext(0);
								});
						},
						() =>
						{
							if (tmpMigrationResults.length > 0)
							{
								let tmpTotalAdded = tmpMigrationResults.reduce((pSum, pR) => pSum + pR.ColumnsAdded.length, 0);
								let tmpTotalModified = tmpMigrationResults.reduce((pSum, pR) => pSum + (pR.ColumnsModified ? pR.ColumnsModified.length : 0), 0);
								let tmpSummaryParts = [];
								if (tmpTotalAdded > 0)
								{
									tmpSummaryParts.push(`${tmpTotalAdded} column(s) added`);
								}
								if (tmpTotalModified > 0)
								{
									tmpSummaryParts.push(`${tmpTotalModified} column(s) modified`);
								}
								tmpFable.log.info(`Data Cloner: Schema migration complete — ${tmpSummaryParts.join(', ')} across ${tmpMigrationResults.length} table(s).`);
							}
							else
							{
								tmpFable.log.info(`Data Cloner: Schema migration check complete — no deltas detected.`);
							}
							return fFinalizeDeploy();
						});
				});
		});

	// GET /clone/schema/guid-index-audit — Check all deployed tables for missing GUID indices
	pOratorServiceServer.get(`${tmpPrefix}/schema/guid-index-audit`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpCloneState.DeployedModelObject)
			{
				pResponse.send(400, { Success: false, Error: 'No schema deployed. Deploy tables first.' });
				return fNext();
			}

			let tmpProviderName = tmpCloneState.ConnectionProvider;
			let tmpProviderRegistryEntry = _ProviderRegistry[tmpProviderName];
			let tmpActiveProvider = tmpProviderRegistryEntry ? tmpFable[tmpProviderRegistryEntry.serviceName] : null;

			if (!tmpActiveProvider || !tmpActiveProvider.connected || typeof(tmpActiveProvider.introspectTableIndices) !== 'function')
			{
				pResponse.send(400, { Success: false, Error: 'No connected provider with introspection support available.' });
				return fNext();
			}

			let tmpModelTables = tmpCloneState.DeployedModelObject.Tables || {};
			let tmpTableNames = Object.keys(tmpModelTables);
			let tmpResults = [];
			let tmpMissingCount = 0;

			tmpFable.Utility.eachLimit(tmpTableNames, 1,
				(pTableName, fNextTable) =>
				{
					let tmpTableSchema = tmpModelTables[pTableName];
					let tmpColumns = Array.isArray(tmpTableSchema.Columns) ? tmpTableSchema.Columns : [];

					// Find GUID columns in the expected schema
					let tmpGUIDColumns = tmpColumns.filter((pCol) => pCol.DataType === 'GUID');

					if (tmpGUIDColumns.length < 1)
					{
						return fNextTable();
					}

					tmpActiveProvider.introspectTableIndices(pTableName,
						(pError, pActualIndices) =>
						{
							if (pError)
							{
								tmpFable.log.warn(`GUID Index Audit: Could not introspect indices for ${pTableName}: ${pError}`);
								return fNextTable();
							}

							let tmpIndices = Array.isArray(pActualIndices) ? pActualIndices : [];
							let tmpTableResult = { Table: pTableName, GUIDColumns: [] };

							for (let g = 0; g < tmpGUIDColumns.length; g++)
							{
								let tmpColName = tmpGUIDColumns[g].Column;
								let tmpExpectedIndexName = `AK_M_${tmpColName}`;

								// Check if any index covers this GUID column
								let tmpMatchingIndex = tmpIndices.find((pIdx) =>
									pIdx.Name === tmpExpectedIndexName ||
									(Array.isArray(pIdx.Columns) && pIdx.Columns.indexOf(tmpColName) > -1));

								let tmpHasIndex = !!tmpMatchingIndex;
								if (!tmpHasIndex)
								{
									tmpMissingCount++;
								}

								tmpTableResult.GUIDColumns.push(
									{
										Column: tmpColName,
										HasIndex: tmpHasIndex,
										IndexName: tmpMatchingIndex ? tmpMatchingIndex.Name : null
									});
							}

							tmpResults.push(tmpTableResult);
							return fNextTable();
						});
				},
				() =>
				{
					pResponse.send(200,
						{
							Success: true,
							Tables: tmpResults,
							MissingCount: tmpMissingCount,
							Message: tmpMissingCount > 0
								? `${tmpMissingCount} GUID column(s) across ${tmpResults.filter((pR) => pR.GUIDColumns.some((pC) => !pC.HasIndex)).length} table(s) are missing indices.`
								: 'All GUID columns have indices.'
						});
					return fNext();
				});
		});

	// POST /clone/schema/guid-index-create — Create missing GUID indices
	pOratorServiceServer.post(`${tmpPrefix}/schema/guid-index-create`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpCloneState.DeployedModelObject)
			{
				pResponse.send(400, { Success: false, Error: 'No schema deployed. Deploy tables first.' });
				return fNext();
			}

			let tmpProviderName = tmpCloneState.ConnectionProvider;
			let tmpProviderRegistryEntry = _ProviderRegistry[tmpProviderName];
			let tmpActiveProvider = tmpProviderRegistryEntry ? tmpFable[tmpProviderRegistryEntry.serviceName] : null;

			if (!tmpActiveProvider || !tmpActiveProvider.connected)
			{
				pResponse.send(400, { Success: false, Error: 'No connected provider available.' });
				return fNext();
			}

			// The schema provider has generateCreateIndexStatements and createIndex
			let tmpSchemaProvider = tmpActiveProvider.schemaProvider || tmpActiveProvider;

			if (typeof(tmpSchemaProvider.generateCreateIndexStatements) !== 'function' ||
				typeof(tmpSchemaProvider.createIndex) !== 'function')
			{
				pResponse.send(400, { Success: false, Error: `Provider ${tmpProviderName} does not support index creation.` });
				return fNext();
			}

			let tmpBody = pRequest.body || {};
			let tmpFilterTables = Array.isArray(tmpBody.Tables) && tmpBody.Tables.length > 0 ? tmpBody.Tables : null;

			let tmpModelTables = tmpCloneState.DeployedModelObject.Tables || {};
			let tmpTableNames = tmpFilterTables || Object.keys(tmpModelTables);
			let tmpCreatedIndices = [];

			tmpFable.log.info(`Data Cloner: Creating missing GUID indices for ${tmpTableNames.length} tables...`);

			tmpFable.Utility.eachLimit(tmpTableNames, 1,
				(pTableName, fNextTable) =>
				{
					let tmpTableSchema = tmpModelTables[pTableName];
					if (!tmpTableSchema)
					{
						return fNextTable();
					}

					// Generate all index statements for this table (provider-specific)
					let tmpAllStatements = tmpSchemaProvider.generateCreateIndexStatements(tmpTableSchema);

					// Filter to GUID indices only (AK_M_GUID*)
					let tmpGUIDStatements = tmpAllStatements.filter((pStmt) => pStmt.Name && pStmt.Name.indexOf('AK_M_GUID') === 0);

					if (tmpGUIDStatements.length < 1)
					{
						return fNextTable();
					}

					// createIndex is idempotent on all providers — safe to call even if index exists
					let fCreateNext = (pIndex) =>
					{
						if (pIndex >= tmpGUIDStatements.length)
						{
							return fNextTable();
						}

						let tmpStmt = tmpGUIDStatements[pIndex];
						tmpSchemaProvider.createIndex(tmpStmt,
							(pCreateError) =>
							{
								if (pCreateError)
								{
									tmpFable.log.warn(`Data Cloner: Failed to create index ${tmpStmt.Name} on ${pTableName}: ${pCreateError}`);
								}
								else
								{
									tmpFable.log.info(`Data Cloner: Created index ${tmpStmt.Name} on ${pTableName}`);
									tmpCreatedIndices.push(
										{
											Table: pTableName,
											IndexName: tmpStmt.Name,
											Statement: tmpStmt.Statement
										});
								}
								return fCreateNext(pIndex + 1);
							});
					};

					fCreateNext(0);
				},
				() =>
				{
					let tmpMessage = tmpCreatedIndices.length > 0
						? `${tmpCreatedIndices.length} GUID index(es) created.`
						: 'No new GUID indices were needed.';

					tmpFable.log.info(`Data Cloner: ${tmpMessage}`);

					pResponse.send(200,
						{
							Success: true,
							IndicesCreated: tmpCreatedIndices,
							Message: tmpMessage
						});
					return fNext();
				});
		});
};
