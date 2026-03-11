/**
 * ComprehensionLoader Schema Management Routes
 *
 * Registers /comprehension_load/schema/* endpoints for fetching remote
 * schemas to discover valid entities on the target server.
 *
 * @param {Object} pComprehensionLoaderService - The RetoldDataServiceComprehensionLoader instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = (pComprehensionLoaderService, pOratorServiceServer) =>
{
	let tmpFable = pComprehensionLoaderService.fable;
	let tmpLoadState = pComprehensionLoaderService.loadState;
	let tmpPict = pComprehensionLoaderService.pict;
	let tmpPrefix = pComprehensionLoaderService.routePrefix;

	// POST /comprehension_load/schema/fetch
	pOratorServiceServer.post(`${tmpPrefix}/schema/fetch`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};
			let tmpSchemaURL = tmpBody.SchemaURL;

			if (!tmpSchemaURL)
			{
				if (tmpLoadState.RemoteServerURL)
				{
					tmpSchemaURL = tmpLoadState.RemoteServerURL + 'Retold/Models';
				}
				else
				{
					pResponse.send(400, { Success: false, Error: 'SchemaURL is required (or configure a session first).' });
					return fNext();
				}
			}

			tmpFable.log.info(`Comprehension Loader: Fetching remote schema from ${tmpSchemaURL}...`);

			tmpPict.RestClient.getJSON(tmpSchemaURL,
				(pError, pHTTPResponse, pData) =>
				{
					if (pError)
					{
						tmpFable.log.error(`Comprehension Loader: Schema fetch error: ${pError.message || pError}`);
						pResponse.send(500, { Success: false, Error: `Schema fetch error: ${pError.message || pError}` });
						return fNext();
					}

					if (!pHTTPResponse || pHTTPResponse.statusCode !== 200)
					{
						let tmpStatus = pHTTPResponse ? pHTTPResponse.statusCode : 'unknown';
						tmpFable.log.error(`Comprehension Loader: Schema fetch returned HTTP ${tmpStatus}`);
						pResponse.send(500, { Success: false, Error: `Schema fetch returned HTTP ${tmpStatus}` });
						return fNext();
					}

					tmpLoadState.RemoteSchema = pData;

					let tmpEntityNames = [];
					if (pData && pData.Tables)
					{
						tmpEntityNames = Object.keys(pData.Tables);
					}
					tmpLoadState.RemoteEntityList = tmpEntityNames;

					tmpFable.log.info(`Comprehension Loader: Fetched schema with ${tmpEntityNames.length} entities: [${tmpEntityNames.join(', ')}]`);

					pResponse.send(200,
						{
							Success: true,
							SchemaURL: tmpSchemaURL,
							EntityCount: tmpEntityNames.length,
							Entities: tmpEntityNames
						});
					return fNext();
				});
		});

	// GET /comprehension_load/schema
	pOratorServiceServer.get(`${tmpPrefix}/schema`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpLoadState.RemoteSchema)
			{
				pResponse.send(200, { Fetched: false, Entities: [] });
				return fNext();
			}

			pResponse.send(200,
				{
					Fetched: true,
					EntityCount: tmpLoadState.RemoteEntityList.length,
					Entities: tmpLoadState.RemoteEntityList
				});
			return fNext();
		});
};
