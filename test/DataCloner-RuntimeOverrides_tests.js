/**
 * Unit tests for DataCloner-Command-Sync runtime override application.
 *
 * Pure-function tests for `applyRuntimeSyncOverrides` and the
 * `_RuntimeSyncProperties` coercion map. No server boot required.
 *
 * @license MIT
 */

var Chai = require('chai');
var Expect = Chai.expect;

var libSyncCommand = require('../source/services/data-cloner/DataCloner-Command-Sync.js');
var _RuntimeSyncProperties = libSyncCommand._RuntimeSyncProperties;
var applyRuntimeSyncOverrides = libSyncCommand.applyRuntimeSyncOverrides;

// ---- Test helpers ----

var fMakeMeadowSync = (pEntityNames) =>
{
	var tmpEntities = {};
	for (var i = 0; i < pEntityNames.length; i++)
	{
		tmpEntities[pEntityNames[i]] = {};
	}
	// Orchestrator-level properties present here are the ones that get mirrored
	// from the request body (BackSyncTimeLimit, DateTimePrecisionMS, TrueUpPageSize).
	return {
		BackSyncTimeLimit: 30000,
		DateTimePrecisionMS: 1000,
		TrueUpPageSize: 500,
		MeadowSyncEntities: tmpEntities
	};
};

var fMakeLog = () =>
{
	var tmpEntries = [];
	return {
		info: (pMsg) => tmpEntries.push({ level: 'info', msg: pMsg }),
		warn: (pMsg) => tmpEntries.push({ level: 'warn', msg: pMsg }),
		Entries: tmpEntries,
		InfosWithText: (pText) => tmpEntries.filter((p) => p.level === 'info' && p.msg.indexOf(pText) > -1),
		Warns: () => tmpEntries.filter((p) => p.level === 'warn'),
		Infos: () => tmpEntries.filter((p) => p.level === 'info')
	};
};

suite
(
	'DataCloner Runtime Sync Overrides',
	function()
	{
		suite
		(
			'_RuntimeSyncProperties coercion map',
			function()
			{
				test('BackSyncTimeLimit: accepts positive integer', function()
				{
					Expect(_RuntimeSyncProperties.BackSyncTimeLimit(60000)).to.equal(60000);
				});
				test('BackSyncTimeLimit: coerces numeric string', function()
				{
					Expect(_RuntimeSyncProperties.BackSyncTimeLimit('1800000')).to.equal(1800000);
				});
				test('BackSyncTimeLimit: rejects zero', function()
				{
					Expect(_RuntimeSyncProperties.BackSyncTimeLimit(0)).to.equal(null);
				});
				test('BackSyncTimeLimit: rejects negative', function()
				{
					Expect(_RuntimeSyncProperties.BackSyncTimeLimit(-100)).to.equal(null);
				});
				test('BackSyncTimeLimit: rejects non-numeric string', function()
				{
					Expect(_RuntimeSyncProperties.BackSyncTimeLimit('garbage')).to.equal(null);
				});
				test('MaxRecordsPerEntity: rejects zero (matches pre-refactor semantics)', function()
				{
					Expect(_RuntimeSyncProperties.MaxRecordsPerEntity(0)).to.equal(null);
				});
				test('MaxRecordsPerEntity: accepts positive', function()
				{
					Expect(_RuntimeSyncProperties.MaxRecordsPerEntity(500)).to.equal(500);
				});
				test('DateTimePrecisionMS: allows zero (any integer)', function()
				{
					Expect(_RuntimeSyncProperties.DateTimePrecisionMS(0)).to.equal(0);
				});
				test('DateTimePrecisionMS: rejects NaN', function()
				{
					Expect(_RuntimeSyncProperties.DateTimePrecisionMS('nope')).to.equal(null);
				});
				test('TrueUpPageSize: accepts positive integer', function()
				{
					Expect(_RuntimeSyncProperties.TrueUpPageSize(250)).to.equal(250);
				});
				test('UseAdvancedIDPagination: truthy → true', function()
				{
					Expect(_RuntimeSyncProperties.UseAdvancedIDPagination(1)).to.equal(true);
					Expect(_RuntimeSyncProperties.UseAdvancedIDPagination('yes')).to.equal(true);
				});
				test('UseAdvancedIDPagination: falsy → false', function()
				{
					Expect(_RuntimeSyncProperties.UseAdvancedIDPagination(0)).to.equal(false);
					Expect(_RuntimeSyncProperties.UseAdvancedIDPagination('')).to.equal(false);
					Expect(_RuntimeSyncProperties.UseAdvancedIDPagination(null)).to.equal(false);
				});
				test('SyncDeletedRecords: coerces to boolean', function()
				{
					Expect(_RuntimeSyncProperties.SyncDeletedRecords(true)).to.equal(true);
					Expect(_RuntimeSyncProperties.SyncDeletedRecords(false)).to.equal(false);
				});
			}
		);

		suite
		(
			'applyRuntimeSyncOverrides — global (top-level) body keys',
			function()
			{
				test('Empty body leaves everything alone', function()
				{
					var tmpSync = fMakeMeadowSync(['Document', 'Attachment']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({}, tmpSync, tmpClone, tmpLog);
					Expect(tmpSync.BackSyncTimeLimit).to.equal(30000);
					Expect(tmpSync.MeadowSyncEntities.Document).to.deep.equal({});
					Expect(tmpSync.MeadowSyncEntities.Attachment).to.deep.equal({});
					Expect(tmpClone.SyncDeletedRecords).to.equal(false);
					Expect(tmpLog.Entries).to.have.lengthOf(0);
				});

				test('BackSyncTimeLimit mirrors to orchestrator and every entity', function()
				{
					var tmpSync = fMakeMeadowSync(['Document', 'Attachment']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({ BackSyncTimeLimit: 60000 }, tmpSync, tmpClone, tmpLog);
					Expect(tmpSync.BackSyncTimeLimit).to.equal(60000);
					Expect(tmpSync.MeadowSyncEntities.Document.BackSyncTimeLimit).to.equal(60000);
					Expect(tmpSync.MeadowSyncEntities.Attachment.BackSyncTimeLimit).to.equal(60000);
					// No per-entity overrides → no info log lines
					Expect(tmpLog.Infos()).to.have.lengthOf(0);
				});

				test('Numeric-string BackSyncTimeLimit is coerced to integer', function()
				{
					var tmpSync = fMakeMeadowSync(['Document']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({ BackSyncTimeLimit: '1800000' }, tmpSync, tmpClone, tmpLog);
					Expect(tmpSync.MeadowSyncEntities.Document.BackSyncTimeLimit).to.equal(1800000);
					Expect(typeof tmpSync.MeadowSyncEntities.Document.BackSyncTimeLimit).to.equal('number');
				});

				test('Invalid BackSyncTimeLimit leaves everything unchanged', function()
				{
					var tmpSync = fMakeMeadowSync(['Document']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({ BackSyncTimeLimit: 'oops' }, tmpSync, tmpClone, tmpLog);
					Expect(tmpSync.BackSyncTimeLimit).to.equal(30000); // original
					Expect(tmpSync.MeadowSyncEntities.Document).to.deep.equal({});
				});

				test('SyncDeletedRecords mirrors to cloneState and entities', function()
				{
					var tmpSync = fMakeMeadowSync(['Document', 'Attachment']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({ SyncDeletedRecords: true }, tmpSync, tmpClone, tmpLog);
					Expect(tmpClone.SyncDeletedRecords).to.equal(true);
					Expect(tmpSync.MeadowSyncEntities.Document.SyncDeletedRecords).to.equal(true);
					Expect(tmpSync.MeadowSyncEntities.Attachment.SyncDeletedRecords).to.equal(true);
				});

				test('SyncDeletedRecords explicit false is honored', function()
				{
					var tmpSync = fMakeMeadowSync(['Document']);
					tmpSync.MeadowSyncEntities.Document.SyncDeletedRecords = true;
					var tmpClone = { SyncDeletedRecords: true };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({ SyncDeletedRecords: false }, tmpSync, tmpClone, tmpLog);
					Expect(tmpClone.SyncDeletedRecords).to.equal(false);
					Expect(tmpSync.MeadowSyncEntities.Document.SyncDeletedRecords).to.equal(false);
				});

				test('Orchestrator mirror only fires for keys present on orchestrator', function()
				{
					// UseAdvancedIDPagination is NOT a property the orchestrator carries
					// — it only flows to entities. Verify we don't accidentally add it
					// to the orchestrator.
					var tmpSync = fMakeMeadowSync(['Document']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({ UseAdvancedIDPagination: true }, tmpSync, tmpClone, tmpLog);
					Expect(tmpSync.hasOwnProperty('UseAdvancedIDPagination')).to.equal(false);
					Expect(tmpSync.MeadowSyncEntities.Document.UseAdvancedIDPagination).to.equal(true);
				});
			}
		);

		suite
		(
			'applyRuntimeSyncOverrides — per-entity SyncEntityOptions',
			function()
			{
				test('Per-entity override targets only the named entity', function()
				{
					var tmpSync = fMakeMeadowSync(['Document', 'Attachment']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({
						SyncEntityOptions: { Document: { BackSyncTimeLimit: 600000 } }
					}, tmpSync, tmpClone, tmpLog);
					Expect(tmpSync.MeadowSyncEntities.Document.BackSyncTimeLimit).to.equal(600000);
					Expect(tmpSync.MeadowSyncEntities.Attachment.BackSyncTimeLimit).to.equal(undefined);
				});

				test('Per-entity override emits one info log per entity with applied keys', function()
				{
					var tmpSync = fMakeMeadowSync(['Document']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({
						SyncEntityOptions: { Document: { BackSyncTimeLimit: 600000 } }
					}, tmpSync, tmpClone, tmpLog);
					var tmpInfo = tmpLog.Infos();
					Expect(tmpInfo).to.have.lengthOf(1);
					Expect(tmpInfo[0].msg).to.include('Document');
					Expect(tmpInfo[0].msg).to.include('BackSyncTimeLimit=600000');
				});

				test('Per-entity wins over global', function()
				{
					var tmpSync = fMakeMeadowSync(['Document', 'Attachment']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({
						BackSyncTimeLimit: 30000,
						SyncEntityOptions: { Document: { BackSyncTimeLimit: 600000 } }
					}, tmpSync, tmpClone, tmpLog);
					Expect(tmpSync.MeadowSyncEntities.Document.BackSyncTimeLimit).to.equal(600000);
					Expect(tmpSync.MeadowSyncEntities.Attachment.BackSyncTimeLimit).to.equal(30000);
				});

				test('Multiple per-entity overrides apply independently', function()
				{
					var tmpSync = fMakeMeadowSync(['Document', 'Attachment', 'Note']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({
						BackSyncTimeLimit: 30000,
						SyncEntityOptions: {
							Document: { BackSyncTimeLimit: 600000 },
							Attachment: { BackSyncTimeLimit: 120000 }
						}
					}, tmpSync, tmpClone, tmpLog);
					Expect(tmpSync.MeadowSyncEntities.Document.BackSyncTimeLimit).to.equal(600000);
					Expect(tmpSync.MeadowSyncEntities.Attachment.BackSyncTimeLimit).to.equal(120000);
					Expect(tmpSync.MeadowSyncEntities.Note.BackSyncTimeLimit).to.equal(30000);
					Expect(tmpLog.Infos()).to.have.lengthOf(2);
				});

				test('Unknown entity name produces a warn, not a throw', function()
				{
					var tmpSync = fMakeMeadowSync(['Document']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({
						SyncEntityOptions: { ImaginaryTable: { BackSyncTimeLimit: 60000 } }
					}, tmpSync, tmpClone, tmpLog);
					var tmpWarn = tmpLog.Warns();
					Expect(tmpWarn).to.have.lengthOf(1);
					Expect(tmpWarn[0].msg).to.include('ImaginaryTable');
				});

				test('Unknown property inside SyncEntityOptions[entity] is ignored', function()
				{
					var tmpSync = fMakeMeadowSync(['Document']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({
						SyncEntityOptions: { Document: { GarbageKey: 'whatever', BackSyncTimeLimit: 60000 } }
					}, tmpSync, tmpClone, tmpLog);
					Expect(tmpSync.MeadowSyncEntities.Document.BackSyncTimeLimit).to.equal(60000);
					Expect(tmpSync.MeadowSyncEntities.Document.GarbageKey).to.equal(undefined);
				});

				test('Per-entity override with no valid keys produces no log line', function()
				{
					var tmpSync = fMakeMeadowSync(['Document']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({
						SyncEntityOptions: { Document: { BackSyncTimeLimit: 'garbage' } }
					}, tmpSync, tmpClone, tmpLog);
					Expect(tmpLog.Infos()).to.have.lengthOf(0);
					Expect(tmpSync.MeadowSyncEntities.Document.BackSyncTimeLimit).to.equal(undefined);
				});

				test('Non-object SyncEntityOptions is ignored (no throw)', function()
				{
					var tmpSync = fMakeMeadowSync(['Document']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({
						SyncEntityOptions: 'oops',
						BackSyncTimeLimit: 60000
					}, tmpSync, tmpClone, tmpLog);
					Expect(tmpSync.MeadowSyncEntities.Document.BackSyncTimeLimit).to.equal(60000);
				});

				test('Null SyncEntityOptions is ignored (no throw)', function()
				{
					var tmpSync = fMakeMeadowSync(['Document']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({ SyncEntityOptions: null, BackSyncTimeLimit: 60000 }, tmpSync, tmpClone, tmpLog);
					Expect(tmpSync.MeadowSyncEntities.Document.BackSyncTimeLimit).to.equal(60000);
				});

				test('Per-entity SyncDeletedRecords does NOT mirror to cloneState', function()
				{
					// Per-entity overrides target a specific entity; cloneState is a
					// cross-cutting "is delete-sync enabled at all?" flag and should
					// only be mirrored from the global value.
					var tmpSync = fMakeMeadowSync(['Document', 'Attachment']);
					var tmpClone = { SyncDeletedRecords: false };
					var tmpLog = fMakeLog();
					applyRuntimeSyncOverrides({
						SyncEntityOptions: { Document: { SyncDeletedRecords: true } }
					}, tmpSync, tmpClone, tmpLog);
					Expect(tmpClone.SyncDeletedRecords).to.equal(false);
					Expect(tmpSync.MeadowSyncEntities.Document.SyncDeletedRecords).to.equal(true);
					Expect(tmpSync.MeadowSyncEntities.Attachment.SyncDeletedRecords).to.equal(undefined);
				});
			}
		);
	}
);
