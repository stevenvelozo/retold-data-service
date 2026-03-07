/**
 * IntegrationTelemetry — Integration-Level Routes
 *
 * GET  {prefix}/integrations                              — list distinct integration names
 * GET  {prefix}/integrations/:IntegrationName/runs        — runs filtered by integration
 * GET  {prefix}/integrations/:IntegrationName/summary     — summary stats for an integration
 *
 * @param {Object} pTelemetryService - The RetoldDataServiceIntegrationTelemetry instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = (pTelemetryService, pOratorServiceServer) =>
{
	let tmpPrefix = pTelemetryService.routePrefix;

	// ────────────────────────────────────────────────────────────────
	// GET /telemetry/integrations
	// List distinct integration names for a tenant.
	//
	// Query params:
	//   tenant_id  — required (defaults to service default)
	// ────────────────────────────────────────────────────────────────
	pOratorServiceServer.get(`${tmpPrefix}/integrations`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpTenantID = pRequest.params.tenant_id || pTelemetryService.options.DefaultTenantID || 'default';

			let tmpProvider = pTelemetryService.getStorageProvider();
			tmpProvider.listRuns(tmpTenantID, { Limit: 10000 },
				(pError, pRecords) =>
				{
					if (pError)
					{
						pResponse.send(500, { Success: false, Error: `${pError}` });
						return fNext();
					}

					// Extract unique integration names
					let tmpNames = {};
					for (let i = 0; i < pRecords.length; i++)
					{
						let tmpName = pRecords[i].IntegrationName || 'Unknown';
						if (!tmpNames[tmpName])
						{
							tmpNames[tmpName] = { Name: tmpName, RunCount: 0, LatestRun: null };
						}
						tmpNames[tmpName].RunCount++;
						if (!tmpNames[tmpName].LatestRun || new Date(pRecords[i].StartedAt) > new Date(tmpNames[tmpName].LatestRun))
						{
							tmpNames[tmpName].LatestRun = pRecords[i].StartedAt;
						}
					}

					let tmpIntegrations = Object.values(tmpNames);
					tmpIntegrations.sort((a, b) => (b.LatestRun || '').localeCompare(a.LatestRun || ''));

					pResponse.send(200,
						{
							Success: true,
							TenantID: tmpTenantID,
							Count: tmpIntegrations.length,
							Integrations: tmpIntegrations
						});
					return fNext();
				});
		});

	// ────────────────────────────────────────────────────────────────
	// GET /telemetry/integrations/:IntegrationName/runs
	// List runs filtered by a specific integration name.
	//
	// Query params:
	//   tenant_id, limit, offset, outcome, from, to
	// ────────────────────────────────────────────────────────────────
	pOratorServiceServer.get(`${tmpPrefix}/integrations/:IntegrationName/runs`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpTenantID = pRequest.params.tenant_id || pTelemetryService.options.DefaultTenantID || 'default';
			let tmpIntegrationName = decodeURIComponent(pRequest.params.IntegrationName);
			let tmpOptions = (
				{
					Limit: pRequest.params.limit,
					Offset: pRequest.params.offset,
					Outcome: pRequest.params.outcome,
					From: pRequest.params.from,
					To: pRequest.params.to
				});

			let tmpProvider = pTelemetryService.getStorageProvider();
			tmpProvider.listRunsByIntegration(tmpTenantID, tmpIntegrationName, tmpOptions,
				(pError, pRecords) =>
				{
					if (pError)
					{
						pResponse.send(500, { Success: false, Error: `${pError}` });
						return fNext();
					}
					pResponse.send(200,
						{
							Success: true,
							TenantID: tmpTenantID,
							IntegrationName: tmpIntegrationName,
							Count: pRecords.length,
							Runs: pRecords
						});
					return fNext();
				});
		});

	// ────────────────────────────────────────────────────────────────
	// GET /telemetry/integrations/:IntegrationName/summary
	// Aggregated summary for a specific integration.
	// ────────────────────────────────────────────────────────────────
	pOratorServiceServer.get(`${tmpPrefix}/integrations/:IntegrationName/summary`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpTenantID = pRequest.params.tenant_id || pTelemetryService.options.DefaultTenantID || 'default';
			let tmpIntegrationName = decodeURIComponent(pRequest.params.IntegrationName);

			let tmpProvider = pTelemetryService.getStorageProvider();
			tmpProvider.getIntegrationSummary(tmpTenantID, tmpIntegrationName,
				(pError, pSummary) =>
				{
					if (pError)
					{
						pResponse.send(500, { Success: false, Error: `${pError}` });
						return fNext();
					}
					pResponse.send(200, { Success: true, Summary: pSummary });
					return fNext();
				});
		});
};
