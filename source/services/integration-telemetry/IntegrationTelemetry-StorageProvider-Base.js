/**
 * Integration Telemetry — Storage Provider Base
 *
 * Abstract interface for pluggable telemetry persistence.  Production
 * deployments supply their own implementation; the built-in Bibliograph
 * provider is used when no custom provider is wired.
 *
 * All methods follow the callback-last (pError, pResult) convention used
 * throughout the retold codebase.
 *
 * @param {Object} pFable - The Fable instance (passed through for logging)
 * @param {Object} pOptions - Provider-specific configuration
 */
class IntegrationTelemetryStorageProviderBase
{
	constructor(pFable, pOptions)
	{
		this.fable = pFable;
		this.options = pOptions || {};
	}

	/**
	 * Persist a single telemetry run record.
	 *
	 * @param {string} pTenantID - Tenant identifier
	 * @param {Object} pRunRecord - The normalised telemetry record
	 * @param {Function} fCallback - (pError)
	 */
	writeRun(pTenantID, pRunRecord, fCallback)
	{
		return fCallback(new Error('IntegrationTelemetryStorageProvider.writeRun is not implemented.'));
	}

	/**
	 * Read a single run by its RunID.
	 *
	 * @param {string} pTenantID - Tenant identifier
	 * @param {string} pRunID - The UUID of the run
	 * @param {Function} fCallback - (pError, pRunRecord)
	 */
	readRun(pTenantID, pRunID, fCallback)
	{
		return fCallback(new Error('IntegrationTelemetryStorageProvider.readRun is not implemented.'));
	}

	/**
	 * List run records for a tenant with optional filtering.
	 *
	 * @param {string} pTenantID - Tenant identifier
	 * @param {Object} pOptions - { Limit, Offset, Outcome, From, To }
	 * @param {Function} fCallback - (pError, pRecords)
	 */
	listRuns(pTenantID, pOptions, fCallback)
	{
		return fCallback(new Error('IntegrationTelemetryStorageProvider.listRuns is not implemented.'));
	}

	/**
	 * List run records for a specific integration within a tenant.
	 *
	 * @param {string} pTenantID - Tenant identifier
	 * @param {string} pIntegrationName - Integration name
	 * @param {Object} pOptions - { Limit, Offset, Outcome, From, To }
	 * @param {Function} fCallback - (pError, pRecords)
	 */
	listRunsByIntegration(pTenantID, pIntegrationName, pOptions, fCallback)
	{
		return fCallback(new Error('IntegrationTelemetryStorageProvider.listRunsByIntegration is not implemented.'));
	}

	/**
	 * List runs across all tenants (corporate dashboard).
	 *
	 * @param {Object} pOptions - { Limit, Offset, Outcome, From, To }
	 * @param {Function} fCallback - (pError, pRecords)
	 */
	listAllTenantRuns(pOptions, fCallback)
	{
		return fCallback(new Error('IntegrationTelemetryStorageProvider.listAllTenantRuns is not implemented.'));
	}

	/**
	 * Compute an aggregate summary for a specific integration.
	 *
	 * @param {string} pTenantID - Tenant identifier
	 * @param {string} pIntegrationName - Integration name
	 * @param {Function} fCallback - (pError, pSummary)
	 */
	getIntegrationSummary(pTenantID, pIntegrationName, fCallback)
	{
		return fCallback(new Error('IntegrationTelemetryStorageProvider.getIntegrationSummary is not implemented.'));
	}

	/**
	 * Compute an aggregate dashboard for a single tenant.
	 *
	 * @param {string} pTenantID - Tenant identifier
	 * @param {Function} fCallback - (pError, pDashboard)
	 */
	getDashboardSummary(pTenantID, fCallback)
	{
		return fCallback(new Error('IntegrationTelemetryStorageProvider.getDashboardSummary is not implemented.'));
	}

	/**
	 * Compute an aggregate dashboard across all tenants (corporate view).
	 *
	 * @param {Function} fCallback - (pError, pDashboard)
	 */
	getCorporateDashboardSummary(fCallback)
	{
		return fCallback(new Error('IntegrationTelemetryStorageProvider.getCorporateDashboardSummary is not implemented.'));
	}
}

module.exports = IntegrationTelemetryStorageProviderBase;
