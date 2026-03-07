/**
 * IntegrationTelemetry — Dashboard Routes
 *
 * GET  {prefix}/dashboard             — tenant dashboard summary
 * GET  {prefix}/dashboard/corporate   — corporate dashboard (all tenants)
 *
 * @param {Object} pTelemetryService - The RetoldDataServiceIntegrationTelemetry instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = (pTelemetryService, pOratorServiceServer) =>
{
	let tmpPrefix = pTelemetryService.routePrefix;

	// ────────────────────────────────────────────────────────────────
	// GET /telemetry/dashboard
	// Aggregated dashboard for a single tenant.
	//
	// Query params:
	//   tenant_id  — required (defaults to service default)
	// ────────────────────────────────────────────────────────────────
	pOratorServiceServer.get(`${tmpPrefix}/dashboard`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpTenantID = pRequest.params.tenant_id || pTelemetryService.options.DefaultTenantID || 'default';

			let tmpProvider = pTelemetryService.getStorageProvider();
			tmpProvider.getDashboardSummary(tmpTenantID,
				(pError, pDashboard) =>
				{
					if (pError)
					{
						pResponse.send(500, { Success: false, Error: `${pError}` });
						return fNext();
					}
					pResponse.send(200, { Success: true, Dashboard: pDashboard });
					return fNext();
				});
		});

	// ────────────────────────────────────────────────────────────────
	// GET /telemetry/dashboard/corporate
	// Aggregated dashboard across all tenants.
	// ────────────────────────────────────────────────────────────────
	pOratorServiceServer.get(`${tmpPrefix}/dashboard/corporate`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpProvider = pTelemetryService.getStorageProvider();
			tmpProvider.getCorporateDashboardSummary(
				(pError, pDashboard) =>
				{
					if (pError)
					{
						pResponse.send(500, { Success: false, Error: `${pError}` });
						return fNext();
					}
					pResponse.send(200, { Success: true, Dashboard: pDashboard });
					return fNext();
				});
		});
};
