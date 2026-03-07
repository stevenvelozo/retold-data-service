/**
 * Retold Data Service - Integration Telemetry Service
 *
 * Fable service that persists integration run metadata longitudinally.
 * Normalises DataCloner sync reports into a compact telemetry record and
 * delegates persistence to a pluggable storage provider.
 *
 * Storage provider resolution:
 *   1. If a custom 'IntegrationTelemetryStorage' service is registered on
 *      fable, that instance is used.
 *   2. Otherwise the built-in Bibliograph (parime JSON) provider is used.
 *
 * Two route groups registered via connectRoutes():
 *   - /telemetry/runs/*           — run history
 *   - /telemetry/integrations/*   — per-integration views
 *   - /telemetry/dashboard/*      — tenant + corporate dashboards
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libIntegrationTelemetryStorageProviderBibliograph = require('./IntegrationTelemetry-StorageProvider-Bibliograph.js');

const defaultIntegrationTelemetryOptions = (
	{
		RoutePrefix: '/telemetry',
		DefaultTenantID: 'default'
	});

class RetoldDataServiceIntegrationTelemetry extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, defaultIntegrationTelemetryOptions, pOptions);
		super(pFable, tmpOptions, pServiceHash);

		this.serviceType = 'RetoldDataServiceIntegrationTelemetry';

		this._storageProvider = null;
	}

	/**
	 * The route prefix for all telemetry endpoints.
	 */
	get routePrefix()
	{
		let tmpConfig = this.fable.RetoldDataService
			? (this.fable.RetoldDataService.options.IntegrationTelemetry || {})
			: {};
		return tmpConfig.RoutePrefix || this.options.RoutePrefix || '/telemetry';
	}

	/**
	 * Resolve the storage provider.
	 *
	 * If a custom 'IntegrationTelemetryStorage' service has been wired into
	 * fable, use that.  Otherwise fall back to the built-in Bibliograph provider.
	 */
	getStorageProvider()
	{
		if (this._storageProvider)
		{
			return this._storageProvider;
		}

		// Check for a custom provider registered on fable
		if (this.fable.services && this.fable.services.hasOwnProperty('IntegrationTelemetryStorage'))
		{
			this._storageProvider = this.fable.IntegrationTelemetryStorage;
			this.fable.log.info('IntegrationTelemetry: Using custom storage provider [IntegrationTelemetryStorage].');
			return this._storageProvider;
		}

		// Fall back to Bibliograph
		this._storageProvider = new libIntegrationTelemetryStorageProviderBibliograph(this.fable, this.options);
		this.fable.log.info('IntegrationTelemetry: Using default Bibliograph storage provider.');
		return this._storageProvider;
	}

	/**
	 * Normalise a DataCloner sync report into a telemetry record and persist it.
	 *
	 * @param {Object} pReport - The raw DataCloner sync report
	 * @param {string} [pTenantID] - Optional tenant identifier (defaults to options.DefaultTenantID)
	 * @param {Function} [fCallback] - Optional (pError) callback
	 */
	recordRun(pReport, pTenantID, fCallback)
	{
		// Support (pReport, fCallback) signature
		if (typeof pTenantID === 'function')
		{
			fCallback = pTenantID;
			pTenantID = null;
		}
		if (!fCallback)
		{
			fCallback = (pError) =>
			{
				if (pError)
				{
					this.fable.log.error(`IntegrationTelemetry: Error recording run: ${pError}`);
				}
			};
		}

		if (!pReport)
		{
			return fCallback(new Error('IntegrationTelemetry.recordRun: No report provided.'));
		}

		let tmpTenantID = pTenantID || this.options.DefaultTenantID || 'default';

		// Normalise the DataCloner report into a telemetry record
		let tmpRecord = this.normaliseReport(pReport, tmpTenantID);

		this.fable.log.info(`IntegrationTelemetry: Recording run [${tmpRecord.RunID}] for tenant [${tmpTenantID}], outcome [${tmpRecord.Outcome}].`);

		let tmpProvider = this.getStorageProvider();
		tmpProvider.writeRun(tmpTenantID, tmpRecord, fCallback);
	}

	/**
	 * Transform a DataCloner sync report into the normalised telemetry record shape.
	 *
	 * @param {Object} pReport - The raw DataCloner sync report
	 * @param {string} pTenantID - The tenant identifier
	 * @return {Object} The normalised telemetry record
	 */
	normaliseReport(pReport, pTenantID)
	{
		let tmpConfig = pReport.Config || {};
		let tmpSummary = pReport.Summary || {};
		let tmpTimestamps = pReport.RunTimestamps || {};

		// Derive an integration name from the config
		let tmpIntegrationName = 'Unknown';
		if (tmpConfig.RemoteServerURL)
		{
			try
			{
				let tmpURL = new URL(tmpConfig.RemoteServerURL);
				tmpIntegrationName = `${tmpURL.hostname} -> ${tmpConfig.Provider || 'Local'}`;
			}
			catch (pParseError)
			{
				tmpIntegrationName = `${tmpConfig.RemoteServerURL} -> ${tmpConfig.Provider || 'Local'}`;
			}
		}

		// Map outcome to normalised values
		let tmpOutcome = (pReport.Outcome || 'Unknown').toLowerCase();
		// Normalise to our canonical set
		if (tmpOutcome === 'success') tmpOutcome = 'Success';
		else if (tmpOutcome === 'error') tmpOutcome = 'Error';
		else if (tmpOutcome === 'partial') tmpOutcome = 'Partial';
		else if (tmpOutcome === 'stopped') tmpOutcome = 'Stopped';
		else tmpOutcome = pReport.Outcome || 'Unknown';

		// Compute duration in milliseconds
		let tmpDurationMs = 0;
		if (tmpTimestamps.Start && tmpTimestamps.End)
		{
			tmpDurationMs = new Date(tmpTimestamps.End).getTime() - new Date(tmpTimestamps.Start).getTime();
		}
		else if (tmpTimestamps.DurationSeconds)
		{
			tmpDurationMs = tmpTimestamps.DurationSeconds * 1000;
		}

		return (
			{
				RunID: pReport.RunID || this.fable.getUUID(),
				TenantID: pTenantID,
				IntegrationName: tmpIntegrationName,
				Outcome: tmpOutcome,
				StartedAt: tmpTimestamps.Start || null,
				CompletedAt: tmpTimestamps.End || null,
				DurationMs: tmpDurationMs,
				SyncMode: tmpConfig.SyncMode || 'Initial',
				Summary:
					{
						TotalTables: tmpSummary.TotalTables || 0,
						TablesSucceeded: (tmpSummary.Complete || 0),
						TablesFailed: (tmpSummary.Errors || 0),
						TablesPartial: (tmpSummary.Partial || 0),
						TotalRecords: tmpSummary.TotalRecords || 0,
						RecordsSynced: tmpSummary.TotalSynced || 0,
						RecordsFailed: tmpSummary.TotalErrors || 0,
						RecordsSkipped: tmpSummary.TotalSkipped || 0
					},
				Anomalies: pReport.Anomalies || [],
				Config:
					{
						SourceType: 'Remote API',
						TargetType: tmpConfig.Provider || 'Unknown',
						RemoteServerURL: tmpConfig.RemoteServerURL || null,
						TableCount: tmpConfig.TableCount || 0,
						SyncDeletedRecords: tmpConfig.SyncDeletedRecords || false
					}
			});
	}

	// ================================================================
	// Route registration
	// ================================================================

	/**
	 * Register all integration telemetry API routes on the Orator service server.
	 *
	 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
	 */
	connectRoutes(pOratorServiceServer)
	{
		require('./IntegrationTelemetry-Command-Runs.js')(this, pOratorServiceServer);
		require('./IntegrationTelemetry-Command-Integrations.js')(this, pOratorServiceServer);
		require('./IntegrationTelemetry-Command-Dashboard.js')(this, pOratorServiceServer);

		this.fable.log.info('Retold Data Service IntegrationTelemetry API routes registered.');
	}
}

module.exports = RetoldDataServiceIntegrationTelemetry;
module.exports.serviceType = 'RetoldDataServiceIntegrationTelemetry';
module.exports.default_configuration = defaultIntegrationTelemetryOptions;
