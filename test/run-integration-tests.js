#!/usr/bin/env node
/**
 * Data Cloner Integration Test Runner
 *
 * Starts retold-harness and data-cloner servers, runs integration tests,
 * collects timing data, and generates a summary report.
 *
 * Usage:
 *   node test/run-integration-tests.js [--skip-puppeteer] [--engines sqlite,mysql]
 *
 * @license MIT
 * @author <steven@velozo.com>
 */

const libChildProcess = require('child_process');
const libFs = require('fs');
const libPath = require('path');
const libOs = require('os');
const libHttp = require('http');

// ---- Configuration ----
const _HarnessPort = 9403;
const _ClonerPort = 9400;
const _HarnessBaseURL = `http://localhost:${_HarnessPort}`;
const _ClonerBaseURL = `http://localhost:${_ClonerPort}`;
const _RetoldRoot = libPath.resolve(__dirname, '..', '..', '..', '..');
const _HarnessDir = libPath.resolve(_RetoldRoot, 'modules', 'meadow', 'retold-harness');
const _ClonerDir = libPath.resolve(__dirname, '..');
const _HealthTimeout = 30000;
const _OverallTimeout = 600000;

// ---- Parse CLI args ----
let _SkipPuppeteer = process.argv.includes('--skip-puppeteer');
let _EngineArg = process.argv.find((a) => a.startsWith('--engines='));
let _RequestedEngines = _EngineArg ? _EngineArg.split('=')[1].split(',') : ['sqlite'];

// ---- State ----
let _HarnessProcess = null;
let _ClonerProcess = null;
let _TempDir = null;
let _Report = {
	timestamp: new Date().toISOString(),
	duration_ms: 0,
	summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
	storage_engines: {},
	suites: [],
	puppeteer: { available: false, suites: [] }
};

// ---- Helpers ----

function fLog(pMessage)
{
	let tmpTime = new Date().toISOString().substring(11, 19);
	console.log(`[${tmpTime}] ${pMessage}`);
}

function fHttpGet(pURL, fCallback)
{
	let tmpReq = libHttp.get(pURL,
		(pRes) =>
		{
			let tmpChunks = [];
			pRes.on('data', (pChunk) => tmpChunks.push(pChunk));
			pRes.on('end', () =>
			{
				try
				{
					let tmpData = JSON.parse(Buffer.concat(tmpChunks).toString());
					return fCallback(null, tmpData);
				}
				catch (pParseError)
				{
					return fCallback(null, Buffer.concat(tmpChunks).toString());
				}
			});
		});
	tmpReq.on('error', (pError) => fCallback(pError));
	tmpReq.setTimeout(5000, () => { tmpReq.destroy(); fCallback(new Error('timeout')); });
}

function fWaitForHealth(pURL, pLabel, fCallback)
{
	let tmpStart = Date.now();

	let fPoll = () =>
	{
		if (Date.now() - tmpStart > _HealthTimeout)
		{
			return fCallback(new Error(`${pLabel} did not become healthy within ${_HealthTimeout / 1000}s`));
		}

		fHttpGet(pURL,
			(pError) =>
			{
				if (!pError)
				{
					return fCallback();
				}
				setTimeout(fPoll, 500);
			});
	};

	setTimeout(fPoll, 1000);
}

function fKillProcess(pProcess, pLabel)
{
	if (!pProcess || pProcess.exitCode !== null)
	{
		return;
	}

	fLog(`Stopping ${pLabel}...`);
	pProcess.kill('SIGTERM');

	setTimeout(() =>
	{
		if (pProcess.exitCode === null)
		{
			fLog(`Force-killing ${pLabel}...`);
			pProcess.kill('SIGKILL');
		}
	}, 5000);
}

function fCleanup()
{
	fKillProcess(_HarnessProcess, 'retold-harness');
	fKillProcess(_ClonerProcess, 'data-cloner');

	if (_TempDir && libFs.existsSync(_TempDir))
	{
		try
		{
			libFs.rmSync(_TempDir, { recursive: true, force: true });
			fLog(`Cleaned up temp dir: ${_TempDir}`);
		}
		catch (pErr)
		{
			fLog(`Warning: could not clean temp dir: ${pErr.message}`);
		}
	}
}

function fFormatDuration(pMs)
{
	if (pMs < 1000) return `${pMs}ms`;
	let tmpSec = (pMs / 1000).toFixed(1);
	if (pMs < 60000) return `${tmpSec}s`;
	let tmpMin = Math.floor(pMs / 60000);
	tmpSec = ((pMs % 60000) / 1000).toFixed(0);
	return `${tmpMin}m ${tmpSec}s`;
}

function fPrintReport()
{
	console.log('\n' + '='.repeat(72));
	console.log('  DATA CLONER INTEGRATION TEST REPORT');
	console.log('='.repeat(72));
	console.log(`  Timestamp:  ${_Report.timestamp}`);
	console.log(`  Duration:   ${fFormatDuration(_Report.duration_ms)}`);
	console.log(`  Total:      ${_Report.summary.total}`);
	console.log(`  Passed:     ${_Report.summary.passed}`);
	console.log(`  Failed:     ${_Report.summary.failed}`);
	console.log(`  Skipped:    ${_Report.summary.skipped}`);
	console.log('-'.repeat(72));

	// Build storage engine status from suite results
	let tmpStorageEnginePrefix = 'Storage Engine: ';
	for (let i = 0; i < _Report.suites.length; i++)
	{
		let tmpSuite = _Report.suites[i];
		if (tmpSuite.name.indexOf(tmpStorageEnginePrefix) !== 0) continue;

		let tmpEngineName = tmpSuite.name.substring(tmpStorageEnginePrefix.length);
		let tmpPassCount = tmpSuite.tests.filter((t) => t.status === 'pass').length;
		let tmpFailCount = tmpSuite.tests.filter((t) => t.status === 'fail').length;
		let tmpSkipCount = tmpSuite.tests.filter((t) => t.status === 'skip').length;

		if (tmpSkipCount === tmpSuite.tests.length)
		{
			_Report.storage_engines[tmpEngineName] = { status: 'skip', reason: 'Not configured (env vars not set)' };
		}
		else if (tmpFailCount > 0)
		{
			let tmpFirstError = tmpSuite.tests.find((t) => t.status === 'fail');
			_Report.storage_engines[tmpEngineName] = { status: 'fail', error: tmpFirstError ? tmpFirstError.error : 'Unknown' };
		}
		else
		{
			_Report.storage_engines[tmpEngineName] = { status: 'pass', sync_duration_ms: tmpSuite.duration_ms, records_synced: 0, tables_synced: 0 };
		}
	}

	// Storage engines
	let tmpEngines = Object.keys(_Report.storage_engines);
	if (tmpEngines.length > 0)
	{
		console.log('\n  Storage Engines:');
		for (let i = 0; i < tmpEngines.length; i++)
		{
			let tmpName = tmpEngines[i];
			let tmpEngine = _Report.storage_engines[tmpName];
			if (tmpEngine.status === 'pass')
			{
				console.log(`    ${tmpName.padEnd(14)} PASS   ${fFormatDuration(tmpEngine.sync_duration_ms).padStart(10)}   ${tmpEngine.records_synced} records / ${tmpEngine.tables_synced} tables`);
			}
			else if (tmpEngine.status === 'fail')
			{
				console.log(`    ${tmpName.padEnd(14)} FAIL   ${tmpEngine.error || 'Unknown error'}`);
			}
			else
			{
				console.log(`    ${tmpName.padEnd(14)} SKIP   ${tmpEngine.reason || ''}`);
			}
		}
	}

	// Suites
	console.log('\n  Test Suites:');
	for (let i = 0; i < _Report.suites.length; i++)
	{
		let tmpSuite = _Report.suites[i];
		let tmpPassCount = tmpSuite.tests.filter((t) => t.status === 'pass').length;
		let tmpFailCount = tmpSuite.tests.filter((t) => t.status === 'fail').length;
		let tmpSkipCount = tmpSuite.tests.filter((t) => t.status === 'skip').length;

		if (tmpSkipCount === tmpSuite.tests.length && tmpSuite.tests.length > 0)
		{
			// All tests in this suite were skipped
			console.log(`    ~ ${tmpSuite.name.padEnd(35)} skipped`);
			continue;
		}

		let tmpStatus = tmpFailCount > 0 ? 'FAIL' : 'PASS';
		let tmpSkipLabel = tmpSkipCount > 0 ? ` (${tmpSkipCount} skipped)` : '';
		console.log(`    ${tmpStatus === 'FAIL' ? 'X' : '+'} ${tmpSuite.name.padEnd(35)} ${tmpPassCount}/${tmpPassCount + tmpFailCount} passed   ${fFormatDuration(tmpSuite.duration_ms)}${tmpSkipLabel}`);

		// Show failed tests
		for (let j = 0; j < tmpSuite.tests.length; j++)
		{
			if (tmpSuite.tests[j].status === 'fail')
			{
				console.log(`        FAIL: ${tmpSuite.tests[j].name}`);
				if (tmpSuite.tests[j].error)
				{
					console.log(`              ${tmpSuite.tests[j].error.substring(0, 120)}`);
				}
			}
		}
	}

	// Puppeteer
	if (_Report.puppeteer.available && _Report.puppeteer.suites.length > 0)
	{
		console.log('\n  Puppeteer Tests:');
		for (let i = 0; i < _Report.puppeteer.suites.length; i++)
		{
			let tmpSuite = _Report.puppeteer.suites[i];
			let tmpPassCount = tmpSuite.tests.filter((t) => t.status === 'pass').length;
			let tmpFailCount = tmpSuite.tests.filter((t) => t.status === 'fail').length;
			let tmpStatus = tmpFailCount > 0 ? 'FAIL' : 'PASS';
			console.log(`    ${tmpStatus === 'FAIL' ? 'X' : '+'} ${tmpSuite.name.padEnd(35)} ${tmpPassCount}/${tmpSuite.tests.length} passed   ${fFormatDuration(tmpSuite.duration_ms)}`);
		}
	}

	console.log('\n' + '='.repeat(72) + '\n');
}

// ---- Main ----

let tmpOverallStart = Date.now();

// Create temp directory for SQLite
_TempDir = libPath.join(libOs.tmpdir(), `retold-cloner-test-${Date.now()}`);
libFs.mkdirSync(libPath.join(_TempDir, 'data'), { recursive: true });
fLog(`Temp directory: ${_TempDir}`);

// Handle cleanup on exit
process.on('SIGINT', () => { fCleanup(); process.exit(1); });
process.on('SIGTERM', () => { fCleanup(); process.exit(1); });
process.on('uncaughtException', (pErr) => { console.error('Uncaught:', pErr); fCleanup(); process.exit(1); });

// Step 1: Start retold-harness
fLog(`Starting retold-harness on port ${_HarnessPort}...`);
_HarnessProcess = libChildProcess.spawn('node',
	['source/Retold-Harness.js'],
	{
		cwd: _HarnessDir,
		env: Object.assign({}, process.env, { PORT: String(_HarnessPort) }),
		stdio: ['ignore', 'pipe', 'pipe']
	});

_HarnessProcess.stdout.on('data', (pData) =>
{
	let tmpLines = pData.toString().trim().split('\n');
	for (let i = 0; i < tmpLines.length; i++)
	{
		if (tmpLines[i].indexOf('error') > -1 || tmpLines[i].indexOf('Error') > -1)
		{
			fLog(`[harness] ${tmpLines[i]}`);
		}
	}
});
_HarnessProcess.stderr.on('data', (pData) => fLog(`[harness stderr] ${pData.toString().trim()}`));
_HarnessProcess.on('exit', (pCode) => fLog(`retold-harness exited with code ${pCode}`));

// Step 2: Start data-cloner
fLog(`Starting data-cloner on port ${_ClonerPort}...`);
_ClonerProcess = libChildProcess.spawn('node',
	[libPath.join(_ClonerDir, 'bin', 'retold-data-service-clone.js'), '--port', String(_ClonerPort)],
	{
		cwd: _TempDir,
		env: Object.assign({}, process.env),
		stdio: ['ignore', 'pipe', 'pipe']
	});

_ClonerProcess.stdout.on('data', (pData) =>
{
	let tmpLines = pData.toString().trim().split('\n');
	for (let i = 0; i < tmpLines.length; i++)
	{
		if (tmpLines[i].indexOf('error') > -1 || tmpLines[i].indexOf('Error') > -1)
		{
			fLog(`[cloner] ${tmpLines[i]}`);
		}
	}
});
_ClonerProcess.stderr.on('data', (pData) => fLog(`[cloner stderr] ${pData.toString().trim()}`));
_ClonerProcess.on('exit', (pCode) => fLog(`data-cloner exited with code ${pCode}`));

// Step 3: Wait for both servers to be healthy
fLog('Waiting for servers to become healthy...');
fWaitForHealth(`${_HarnessBaseURL}/1.0/Books/Count`, 'retold-harness',
	(pHarnessError) =>
	{
		if (pHarnessError)
		{
			console.error(pHarnessError.message);
			fCleanup();
			process.exit(1);
		}
		fLog('retold-harness is healthy.');

		fWaitForHealth(`${_ClonerBaseURL}/clone/sync/status`, 'data-cloner',
			(pClonerError) =>
			{
				if (pClonerError)
				{
					console.error(pClonerError.message);
					fCleanup();
					process.exit(1);
				}
				fLog('data-cloner is healthy.');
				fLog('Both servers healthy. Running tests...\n');

				// Step 4: Run Mocha programmatically
				let Mocha = require('mocha');
				let tmpMocha = new Mocha(
					{
						ui: 'tdd',
						timeout: 120000,
						slow: 5000,
						reporter: 'spec'
					});

				// Set env vars for tests
				process.env.CLONER_PORT = String(_ClonerPort);
				process.env.HARNESS_PORT = String(_HarnessPort);
				process.env.CLONER_TEMP_DIR = _TempDir;
				process.env.REQUESTED_ENGINES = _RequestedEngines.join(',');
				process.env.HARNESS_SCHEMA_PATH = libPath.join(_HarnessDir, 'source', 'schemas', 'bookstore', 'MeadowModel-Extended.json');

				tmpMocha.addFile(libPath.join(__dirname, 'DataCloner-Integration_tests.js'));

				// Collect results
				let tmpSuiteMap = {};
				let tmpCurrentSuite = null;

				let tmpRunner = tmpMocha.run(
					(pFailures) =>
					{
						// Finalize suite data
						let tmpSuiteNames = Object.keys(tmpSuiteMap);
						for (let i = 0; i < tmpSuiteNames.length; i++)
						{
							let tmpS = tmpSuiteMap[tmpSuiteNames[i]];
							tmpS.duration_ms = tmpS.tests.reduce((a, t) => a + t.duration_ms, 0);
							_Report.suites.push(tmpS);
						}

						_Report.summary.total = tmpRunner.stats.tests;
						_Report.summary.passed = tmpRunner.stats.passes;
						_Report.summary.failed = tmpRunner.stats.failures;
						_Report.summary.skipped = tmpRunner.stats.pending || 0;

						// Step 5: Optionally run Puppeteer tests
						let fFinish = () =>
						{
							_Report.duration_ms = Date.now() - tmpOverallStart;

							// Write report
							let tmpReportPath = libPath.join(__dirname, 'integration-report.json');
							try
							{
								libFs.writeFileSync(tmpReportPath, JSON.stringify(_Report, null, '\t'), 'utf8');
								fLog(`Report written to ${tmpReportPath}`);
							}
							catch (pWriteErr)
							{
								fLog(`Warning: could not write report: ${pWriteErr.message}`);
							}

							fPrintReport();
							fCleanup();
							process.exit(pFailures > 0 ? 1 : 0);
						};

						if (!_SkipPuppeteer)
						{
							try
							{
								require.resolve('puppeteer');
								_Report.puppeteer.available = true;
								fLog('\nRunning Puppeteer tests...');

								let tmpPuppeteerMocha = new Mocha(
									{
										ui: 'tdd',
										timeout: 60000,
										slow: 10000,
										reporter: 'spec'
									});

								let tmpPuppeteerTestPath = libPath.join(__dirname, 'DataCloner-Puppeteer_tests.js');
								if (libFs.existsSync(tmpPuppeteerTestPath))
								{
									tmpPuppeteerMocha.addFile(tmpPuppeteerTestPath);

									let tmpPuppeteerSuiteMap = {};
									let tmpPRunner = tmpPuppeteerMocha.run(
										(pPuppeteerFailures) =>
										{
											let tmpPSuiteNames = Object.keys(tmpPuppeteerSuiteMap);
											for (let i = 0; i < tmpPSuiteNames.length; i++)
											{
												let tmpPS = tmpPuppeteerSuiteMap[tmpPSuiteNames[i]];
												tmpPS.duration_ms = tmpPS.tests.reduce((a, t) => a + t.duration_ms, 0);
												_Report.puppeteer.suites.push(tmpPS);
											}
											_Report.summary.total += tmpPRunner.stats.tests;
											_Report.summary.passed += tmpPRunner.stats.passes;
											_Report.summary.failed += tmpPRunner.stats.failures;
											fFinish();
										});

									tmpPRunner.on('suite', (pSuite) =>
									{
										if (pSuite.title && pSuite.title !== '')
										{
											tmpPuppeteerSuiteMap[pSuite.title] = { name: pSuite.title, tests: [], duration_ms: 0 };
										}
									});
									tmpPRunner.on('pass', (pTest) =>
									{
										let tmpSuiteName = pTest.parent ? pTest.parent.title : 'Unknown';
										if (tmpPuppeteerSuiteMap[tmpSuiteName])
										{
											tmpPuppeteerSuiteMap[tmpSuiteName].tests.push({ name: pTest.title, status: 'pass', duration_ms: pTest.duration || 0 });
										}
									});
									tmpPRunner.on('fail', (pTest, pErr) =>
									{
										let tmpSuiteName = pTest.parent ? pTest.parent.title : 'Unknown';
										if (tmpPuppeteerSuiteMap[tmpSuiteName])
										{
											tmpPuppeteerSuiteMap[tmpSuiteName].tests.push({ name: pTest.title, status: 'fail', duration_ms: pTest.duration || 0, error: pErr.message });
										}
									});
								}
								else
								{
									fLog('Puppeteer test file not found, skipping.');
									fFinish();
								}
							}
							catch (pResolveErr)
							{
								fLog('Puppeteer not installed, skipping browser tests. Install with: npm install --save-dev puppeteer');
								fFinish();
							}
						}
						else
						{
							fLog('Skipping Puppeteer tests (--skip-puppeteer).');
							fFinish();
						}
					});

				// Collect per-test timing
				tmpRunner.on('suite', (pSuite) =>
				{
					if (pSuite.title && pSuite.title !== '')
					{
						tmpCurrentSuite = pSuite.title;
						if (!tmpSuiteMap[tmpCurrentSuite])
						{
							tmpSuiteMap[tmpCurrentSuite] = { name: tmpCurrentSuite, tests: [], duration_ms: 0 };
						}
					}
				});
				tmpRunner.on('pass', (pTest) =>
				{
					let tmpSuiteName = pTest.parent ? pTest.parent.title : tmpCurrentSuite || 'Unknown';
					if (!tmpSuiteMap[tmpSuiteName])
					{
						tmpSuiteMap[tmpSuiteName] = { name: tmpSuiteName, tests: [], duration_ms: 0 };
					}
					tmpSuiteMap[tmpSuiteName].tests.push({ name: pTest.title, status: 'pass', duration_ms: pTest.duration || 0 });
				});
				tmpRunner.on('fail', (pTest, pErr) =>
				{
					let tmpSuiteName = pTest.parent ? pTest.parent.title : tmpCurrentSuite || 'Unknown';
					if (!tmpSuiteMap[tmpSuiteName])
					{
						tmpSuiteMap[tmpSuiteName] = { name: tmpSuiteName, tests: [], duration_ms: 0 };
					}
					tmpSuiteMap[tmpSuiteName].tests.push({ name: pTest.title, status: 'fail', duration_ms: pTest.duration || 0, error: pErr.message });
				});
				tmpRunner.on('pending', (pTest) =>
				{
					let tmpSuiteName = pTest.parent ? pTest.parent.title : tmpCurrentSuite || 'Unknown';
					if (!tmpSuiteMap[tmpSuiteName])
					{
						tmpSuiteMap[tmpSuiteName] = { name: tmpSuiteName, tests: [], duration_ms: 0 };
					}
					tmpSuiteMap[tmpSuiteName].tests.push({ name: pTest.title, status: 'skip', duration_ms: 0 });
				});
			});
	});
