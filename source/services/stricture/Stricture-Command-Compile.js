/**
 * Stricture Command - Compile DDL
 *
 * POST /1.0/Retold/Stricture/Compile
 *
 * Accepts MicroDDL content and returns the compiled stricture model
 * (MeadowModel-Extended.json format).
 *
 * Body formats:
 *   Single file:  { "DDL": "!Book\n@IDBook\n..." }
 *   Multi-file:   { "Files": { "Main.ddl": "...", "entities/Author.ddl": "..." }, "EntryPoint": "Main.ddl" }
 *
 * @param {Object} pStrictureService - The RetoldDataServiceStricture instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = function(pStrictureService, pOratorServiceServer)
{
	pOratorServiceServer.postWithBodyParser('/1.0/Retold/Stricture/Compile',
		(pRequest, pResponse, fNext) =>
		{
			if (!pRequest.body)
			{
				pResponse.send(400, { Error: 'Request body must include DDL (string) or Files (object).' });
				return fNext();
			}

			pStrictureService.compileFromDDL(pRequest.body,
				(pError, pCompiledModel) =>
				{
					if (pError)
					{
						pResponse.send(500, { Error: pError.message });
						return fNext();
					}
					pResponse.send(200, pCompiledModel);
					return fNext();
				});
		});
};
