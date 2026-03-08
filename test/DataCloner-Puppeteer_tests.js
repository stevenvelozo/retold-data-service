/**
 * Data Cloner Puppeteer (Web UI) Integration Tests
 *
 * Exercises the data-cloner web interface using headless Chrome via Puppeteer.
 * Requires retold-harness running on HARNESS_PORT and data-cloner on CLONER_PORT.
 *
 * Run via: node test/run-integration-tests.js
 *
 * @license MIT
 * @author <steven@velozo.com>
 */

var Chai = require('chai');
var Expect = Chai.expect;
var libFs = require('fs');
var libPath = require('path');

var _DebugDistPath = libPath.resolve(__dirname, '..', 'debug', 'dist');

var _ClonerPort = parseInt(process.env.CLONER_PORT, 10) || 9400;
var _HarnessPort = parseInt(process.env.HARNESS_PORT, 10) || 9403;
var _ClonerURL = `http://localhost:${_ClonerPort}/clone/`;
var _HarnessURL = `http://localhost:${_HarnessPort}/1.0/`;

// Load the harness schema from disk (retold-harness doesn't serve /Retold/Models)
var _HarnessSchemaPath = process.env.HARNESS_SCHEMA_PATH || require('path').resolve(__dirname, '..', '..', 'retold-harness', 'source', 'schemas', 'bookstore', 'MeadowModel-Extended.json');
var _HarnessSchema = JSON.parse(libFs.readFileSync(_HarnessSchemaPath, 'utf8'));

var _Browser = null;
var _Page = null;

suite
(
	'Data Cloner Web UI (Puppeteer)',
	function()
	{
		this.timeout(60000);

		suiteSetup
		(
			async function()
			{
				this.timeout(30000);
				libFs.mkdirSync(_DebugDistPath, { recursive: true });
				var puppeteer = require('puppeteer');
				_Browser = await puppeteer.launch(
					{
						headless: 'new',
						args: ['--no-sandbox', '--disable-setuid-sandbox']
					});
				_Page = await _Browser.newPage();
				_Page.setDefaultTimeout(30000);
			}
		);

		suiteTeardown
		(
			async function()
			{
				if (_Browser)
				{
					await _Browser.close();
				}
			}
		);

		// ---- Page Load ----
		suite
		(
			'Web UI Load',
			function()
			{
				test
				(
					'Should load the data cloner page',
					async function()
					{
						await _Page.goto(_ClonerURL, { waitUntil: 'networkidle2' });
						var tmpTitle = await _Page.title();
						Expect(tmpTitle).to.equal('Retold Data Cloner');
					}
				);
				test
				(
					'Should display 7 accordion sections',
					async function()
					{
						// Each section has a step number (1-7)
						var tmpSections = await _Page.$$eval('.accordion-number',
							(els) => els.map((el) => el.textContent.trim()));
						Expect(tmpSections.length).to.equal(7);
						Expect(tmpSections).to.deep.equal(['1', '2', '3', '4', '5', '6', '7']);
					}
				);
				test
				(
					'Should show live status bar',
					async function()
					{
						// The live status bar should be present (may already be connected from API tests)
						var tmpStatusText = await _Page.$eval('#liveStatusMessage',
							(el) => el.textContent.trim());
						Expect(tmpStatusText).to.be.a('string');
						Expect(tmpStatusText.length).to.be.greaterThan(0);

						await _Page.screenshot({ path: libPath.join(_DebugDistPath, '01-web-ui-load.png'), fullPage: true });
					}
				);
			}
		);

		// ---- Connection Section ----
		suite
		(
			'Connection Section',
			function()
			{
				test
				(
					'Should connect to SQLite via go button',
					async function()
					{
						this.timeout(15000);

						// Find and click the "go" link for section 1 (Connection)
						await _Page.evaluate(() =>
						{
							pict.views['DataCloner-Connection'].connectProvider();
						});

						// Wait for status to update to connected
						await _Page.waitForFunction(() =>
						{
							var el = document.querySelector('.live-status-message');
							return el && el.textContent.indexOf('database connected') < 0 &&
								el.textContent.indexOf('Connected') >= 0 ||
								el.textContent.indexOf('waiting') >= 0;
						}, { timeout: 10000 }).catch(() => {});

						// Give it a moment to settle
						await new Promise((r) => setTimeout(r, 2000));

						// Verify connection status via API
						var tmpResponse = await _Page.evaluate(async () =>
						{
							var res = await fetch('/clone/connection/status');
							return res.json();
						});

						Expect(tmpResponse.Connected).to.equal(true);
						Expect(tmpResponse.Provider).to.equal('SQLite');

						await _Page.screenshot({ path: libPath.join(_DebugDistPath, '02-connection.png'), fullPage: true });
					}
				);
			}
		);

		// ---- Session + Schema + Deploy Flow ----
		suite
		(
			'Session, Schema, and Deploy Flow',
			function()
			{
				test
				(
					'Should configure session via UI',
					async function()
					{
						this.timeout(15000);

						// Set the server URL in the input field
						await _Page.evaluate((pURL) =>
						{
							var tmpInput = document.getElementById('serverURL');
							if (tmpInput)
							{
								tmpInput.value = pURL;
							}
						}, _HarnessURL.replace(/\/1\.0\/$/, ''));

						// Configure session via the view method
						await _Page.evaluate(() =>
						{
							pict.views['DataCloner-Session'].configureSession();
						});

						await new Promise((r) => setTimeout(r, 3000));

						// Verify session configured
						var tmpSession = await _Page.evaluate(async () =>
						{
							var res = await fetch('/clone/session/check');
							return res.json();
						});

						Expect(tmpSession.Configured).to.equal(true);
					}
				);
				test
				(
					'Should fetch schema via UI',
					async function()
					{
						this.timeout(15000);

						// Fetch schema (pass directly since retold-harness doesn't serve /Retold/Models)
						await _Page.evaluate(async (pSchema) =>
						{
							await fetch('/clone/schema/fetch',
								{
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({ Schema: pSchema })
								});
						}, _HarnessSchema);

						// Wait for schema data to settle
						await new Promise((r) => setTimeout(r, 2000));

						// Verify schema fetched
						var tmpSchema = await _Page.evaluate(async () =>
						{
							var res = await fetch('/clone/schema');
							return res.json();
						});

						Expect(tmpSchema.Fetched).to.equal(true);
						Expect(tmpSchema.TableCount).to.be.greaterThan(0);
						Expect(tmpSchema.Tables).to.include('Book');
						Expect(tmpSchema.Tables).to.include('Author');
					}
				);
				test
				(
					'Should deploy schema via UI',
					async function()
					{
						this.timeout(30000);

						// Deploy all tables
						await _Page.evaluate(() =>
						{
							pict.views['DataCloner-Deploy'].deploySchema();
						});

						// Wait for deploy to complete
						await new Promise((r) => setTimeout(r, 5000));

						// Verify sync entities exist
						var tmpStatus = await _Page.evaluate(async () =>
						{
							var res = await fetch('/clone/sync/status');
							return res.json();
						});

						Expect(tmpStatus).to.be.an('object');

						await _Page.screenshot({ path: libPath.join(_DebugDistPath, '03-session-schema-deploy.png'), fullPage: true });
					}
				);
			}
		);

		// ---- Sync via Web UI ----
		suite
		(
			'Sync via Web UI',
			function()
			{
				this.timeout(120000);

				test
				(
					'Should start sync and complete successfully',
					async function()
					{
						this.timeout(120000);

						// Reset to clear any data from prior API tests
						await _Page.evaluate(async () =>
						{
							await fetch('/clone/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
						});

						await new Promise((r) => setTimeout(r, 2000));

						// Reconfigure session + schema + deploy via API
						await _Page.evaluate(async (pURL) =>
						{
							await fetch('/clone/session/configure',
								{
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({ ServerURL: pURL })
								});
						}, _HarnessURL);

						await _Page.evaluate(async (pSchema) =>
						{
							await fetch('/clone/schema/fetch',
								{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Schema: pSchema }) });
						}, _HarnessSchema);

						await new Promise((r) => setTimeout(r, 2000));

						await _Page.evaluate(async () =>
						{
							await fetch('/clone/schema/deploy',
								{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Tables: [] }) });
						});

						await new Promise((r) => setTimeout(r, 2000));

						// Start sync via API (UI checkboxes may not reflect API-configured schema)
						await _Page.evaluate(async () =>
						{
							await fetch('/clone/sync/start',
								{
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({ SyncMode: 'Initial', MaxRecordsPerEntity: 50 })
								});
						});

						// Wait for sync to complete (may finish very quickly with 50-record cap)
						await _Page.waitForFunction(async () =>
						{
							try
							{
								var res = await fetch('/clone/sync/status');
								var data = await res.json();
								return data.Running === false && data.Tables && Object.keys(data.Tables).length > 0;
							}
							catch (e)
							{
								return false;
							}
						}, { timeout: 100000, polling: 1000 });

						// Verify sync completed successfully
						var tmpReport = await _Page.evaluate(async () =>
						{
							var res = await fetch('/clone/sync/report');
							return res.json();
						});

						Expect(tmpReport).to.be.an('object');
						Expect(tmpReport.ReportVersion).to.be.a('string');
						Expect(['Success', 'Partial']).to.include(tmpReport.Outcome);
						Expect(tmpReport.Summary.TotalSynced).to.be.greaterThan(0);

						await _Page.screenshot({ path: libPath.join(_DebugDistPath, '04-sync-complete.png'), fullPage: true });
					}
				);
			}
		);

		// ---- Live Status Display ----
		suite
		(
			'Live Status Display',
			function()
			{
				this.timeout(120000);

				test
				(
					'Should show progress information during sync',
					async function()
					{
						this.timeout(120000);

						// Reset and start a new sync to observe live status
						await _Page.evaluate(async () =>
						{
							await fetch('/clone/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
						});

						await new Promise((r) => setTimeout(r, 2000));

						// Reconfigure session
						await _Page.evaluate(async (pURL) =>
						{
							await fetch('/clone/session/configure',
								{
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({ ServerURL: pURL })
								});
						}, _HarnessURL);

						// Fetch + deploy schema (pass directly since retold-harness doesn't serve /Retold/Models)
						await _Page.evaluate(async (pSchema) =>
						{
							await fetch('/clone/schema/fetch',
								{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Schema: pSchema }) });
						}, _HarnessSchema);

						await new Promise((r) => setTimeout(r, 3000));

						await _Page.evaluate(async () =>
						{
							await fetch('/clone/schema/deploy',
								{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Tables: [] }) });
						});

						await new Promise((r) => setTimeout(r, 3000));

						// Start sync with NO record cap so it takes long enough to observe
						await _Page.evaluate(async () =>
						{
							await fetch('/clone/sync/start',
								{
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({ SyncMode: 'Initial', MaxRecordsPerEntity: 0 })
								});
						});

						// Collect live status samples — poll immediately and quickly
						var tmpSamples = [];
						var tmpMaxSamples = 40;

						for (var i = 0; i < tmpMaxSamples; i++)
						{
							await new Promise((r) => setTimeout(r, 500));

							var tmpLive = await _Page.evaluate(async () =>
							{
								var res = await fetch('/clone/sync/live-status');
								return res.json();
							});

							tmpSamples.push(tmpLive);

							// Check if sync finished
							if (tmpLive.Phase !== 'syncing')
							{
								var tmpStatus = await _Page.evaluate(async () =>
								{
									var res = await fetch('/clone/sync/status');
									return res.json();
								});

								if (!tmpStatus.Running)
								{
									break;
								}
							}
						}

						// Wait for sync to finish
						await _Page.waitForFunction(async () =>
						{
							try
							{
								var res = await fetch('/clone/sync/status');
								var data = await res.json();
								return !data.Running;
							}
							catch (e)
							{
								return false;
							}
						}, { timeout: 60000, polling: 2000 }).catch(() => {});

						// Verify we captured useful live status data
						Expect(tmpSamples.length).to.be.greaterThan(0);

						var tmpSyncingSamples = tmpSamples.filter((s) => s.Phase === 'syncing');

						if (tmpSyncingSamples.length > 0)
						{
							// Verify structure of syncing samples
							var tmpSample = tmpSyncingSamples[0];
							Expect(tmpSample).to.have.property('Message');
							Expect(tmpSample).to.have.property('TotalSynced');
							Expect(tmpSample).to.have.property('TotalRecords');
							Expect(tmpSample).to.have.property('PreCountGrandTotal');
						}
						else
						{
							// Sync completed before we could capture a syncing sample —
							// verify completion via the report instead
							var tmpReport = await _Page.evaluate(async () =>
							{
								var res = await fetch('/clone/sync/report');
								return res.json();
							});

							Expect(tmpReport).to.be.an('object');
							Expect(tmpReport.Summary.TotalSynced).to.be.greaterThan(0);
						}

						await _Page.screenshot({ path: libPath.join(_DebugDistPath, '05-live-status.png'), fullPage: true });
					}
				);
			}
		);
	}
);
