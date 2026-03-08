/**
 * Data Cloner Integration Tests
 *
 * Exercises the full data-cloner pipeline against a live retold-harness server.
 * Run via: node test/run-integration-tests.js
 *
 * @license MIT
 * @author <steven@velozo.com>
 */

var Chai = require('chai');
var Expect = Chai.expect;

var libHttp = require('http');
var libFs = require('fs');

// Ports set by run-integration-tests.js
var _ClonerPort = parseInt(process.env.CLONER_PORT, 10) || 9400;
var _HarnessPort = parseInt(process.env.HARNESS_PORT, 10) || 9403;
var _ClonerBase = `http://localhost:${_ClonerPort}`;
var _HarnessBase = `http://localhost:${_HarnessPort}`;
var _RequestedEngines = (process.env.REQUESTED_ENGINES || 'sqlite').split(',');

// Load the harness schema from disk (retold-harness doesn't serve /Retold/Models)
var _HarnessSchemaPath = process.env.HARNESS_SCHEMA_PATH || require('path').resolve(__dirname, '..', '..', 'retold-harness', 'source', 'schemas', 'bookstore', 'MeadowModel-Extended.json');
var _HarnessSchema = JSON.parse(libFs.readFileSync(_HarnessSchemaPath, 'utf8'));

// Track storage engine results for the report
var _EngineResults = {};

// ---- HTTP Helpers (same pattern as DataCloner-Command-Headless.js) ----

// Parse JSON, handling potential double-encoding from restify
var fParseJSON = function(pRaw)
{
	var tmpData = JSON.parse(pRaw);
	// Handle double-encoded JSON (restify sometimes wraps strings)
	if (typeof tmpData === 'string')
	{
		try { tmpData = JSON.parse(tmpData); }
		catch (e) { /* leave as string */ }
	}
	return tmpData;
};

var fParseResponse = function(pChunks)
{
	var tmpRaw = Buffer.concat(pChunks).toString();
	try
	{
		return fParseJSON(tmpRaw);
	}
	catch (pParseError)
	{
		return tmpRaw;
	}
};

var fPost = function(pPath, pBody, fCallback)
{
	var tmpPayload = JSON.stringify(pBody);
	var tmpURL = new URL(_ClonerBase + pPath);
	var tmpOpts =
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
		};

	var tmpReq = libHttp.request(tmpOpts,
		(pRes) =>
		{
			var tmpChunks = [];
			pRes.on('data', (pChunk) => tmpChunks.push(pChunk));
			pRes.on('end', () =>
			{
				fCallback(null, fParseResponse(tmpChunks));
			});
		});
	tmpReq.on('error', fCallback);
	tmpReq.write(tmpPayload);
	tmpReq.end();
};

var fGet = function(pPath, fCallback)
{
	libHttp.get(_ClonerBase + pPath,
		(pRes) =>
		{
			var tmpChunks = [];
			pRes.on('data', (pChunk) => tmpChunks.push(pChunk));
			pRes.on('end', () =>
			{
				fCallback(null, fParseResponse(tmpChunks));
			});
		}).on('error', fCallback);
};

var fGetHarness = function(pPath, fCallback)
{
	libHttp.get(_HarnessBase + pPath,
		(pRes) =>
		{
			var tmpChunks = [];
			pRes.on('data', (pChunk) => tmpChunks.push(pChunk));
			pRes.on('end', () =>
			{
				fCallback(null, fParseResponse(tmpChunks));
			});
		}).on('error', fCallback);
};

var fWaitForSyncComplete = function(fCallback, pTimeout)
{
	var tmpTimeout = pTimeout || 120000;
	var tmpStart = Date.now();

	var fPoll = function()
	{
		fGet('/clone/sync/status',
			(pError, pStatus) =>
			{
				if (pError)
				{
					if (Date.now() - tmpStart > tmpTimeout) return fCallback(new Error('Sync timeout (poll error)'));
					return setTimeout(fPoll, 2000);
				}

				if (pStatus && !pStatus.Running)
				{
					return fCallback(null, pStatus);
				}

				if (Date.now() - tmpStart > tmpTimeout)
				{
					return fCallback(new Error('Sync timeout'));
				}

				setTimeout(fPoll, 2000);
			});
	};

	setTimeout(fPoll, 1000);
};

// Full pipeline: reset → configure connection → session → schema → deploy → sync → report
var fRunFullPipeline = function(pProviderConfig, pMaxRecords, fCallback)
{
	var tmpSyncStart;

	// Step 1: Reset
	fPost('/clone/reset', {},
		(pResetErr) =>
		{
			// Step 2: Configure connection (skip for default SQLite)
			var fAfterConnection = function()
			{
				// Step 3: Configure session
				fPost('/clone/session/configure', { ServerURL: `${_HarnessBase}/1.0/` },
					(pSessionErr, pSessionData) =>
					{
						if (pSessionErr || !pSessionData || !pSessionData.Success)
						{
							return fCallback(new Error('Session configure failed: ' + (pSessionErr || JSON.stringify(pSessionData))));
						}

						// Step 4: Fetch schema
						fPost('/clone/schema/fetch', { Schema: _HarnessSchema },
							(pSchemaErr, pSchemaData) =>
							{
								if (pSchemaErr || !pSchemaData || !pSchemaData.Success)
								{
									return fCallback(new Error('Schema fetch failed: ' + (pSchemaErr || JSON.stringify(pSchemaData))));
								}

								// Step 5: Deploy
								fPost('/clone/schema/deploy', { Tables: [] },
									(pDeployErr, pDeployData) =>
									{
										if (pDeployErr || !pDeployData || !pDeployData.Success)
										{
											return fCallback(new Error('Deploy failed: ' + (pDeployErr || JSON.stringify(pDeployData))));
										}

										// Step 6: Sync
										tmpSyncStart = Date.now();
										fPost('/clone/sync/start', { SyncMode: 'Initial', MaxRecordsPerEntity: pMaxRecords || 50 },
											(pSyncErr, pSyncData) =>
											{
												if (pSyncErr || !pSyncData || !pSyncData.Success)
												{
													return fCallback(new Error('Sync start failed: ' + (pSyncErr || JSON.stringify(pSyncData))));
												}

												// Step 7: Wait for completion
												fWaitForSyncComplete(
													(pWaitErr, pFinalStatus) =>
													{
														if (pWaitErr)
														{
															return fCallback(pWaitErr);
														}

														var tmpSyncDuration = Date.now() - tmpSyncStart;

														// Step 8: Get report
														fGet('/clone/sync/report',
															(pReportErr, pReport) =>
															{
																return fCallback(null,
																	{
																		syncDuration: tmpSyncDuration,
																		finalStatus: pFinalStatus,
																		report: pReport,
																		schemaData: pSchemaData,
																		deployData: pDeployData
																	});
															});
													});
											});
									});
							});
					});
			};

			if (pProviderConfig && pProviderConfig.Provider !== 'SQLite')
			{
				fPost('/clone/connection/configure', pProviderConfig,
					(pConnErr, pConnData) =>
					{
						if (pConnErr || !pConnData || !pConnData.Success)
						{
							return fCallback(new Error('Connection configure failed: ' + (pConnErr || JSON.stringify(pConnData))));
						}
						fAfterConnection();
					});
			}
			else
			{
				fAfterConnection();
			}
		});
};

// ---- Harness data cache (fetched once) ----
var _HarnessBookCount = 0;
var _HarnessAuthorCount = 0;
var _HarnessBookRecord1 = null;

// ================================================================
// TEST SUITES
// ================================================================

suite
(
	'Data Cloner Integration',
	function()
	{
		this.timeout(120000);

		// ---- Connection Management ----
		suite
		(
			'Connection Management',
			function()
			{
				test
				(
					'Should show initial connection status',
					function(fDone)
					{
						fGet('/clone/connection/status',
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData).to.be.an('object');
								Expect(pData.Provider).to.equal('SQLite');
								// Initially may or may not be connected depending on startup
								fDone();
							});
					}
				);
				test
				(
					'Should connect SQLite via configure',
					function(fDone)
					{
						this.timeout(10000);
						fPost('/clone/connection/configure',
							{
								Provider: 'SQLite',
								Config: {}
							},
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData).to.be.an('object');
								Expect(pData.Success).to.equal(true);
								fDone();
							});
					}
				);
				test
				(
					'Should show connected after configure',
					function(fDone)
					{
						fGet('/clone/connection/status',
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData).to.be.an('object');
								Expect(pData.Provider).to.equal('SQLite');
								Expect(pData.Connected).to.equal(true);
								fDone();
							});
					}
				);
			}
		);

		// ---- Session Configuration ----
		suite
		(
			'Session Configuration',
			function()
			{
				test
				(
					'Should configure session with retold-harness URL',
					function(fDone)
					{
						fPost('/clone/session/configure',
							{ ServerURL: `${_HarnessBase}/1.0/` },
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData.Success).to.equal(true);
								Expect(pData.ServerURL).to.contain(String(_HarnessPort));
								fDone();
							});
					}
				);
				test
				(
					'Should show session as configured',
					function(fDone)
					{
						fGet('/clone/session/check',
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData.Configured).to.equal(true);
								Expect(pData.ServerURL).to.contain(String(_HarnessPort));
								fDone();
							});
					}
				);
				test
				(
					'Should reject session configure without ServerURL',
					function(fDone)
					{
						fPost('/clone/session/configure', {},
							(pError, pData) =>
							{
								Expect(pData.Success).to.equal(false);
								Expect(pData.Error).to.contain('ServerURL');
								fDone();
							});
					}
				);
			}
		);

		// ---- Schema Fetch ----
		suite
		(
			'Schema Fetch',
			function()
			{
				test
				(
					'Should reconfigure session for fresh schema fetch',
					function(fDone)
					{
						fPost('/clone/session/configure',
							{ ServerURL: `${_HarnessBase}/1.0/` },
							(pError, pData) =>
							{
								Expect(pData.Success).to.equal(true);
								fDone();
							});
					}
				);
				test
				(
					'Should fetch schema from retold-harness',
					function(fDone)
					{
						fPost('/clone/schema/fetch', { Schema: _HarnessSchema },
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData.Success).to.equal(true);
								Expect(pData.TableCount).to.be.greaterThan(0);
								Expect(pData.Tables).to.be.an('array');
								// Bookstore schema has 8 entities
								Expect(pData.Tables).to.include('Book');
								Expect(pData.Tables).to.include('Author');
								Expect(pData.Tables).to.include('User');
								Expect(pData.Tables).to.include('BookAuthorJoin');
								Expect(pData.Tables).to.include('BookPrice');
								Expect(pData.Tables).to.include('BookStore');
								Expect(pData.Tables).to.include('BookStoreInventory');
								Expect(pData.Tables).to.include('Review');
								fDone();
							});
					}
				);
			}
		);

		// ---- Schema Deploy ----
		suite
		(
			'Schema Deploy',
			function()
			{
				test
				(
					'Should deploy all tables',
					function(fDone)
					{
						this.timeout(30000);

						fPost('/clone/schema/deploy', { Tables: [] },
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData.Success).to.equal(true);
								Expect(pData.SyncEntities).to.be.an('array');
								Expect(pData.SyncEntities.length).to.be.greaterThan(0);
								Expect(pData.SyncEntities).to.include('Book');
								Expect(pData.SyncEntities).to.include('Author');
								fDone();
							});
					}
				);
			}
		);

		// ---- Initial Sync (SQLite) ----
		suite
		(
			'Initial Sync (SQLite)',
			function()
			{
				this.timeout(120000);

				var _SyncStatus = null;
				var _SyncReport = null;
				var _SyncDuration = 0;

				test
				(
					'Should start initial sync with record cap',
					function(fDone)
					{
						var tmpStart = Date.now();

						fPost('/clone/sync/start',
							{
								SyncMode: 'Initial',
								MaxRecordsPerEntity: 50
							},
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData.Success).to.equal(true);

								// Wait for sync to complete
								fWaitForSyncComplete(
									(pWaitErr, pStatus) =>
									{
										Expect(pWaitErr).to.equal(null);
										_SyncStatus = pStatus;
										_SyncDuration = Date.now() - tmpStart;
										fDone();
									});
							});
					}
				);
				test
				(
					'All tables should have completed',
					function()
					{
						Expect(_SyncStatus).to.be.an('object');
						Expect(_SyncStatus.Running).to.equal(false);

						var tmpTableNames = Object.keys(_SyncStatus.Tables);
						Expect(tmpTableNames.length).to.be.greaterThan(0);

						for (var i = 0; i < tmpTableNames.length; i++)
						{
							var tmpTable = _SyncStatus.Tables[tmpTableNames[i]];
							Expect(['Complete', 'Partial']).to.include(tmpTable.Status,
								`Table ${tmpTableNames[i]} has unexpected status: ${tmpTable.Status}`);
						}
					}
				);
				test
				(
					'Should have a valid sync report',
					function(fDone)
					{
						fGet('/clone/sync/report',
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData).to.be.an('object');
								Expect(pData.ReportVersion).to.be.a('string');
								Expect(pData.RunID).to.be.a('string');
								Expect(['Success', 'Partial']).to.include(pData.Outcome);
								Expect(pData.Summary).to.be.an('object');
								Expect(pData.Summary.TotalTables).to.be.greaterThan(0);
								Expect(pData.Tables).to.be.an('array');
								Expect(pData.Tables.length).to.equal(pData.Summary.TotalTables);
								Expect(pData.RunTimestamps).to.be.an('object');
								Expect(pData.RunTimestamps.Start).to.be.a('string');
								Expect(pData.RunTimestamps.End).to.be.a('string');
								Expect(pData.RunTimestamps.DurationSeconds).to.be.at.least(0);

								_SyncReport = pData;

								// Record engine result
								_EngineResults['SQLite'] =
									{
										status: 'pass',
										sync_duration_ms: _SyncDuration,
										records_synced: pData.Summary.TotalSynced || 0,
										tables_synced: pData.Summary.TotalTables || 0
									};

								fDone();
							});
					}
				);
				test
				(
					'Report tables should have timing data',
					function()
					{
						Expect(_SyncReport).to.be.an('object');

						for (var i = 0; i < _SyncReport.Tables.length; i++)
						{
							var tmpTable = _SyncReport.Tables[i];
							Expect(tmpTable.Name).to.be.a('string');
							Expect(['Complete', 'Partial', 'Error']).to.include(tmpTable.Status);
							Expect(tmpTable).to.have.property('DurationSeconds');
						}
					}
				);
			}
		);

		// ---- Data Integrity (run right after initial sync, before pre-count resets) ----
		suite
		(
			'Data Integrity',
			function()
			{
				this.timeout(30000);

				test
				(
					'Should fetch harness reference data',
					function(fDone)
					{
						fGetHarness('/1.0/Books/Count',
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData.Count).to.be.greaterThan(0);
								_HarnessBookCount = pData.Count;

								fGetHarness('/1.0/Authors/Count',
									(pErr2, pData2) =>
									{
										Expect(pData2.Count).to.be.greaterThan(0);
										_HarnessAuthorCount = pData2.Count;

										fGetHarness('/1.0/Book/1',
											(pErr3, pData3) =>
											{
												Expect(pData3.IDBook).to.equal(1);
												_HarnessBookRecord1 = pData3;
												fDone();
											});
									});
							});
					}
				);
				test
				(
					'Local book count should match sync (capped)',
					function(fDone)
					{
						fGet('/1.0/Books/Count',
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData.Count).to.be.greaterThan(0);
								// Local count should be <= remote count (capped sync means fewer or equal)
								Expect(pData.Count).to.be.at.most(_HarnessBookCount);
								fDone();
							});
					}
				);
				test
				(
					'Local Book 1 should match harness data',
					function(fDone)
					{
						fGet('/1.0/Book/1',
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData.IDBook).to.equal(1);
								Expect(pData.Title).to.equal(_HarnessBookRecord1.Title);
								Expect(pData.Genre).to.equal(_HarnessBookRecord1.Genre);
								fDone();
							});
					}
				);
				test
				(
					'Local author count should match sync (capped)',
					function(fDone)
					{
						fGet('/1.0/Authors/Count',
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData.Count).to.be.greaterThan(0);
								Expect(pData.Count).to.be.at.most(_HarnessAuthorCount);
								fDone();
							});
					}
				);
			}
		);

		// ---- Pre-Count and Live Status ----
		suite
		(
			'Pre-Count and Live Status',
			function()
			{
				this.timeout(120000);

				test
				(
					'Should run a fresh pipeline and capture pre-count data',
					function(fDone)
					{
						// Reset and re-run to capture pre-count
						fPost('/clone/reset', {},
							(pResetErr) =>
							{
								fPost('/clone/session/configure',
									{ ServerURL: `${_HarnessBase}/1.0/` },
									(pSessErr, pSessData) =>
									{
										Expect(pSessData.Success).to.equal(true);

										fPost('/clone/schema/fetch', { Schema: _HarnessSchema },
											(pSchemaErr, pSchemaData) =>
											{
												Expect(pSchemaData.Success).to.equal(true);

												fPost('/clone/schema/deploy', { Tables: [] },
													(pDeployErr, pDeployData) =>
													{
														Expect(pDeployData.Success).to.equal(true);

														// Start sync with NO record cap so it runs long enough to capture live status
														fPost('/clone/sync/start',
															{ SyncMode: 'Initial', MaxRecordsPerEntity: 0 },
															(pSyncErr, pSyncData) =>
															{
																Expect(pSyncData.Success).to.equal(true);

																// Poll live-status aggressively to capture pre-count and active sync data
																var tmpLiveStatusSamples = [];
																var tmpPollCount = 0;
																var tmpMaxPolls = 60;

																var fPollLive = function()
																{
																	tmpPollCount++;
																	fGet('/clone/sync/live-status',
																		(pLiveErr, pLiveData) =>
																		{
																			if (!pLiveErr && pLiveData)
																			{
																				tmpLiveStatusSamples.push(pLiveData);
																			}

																			// Check if sync is done
																			fGet('/clone/sync/status',
																				(pStatusErr, pStatusData) =>
																				{
																					if (pStatusData && !pStatusData.Running)
																					{
																						// Verify we captured some live-status data
																						Expect(tmpLiveStatusSamples.length).to.be.greaterThan(0);

																						// Check for syncing samples
																						var tmpSyncingSamples = tmpLiveStatusSamples.filter(
																							(s) => s.Phase === 'syncing');

																						if (tmpSyncingSamples.length > 0)
																						{
																							// Verify pre-count data in syncing samples
																							var tmpWithPreCount = tmpSyncingSamples.filter(
																								(s) => s.PreCountGrandTotal > 0);
																							Expect(tmpWithPreCount.length).to.be.greaterThan(0,
																								'Expected at least one live-status sample with PreCountGrandTotal > 0');

																							// Verify live-status structure
																							var tmpSample = tmpSyncingSamples[tmpSyncingSamples.length - 1];
																							Expect(tmpSample).to.have.property('Phase');
																							Expect(tmpSample).to.have.property('Message');
																							Expect(tmpSample).to.have.property('TotalSynced');
																							Expect(tmpSample).to.have.property('TotalRecords');
																							Expect(tmpSample).to.have.property('Elapsed');
																							Expect(tmpSample).to.have.property('SyncMode');
																						}
																						else
																						{
																							// Sync completed before we could sample — verify via report
																							fGet('/clone/sync/report',
																								(pRepErr, pReport) =>
																								{
																									Expect(pReport).to.be.an('object');
																									Expect(pReport.Summary.TotalSynced).to.be.greaterThan(0);
																									Expect(pReport.EventLog).to.be.an('array');
																									// Verify pre-count event exists
																									var tmpPreCountEvents = pReport.EventLog.filter(
																										(e) => e.Type === 'PreCountComplete');
																									Expect(tmpPreCountEvents.length).to.be.greaterThan(0);
																									return fDone();
																								});
																							return;
																						}

																						return fDone();
																					}

																					if (tmpPollCount >= tmpMaxPolls)
																					{
																						return fDone(new Error('Live status polling exceeded max polls'));
																					}

																					setTimeout(fPollLive, 500);
																				});
																		});
																};

																// Start polling immediately
																fPollLive();
															});
													});
											});
									});
							});
					}
				);
			}
		);

		// ---- Ongoing Sync ----
		suite
		(
			'Ongoing Sync',
			function()
			{
				this.timeout(120000);

				test
				(
					'Should run ongoing sync after initial',
					function(fDone)
					{
						fPost('/clone/sync/start',
							{
								SyncMode: 'Ongoing',
								MaxRecordsPerEntity: 50
							},
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData.Success).to.equal(true);

								fWaitForSyncComplete(
									(pWaitErr, pStatus) =>
									{
										Expect(pWaitErr).to.equal(null);
										Expect(pStatus.Running).to.equal(false);

										var tmpTableNames = Object.keys(pStatus.Tables);
										for (var i = 0; i < tmpTableNames.length; i++)
										{
											var tmpTable = pStatus.Tables[tmpTableNames[i]];
											Expect(['Complete', 'Partial']).to.include(tmpTable.Status,
												`Ongoing sync: ${tmpTableNames[i]} has status ${tmpTable.Status}`);
										}

										fDone();
									});
							});
					}
				);
				test
				(
					'Ongoing sync report should show success',
					function(fDone)
					{
						fGet('/clone/sync/report',
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(['Success', 'Partial']).to.include(pData.Outcome);
								fDone();
							});
					}
				);
			}
		);

		// ---- Stop Sync ----
		suite
		(
			'Stop Sync',
			function()
			{
				this.timeout(120000);

				test
				(
					'Should be able to stop a sync in progress',
					function(fDone)
					{
						// Reset and start fresh
						fPost('/clone/reset', {},
							() =>
							{
								fPost('/clone/session/configure',
									{ ServerURL: `${_HarnessBase}/1.0/` },
									() =>
									{
										fPost('/clone/schema/fetch', { Schema: _HarnessSchema },
											() =>
											{
												fPost('/clone/schema/deploy', { Tables: [] },
													() =>
													{
														// Start sync with NO record cap (will take a while)
														fPost('/clone/sync/start',
															{ SyncMode: 'Initial', MaxRecordsPerEntity: 0 },
															(pSyncErr, pSyncData) =>
															{
																Expect(pSyncData.Success).to.equal(true);

																// Wait a moment, then stop
																setTimeout(() =>
																{
																	fPost('/clone/sync/stop', {},
																		(pStopErr, pStopData) =>
																		{
																			Expect(pStopData.Success).to.equal(true);

																			// Wait for sync to actually stop
																			var fPollStop = function()
																			{
																				fGet('/clone/sync/status',
																					(pPollErr, pPollData) =>
																					{
																						if (pPollData && !pPollData.Running)
																						{
																							// Get report
																							fGet('/clone/sync/report',
																								(pRepErr, pReport) =>
																								{
																									if (pReport && pReport.Outcome)
																									{
																										Expect(['Stopped', 'Partial', 'Success']).to.include(pReport.Outcome);
																									}
																									return fDone();
																								});
																						}
																						else
																						{
																							setTimeout(fPollStop, 1000);
																						}
																					});
																			};
																			setTimeout(fPollStop, 1000);
																		});
																}, 3000);
															});
													});
											});
									});
							});
					}
				);
			}
		);

		// ---- Reset ----
		suite
		(
			'Reset',
			function()
			{
				this.timeout(30000);

				test
				(
					'Should reset the database',
					function(fDone)
					{
						fPost('/clone/reset', {},
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								// After reset, status should show no tables
								fGet('/clone/sync/status',
									(pStatusErr, pStatusData) =>
									{
										Expect(pStatusData.Running).to.equal(false);
										fDone();
									});
							});
					}
				);
				test
				(
					'Connection should still work after reset',
					function(fDone)
					{
						fGet('/clone/connection/status',
							(pError, pData) =>
							{
								Expect(pError).to.equal(null);
								Expect(pData.Connected).to.equal(true);
								fDone();
							});
					}
				);
			}
		);

		// ---- Storage Engine: MySQL (conditional) ----
		suite
		(
			'Storage Engine: MySQL',
			function()
			{
				this.timeout(120000);

				var _MysqlAvailable = false;

				suiteSetup
				(
					function()
					{
						if (_RequestedEngines.indexOf('mysql') < 0 || !process.env.MYSQL_HOST)
						{
							_EngineResults['MySQL'] = { status: 'skip', reason: 'MYSQL_HOST not set' };
							this.skip();
						}
						else
						{
							_MysqlAvailable = true;
						}
					}
				);

				test
				(
					'Should sync via MySQL',
					function(fDone)
					{
						if (!_MysqlAvailable) return this.skip();

						var tmpConfig =
							{
								Provider: 'MySQL',
								Config:
									{
										Server: process.env.MYSQL_HOST || 'localhost',
										Port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
										User: process.env.MYSQL_USER || 'root',
										Password: process.env.MYSQL_PASSWORD || '',
										Database: process.env.MYSQL_DATABASE || 'retold_cloner_test',
										ConnectionPoolLimit: 5
									}
							};

						fRunFullPipeline(tmpConfig, 20,
							(pError, pResult) =>
							{
								if (pError)
								{
									_EngineResults['MySQL'] = { status: 'fail', error: pError.message };
									return fDone(pError);
								}

								Expect(pResult.report).to.be.an('object');
								Expect(['Success', 'Partial']).to.include(pResult.report.Outcome);

								_EngineResults['MySQL'] =
									{
										status: 'pass',
										sync_duration_ms: pResult.syncDuration,
										records_synced: pResult.report.Summary.TotalSynced || 0,
										tables_synced: pResult.report.Summary.TotalTables || 0
									};

								fDone();
							});
					}
				);
			}
		);

		// ---- Storage Engine: PostgreSQL (conditional) ----
		suite
		(
			'Storage Engine: PostgreSQL',
			function()
			{
				this.timeout(120000);

				var _PgAvailable = false;

				suiteSetup
				(
					function()
					{
						if (_RequestedEngines.indexOf('postgresql') < 0 || !process.env.POSTGRESQL_HOST)
						{
							_EngineResults['PostgreSQL'] = { status: 'skip', reason: 'POSTGRESQL_HOST not set' };
							this.skip();
						}
						else
						{
							_PgAvailable = true;
						}
					}
				);

				test
				(
					'Should sync via PostgreSQL',
					function(fDone)
					{
						if (!_PgAvailable) return this.skip();

						var tmpConfig =
							{
								Provider: 'PostgreSQL',
								Config:
									{
										Server: process.env.POSTGRESQL_HOST || 'localhost',
										Port: parseInt(process.env.POSTGRESQL_PORT, 10) || 5432,
										User: process.env.POSTGRESQL_USER || 'postgres',
										Password: process.env.POSTGRESQL_PASSWORD || '',
										Database: process.env.POSTGRESQL_DATABASE || 'retold_cloner_test',
										ConnectionPoolLimit: 5
									}
							};

						fRunFullPipeline(tmpConfig, 20,
							(pError, pResult) =>
							{
								if (pError)
								{
									_EngineResults['PostgreSQL'] = { status: 'fail', error: pError.message };
									return fDone(pError);
								}

								Expect(pResult.report).to.be.an('object');
								Expect(['Success', 'Partial']).to.include(pResult.report.Outcome);

								_EngineResults['PostgreSQL'] =
									{
										status: 'pass',
										sync_duration_ms: pResult.syncDuration,
										records_synced: pResult.report.Summary.TotalSynced || 0,
										tables_synced: pResult.report.Summary.TotalTables || 0
									};

								fDone();
							});
					}
				);
			}
		);

		// ---- Storage Engine: MSSQL (conditional) ----
		suite
		(
			'Storage Engine: MSSQL',
			function()
			{
				this.timeout(120000);

				var _MssqlAvailable = false;

				suiteSetup
				(
					function()
					{
						if (_RequestedEngines.indexOf('mssql') < 0 || !process.env.MSSQL_HOST)
						{
							_EngineResults['MSSQL'] = { status: 'skip', reason: 'MSSQL_HOST not set' };
							this.skip();
						}
						else
						{
							_MssqlAvailable = true;
						}
					}
				);

				test
				(
					'Should sync via MSSQL',
					function(fDone)
					{
						if (!_MssqlAvailable) return this.skip();

						var tmpConfig =
							{
								Provider: 'MSSQL',
								Config:
									{
										Server: process.env.MSSQL_HOST || 'localhost',
										Port: parseInt(process.env.MSSQL_PORT, 10) || 1433,
										User: process.env.MSSQL_USER || 'sa',
										Password: process.env.MSSQL_PASSWORD || '',
										Database: process.env.MSSQL_DATABASE || 'retold_cloner_test'
									}
							};

						fRunFullPipeline(tmpConfig, 20,
							(pError, pResult) =>
							{
								if (pError)
								{
									_EngineResults['MSSQL'] = { status: 'fail', error: pError.message };
									return fDone(pError);
								}

								Expect(pResult.report).to.be.an('object');
								Expect(['Success', 'Partial']).to.include(pResult.report.Outcome);

								_EngineResults['MSSQL'] =
									{
										status: 'pass',
										sync_duration_ms: pResult.syncDuration,
										records_synced: pResult.report.Summary.TotalSynced || 0,
										tables_synced: pResult.report.Summary.TotalTables || 0
									};

								fDone();
							});
					}
				);
			}
		);

		// ---- Expose engine results for the runner ----
		suiteTeardown
		(
			function()
			{
				// Write engine results to env so the runner can pick them up
				process.env.ENGINE_RESULTS = JSON.stringify(_EngineResults);
			}
		);
	}
);
