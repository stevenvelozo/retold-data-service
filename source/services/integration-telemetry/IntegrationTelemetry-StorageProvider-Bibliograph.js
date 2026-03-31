/**
 * Integration Telemetry — Bibliograph Storage Provider
 *
 * Default out-of-the-box persistence backed by Bibliograph (parime JSON store).
 * Uses sequential keys with hashed RunIDs for file naming.
 *
 * Source naming convention:
 *   - Per-tenant:  telemetry-runs-{TenantID}
 *   - Global:      telemetry-runs-global
 *
 * Key scheme:  {seq}-{hash8}   e.g. "000042-a1b2c3d4"
 *
 * @param {Object} pFable - The Fable instance
 * @param {Object} pOptions - Provider configuration
 */
const libIntegrationTelemetryStorageProviderBase = require('./IntegrationTelemetry-StorageProvider-Base.js');
const libCrypto = require('crypto');

class IntegrationTelemetryStorageProviderBibliograph extends libIntegrationTelemetryStorageProviderBase
{
	constructor(pFable, pOptions)
	{
		super(pFable, pOptions);

		this._sequenceCounters = {};
		this._sourceInitialized = {};
	}

	/**
	 * Get or create the Bibliograph service instance.
	 */
	get bibliograph()
	{
		if (!this.fable.Bibliograph)
		{
			let libBibliograph = require('bibliograph');
			this.fable.serviceManager.addServiceType('Bibliograph', libBibliograph);
			this.fable.serviceManager.instantiateServiceProvider('Bibliograph', this.options.Bibliograph || {});
		}
		return this.fable.Bibliograph;
	}

	/**
	 * Build the source hash for a tenant.
	 */
	tenantSource(pTenantID)
	{
		return `telemetry-runs-${pTenantID}`;
	}

	/**
	 * Build a deterministic 8-char hash from a RunID.
	 */
	hashRunID(pRunID)
	{
		return libCrypto.createHash('md5').update(pRunID).digest('hex').substring(0, 8);
	}

	/**
	 * Ensure a source exists, calling createSource only once per source.
	 */
	ensureSource(pSourceHash, fCallback)
	{
		if (this._sourceInitialized[pSourceHash])
		{
			return fCallback();
		}

		let tmpBibliograph = this.bibliograph;

		// Bibliograph FS Storage must be initialized before any operations.
		// The service is instantiated in the getter but initialize() is async
		// and must complete before createSource/read/write will work.
		if (tmpBibliograph.BibliographStorage && !tmpBibliograph.BibliographStorage.Initialized)
		{
			return tmpBibliograph.BibliographStorage.initialize(
				(pInitError) =>
				{
					if (pInitError)
					{
						this.fable.log.warn(`IntegrationTelemetry Bibliograph: Storage initialization error: ${pInitError}`);
					}
					tmpBibliograph.createSource(pSourceHash,
						(pError) =>
						{
							this._sourceInitialized[pSourceHash] = true;
							return fCallback();
						});
				});
		}

		tmpBibliograph.createSource(pSourceHash,
			(pError) =>
			{
				// Ignore "already exists" style errors
				this._sourceInitialized[pSourceHash] = true;
				return fCallback();
			});
	}

	/**
	 * Get the next sequence number for a source.
	 */
	nextSequence(pSourceHash)
	{
		if (!this._sequenceCounters.hasOwnProperty(pSourceHash))
		{
			this._sequenceCounters[pSourceHash] = 0;
		}
		this._sequenceCounters[pSourceHash]++;
		return this._sequenceCounters[pSourceHash].toString().padStart(6, '0');
	}

	/**
	 * Build the record key from a sequence number and RunID hash.
	 */
	buildKey(pSourceHash, pRunID)
	{
		let tmpSeq = this.nextSequence(pSourceHash);
		let tmpHash = this.hashRunID(pRunID);
		return `${tmpSeq}-${tmpHash}`;
	}

	// ================================================================
	// Write
	// ================================================================

	writeRun(pTenantID, pRunRecord, fCallback)
	{
		let tmpTenantSource = this.tenantSource(pTenantID);
		let tmpGlobalSource = 'telemetry-runs-global';

		this.ensureSource(tmpTenantSource,
			(pError) =>
			{
				if (pError)
				{
					this.fable.log.error(`IntegrationTelemetry Bibliograph: Error ensuring tenant source [${tmpTenantSource}]: ${pError}`);
				}

				this.ensureSource(tmpGlobalSource,
					(pError) =>
					{
						if (pError)
						{
							this.fable.log.error(`IntegrationTelemetry Bibliograph: Error ensuring global source: ${pError}`);
						}

						let tmpTenantKey = this.buildKey(tmpTenantSource, pRunRecord.RunID);
						let tmpGlobalKey = this.buildKey(tmpGlobalSource, pRunRecord.RunID);

						// Dual-write: tenant source + global source
						this.bibliograph.write(tmpTenantSource, tmpTenantKey, pRunRecord,
							(pWriteError) =>
							{
								if (pWriteError)
								{
									this.fable.log.error(`IntegrationTelemetry Bibliograph: Error writing tenant run: ${pWriteError}`);
									return fCallback(pWriteError);
								}

								this.bibliograph.write(tmpGlobalSource, tmpGlobalKey, pRunRecord,
									(pGlobalWriteError) =>
									{
										if (pGlobalWriteError)
										{
											this.fable.log.warn(`IntegrationTelemetry Bibliograph: Error writing global run (tenant copy succeeded): ${pGlobalWriteError}`);
										}
										return fCallback();
									});
							});
					});
			});
	}

	// ================================================================
	// Read
	// ================================================================

	readRun(pTenantID, pRunID, fCallback)
	{
		let tmpTenantSource = this.tenantSource(pTenantID);

		this.bibliograph.readRecordKeys(tmpTenantSource,
			(pError, pKeys) =>
			{
				if (pError || !pKeys)
				{
					// Source doesn't exist yet — no runs recorded
					return fCallback(null, null);
				}

				let tmpTargetHash = this.hashRunID(pRunID);
				let tmpMatchKey = null;

				for (let i = 0; i < pKeys.length; i++)
				{
					if (pKeys[i].endsWith(`-${tmpTargetHash}`))
					{
						tmpMatchKey = pKeys[i];
						break;
					}
				}

				if (!tmpMatchKey)
				{
					return fCallback(null, null);
				}

				this.bibliograph.read(tmpTenantSource, tmpMatchKey, fCallback);
			});
	}

	// ================================================================
	// List helpers
	// ================================================================

	/**
	 * Read all records from a source, apply in-memory filters, and return a page.
	 */
	_readAndFilter(pSourceHash, pOptions, fCallback)
	{
		this.bibliograph.readRecordKeys(pSourceHash,
			(pError, pKeys) =>
			{
				if (pError)
				{
					return fCallback(null, []);
				}

				if (!pKeys || pKeys.length === 0)
				{
					return fCallback(null, []);
				}

				// Read all records (fine at Bibliograph/parime scale)
				let tmpRecords = [];
				let tmpRemaining = pKeys.length;
				let tmpDone = false;

				for (let i = 0; i < pKeys.length; i++)
				{
					this.bibliograph.read(pSourceHash, pKeys[i],
						(pReadError, pRecord) =>
						{
							if (tmpDone)
							{
								return;
							}

							if (!pReadError && pRecord)
							{
								tmpRecords.push(pRecord);
							}
							tmpRemaining--;

							if (tmpRemaining <= 0)
							{
								tmpDone = true;
								// Apply filters
								let tmpFiltered = this._applyFilters(tmpRecords, pOptions);
								return fCallback(null, tmpFiltered);
							}
						});
				}
			});
	}

	/**
	 * Apply filter/sort/paginate to an array of run records.
	 */
	_applyFilters(pRecords, pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpResult = pRecords.slice();

		// Filter by Outcome
		if (tmpOptions.Outcome)
		{
			let tmpOutcome = tmpOptions.Outcome.toLowerCase();
			tmpResult = tmpResult.filter(
				(pRecord) =>
				{
					return pRecord.Outcome && pRecord.Outcome.toLowerCase() === tmpOutcome;
				});
		}

		// Filter by IntegrationName
		if (tmpOptions.IntegrationName)
		{
			tmpResult = tmpResult.filter(
				(pRecord) =>
				{
					return pRecord.IntegrationName === tmpOptions.IntegrationName;
				});
		}

		// Filter by TenantID
		if (tmpOptions.TenantID)
		{
			tmpResult = tmpResult.filter(
				(pRecord) =>
				{
					return pRecord.TenantID === tmpOptions.TenantID;
				});
		}

		// Filter by date range
		if (tmpOptions.From)
		{
			let tmpFrom = new Date(tmpOptions.From).getTime();
			tmpResult = tmpResult.filter(
				(pRecord) =>
				{
					return pRecord.StartedAt && new Date(pRecord.StartedAt).getTime() >= tmpFrom;
				});
		}
		if (tmpOptions.To)
		{
			let tmpTo = new Date(tmpOptions.To).getTime();
			tmpResult = tmpResult.filter(
				(pRecord) =>
				{
					return pRecord.StartedAt && new Date(pRecord.StartedAt).getTime() <= tmpTo;
				});
		}

		// Sort by StartedAt descending (most recent first)
		tmpResult.sort(
			(a, b) =>
			{
				let tmpA = a.StartedAt ? new Date(a.StartedAt).getTime() : 0;
				let tmpB = b.StartedAt ? new Date(b.StartedAt).getTime() : 0;
				return tmpB - tmpA;
			});

		// Paginate
		let tmpOffset = parseInt(tmpOptions.Offset) || 0;
		let tmpLimit = parseInt(tmpOptions.Limit) || 50;
		tmpResult = tmpResult.slice(tmpOffset, tmpOffset + tmpLimit);

		return tmpResult;
	}

	// ================================================================
	// List implementations
	// ================================================================

	listRuns(pTenantID, pOptions, fCallback)
	{
		let tmpTenantSource = this.tenantSource(pTenantID);
		this._readAndFilter(tmpTenantSource, pOptions, fCallback);
	}

	listRunsByIntegration(pTenantID, pIntegrationName, pOptions, fCallback)
	{
		let tmpTenantSource = this.tenantSource(pTenantID);
		let tmpOptions = Object.assign({}, pOptions, { IntegrationName: pIntegrationName });
		this._readAndFilter(tmpTenantSource, tmpOptions, fCallback);
	}

	listAllTenantRuns(pOptions, fCallback)
	{
		this._readAndFilter('telemetry-runs-global', pOptions, fCallback);
	}

	// ================================================================
	// Aggregation
	// ================================================================

	/**
	 * Build summary stats from an array of run records.
	 */
	_buildSummary(pRecords)
	{
		let tmpTotal = pRecords.length;
		let tmpSuccesses = 0;
		let tmpFailures = 0;
		let tmpPartial = 0;
		let tmpStopped = 0;
		let tmpTotalDuration = 0;
		let tmpTotalRecordsSynced = 0;
		let tmpLatestRun = null;

		for (let i = 0; i < pRecords.length; i++)
		{
			let tmpRun = pRecords[i];

			if (tmpRun.Outcome === 'Success') tmpSuccesses++;
			else if (tmpRun.Outcome === 'Error') tmpFailures++;
			else if (tmpRun.Outcome === 'Partial') tmpPartial++;
			else if (tmpRun.Outcome === 'Stopped') tmpStopped++;

			tmpTotalDuration += (tmpRun.DurationMs || 0);
			if (tmpRun.Summary)
			{
				tmpTotalRecordsSynced += (tmpRun.Summary.RecordsSynced || 0);
			}

			if (!tmpLatestRun || (tmpRun.StartedAt && new Date(tmpRun.StartedAt) > new Date(tmpLatestRun.StartedAt)))
			{
				tmpLatestRun = tmpRun;
			}
		}

		return (
			{
				TotalRuns: tmpTotal,
				Successes: tmpSuccesses,
				Failures: tmpFailures,
				Partial: tmpPartial,
				Stopped: tmpStopped,
				SuccessRate: tmpTotal > 0 ? Math.round((tmpSuccesses / tmpTotal) * 10000) / 100 : 0,
				AverageDurationMs: tmpTotal > 0 ? Math.round(tmpTotalDuration / tmpTotal) : 0,
				TotalRecordsSynced: tmpTotalRecordsSynced,
				LatestRun: tmpLatestRun
					? { RunID: tmpLatestRun.RunID, Outcome: tmpLatestRun.Outcome, StartedAt: tmpLatestRun.StartedAt, CompletedAt: tmpLatestRun.CompletedAt }
					: null
			});
	}

	getIntegrationSummary(pTenantID, pIntegrationName, fCallback)
	{
		let tmpTenantSource = this.tenantSource(pTenantID);
		this._readAndFilter(tmpTenantSource, { IntegrationName: pIntegrationName, Limit: 10000 },
			(pError, pRecords) =>
			{
				if (pError)
				{
					return fCallback(pError);
				}
				let tmpSummary = this._buildSummary(pRecords);
				tmpSummary.IntegrationName = pIntegrationName;
				tmpSummary.TenantID = pTenantID;
				return fCallback(null, tmpSummary);
			});
	}

	getDashboardSummary(pTenantID, fCallback)
	{
		let tmpTenantSource = this.tenantSource(pTenantID);
		this._readAndFilter(tmpTenantSource, { Limit: 10000 },
			(pError, pRecords) =>
			{
				if (pError)
				{
					return fCallback(pError);
				}

				// Group by IntegrationName
				let tmpByIntegration = {};
				for (let i = 0; i < pRecords.length; i++)
				{
					let tmpName = pRecords[i].IntegrationName || 'Unknown';
					if (!tmpByIntegration[tmpName])
					{
						tmpByIntegration[tmpName] = [];
					}
					tmpByIntegration[tmpName].push(pRecords[i]);
				}

				let tmpIntegrations = [];
				let tmpIntNames = Object.keys(tmpByIntegration);
				for (let i = 0; i < tmpIntNames.length; i++)
				{
					let tmpIntSummary = this._buildSummary(tmpByIntegration[tmpIntNames[i]]);
					tmpIntSummary.IntegrationName = tmpIntNames[i];
					tmpIntegrations.push(tmpIntSummary);
				}

				let tmpOverall = this._buildSummary(pRecords);
				tmpOverall.TenantID = pTenantID;
				tmpOverall.Integrations = tmpIntegrations;

				return fCallback(null, tmpOverall);
			});
	}

	getCorporateDashboardSummary(fCallback)
	{
		this._readAndFilter('telemetry-runs-global', { Limit: 10000 },
			(pError, pRecords) =>
			{
				if (pError)
				{
					return fCallback(pError);
				}

				// Group by TenantID
				let tmpByTenant = {};
				for (let i = 0; i < pRecords.length; i++)
				{
					let tmpTenantID = pRecords[i].TenantID || 'Unknown';
					if (!tmpByTenant[tmpTenantID])
					{
						tmpByTenant[tmpTenantID] = [];
					}
					tmpByTenant[tmpTenantID].push(pRecords[i]);
				}

				let tmpTenants = [];
				let tmpTenantIDs = Object.keys(tmpByTenant);
				for (let i = 0; i < tmpTenantIDs.length; i++)
				{
					let tmpTenantSummary = this._buildSummary(tmpByTenant[tmpTenantIDs[i]]);
					tmpTenantSummary.TenantID = tmpTenantIDs[i];
					tmpTenants.push(tmpTenantSummary);
				}

				let tmpOverall = this._buildSummary(pRecords);
				tmpOverall.Tenants = tmpTenants;

				return fCallback(null, tmpOverall);
			});
	}
}

module.exports = IntegrationTelemetryStorageProviderBibliograph;
