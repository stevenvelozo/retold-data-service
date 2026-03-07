/**
 * IntegrationTelemetry — Run History Routes
 *
 * GET  {prefix}/runs           — list runs for a tenant
 * GET  {prefix}/runs/:RunID    — single run detail
 *
 * @param {Object} pTelemetryService - The RetoldDataServiceIntegrationTelemetry instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = (pTelemetryService, pOratorServiceServer) =>
{
	let tmpPrefix = pTelemetryService.routePrefix;

	// ────────────────────────────────────────────────────────────────
	// GET /telemetry/runs
	// List runs for a tenant with optional filtering.
	//
	// Query params:
	//   tenant_id  — required (defaults to service default)
	//   limit      — max records (default 50)
	//   offset     — pagination offset
	//   outcome    — filter by outcome (Success, Error, Partial, Stopped)
	//   from       — ISO date lower bound
	//   to         — ISO date upper bound
	// ────────────────────────────────────────────────────────────────
	pOratorServiceServer.get(`${tmpPrefix}/runs`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpTenantID = pRequest.params.tenant_id || pTelemetryService.options.DefaultTenantID || 'default';
			let tmpOptions = (
				{
					Limit: pRequest.params.limit,
					Offset: pRequest.params.offset,
					Outcome: pRequest.params.outcome,
					From: pRequest.params.from,
					To: pRequest.params.to
				});

			let tmpProvider = pTelemetryService.getStorageProvider();
			tmpProvider.listRuns(tmpTenantID, tmpOptions,
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
							Count: pRecords.length,
							Runs: pRecords
						});
					return fNext();
				});
		});

	// ────────────────────────────────────────────────────────────────
	// GET /telemetry/runs/:RunID
	// Read a single run record by RunID.
	// ────────────────────────────────────────────────────────────────
	pOratorServiceServer.get(`${tmpPrefix}/runs/:RunID`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpTenantID = pRequest.params.tenant_id || pTelemetryService.options.DefaultTenantID || 'default';
			let tmpRunID = pRequest.params.RunID;

			if (!tmpRunID)
			{
				pResponse.send(400, { Success: false, Error: 'RunID is required.' });
				return fNext();
			}

			let tmpProvider = pTelemetryService.getStorageProvider();
			tmpProvider.readRun(tmpTenantID, tmpRunID,
				(pError, pRecord) =>
				{
					if (pError)
					{
						pResponse.send(500, { Success: false, Error: `${pError}` });
						return fNext();
					}
					if (!pRecord)
					{
						pResponse.send(404, { Success: false, Error: `Run [${tmpRunID}] not found for tenant [${tmpTenantID}].` });
						return fNext();
					}
					pResponse.send(200, { Success: true, Run: pRecord });
					return fNext();
				});
		});
};
