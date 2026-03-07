/**
 * DataCloner Web UI Routes
 *
 * Serves the Pict-application-based data cloner web UI.
 * The HTML entry point loads pict.min.js (from node_modules) and the
 * Quackage-built application bundle.
 *
 * @param {Object} pDataClonerService - The RetoldDataServiceDataCloner instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = (pDataClonerService, pOratorServiceServer) =>
{
	let libFs = require('fs');
	let libPath = require('path');

	let tmpPrefix = pDataClonerService.routePrefix;
	let tmpWebDir = libPath.join(__dirname, 'web');

	// Helper: serve a static file with the given content type
	let fServeFile = (pFilePath, pContentType) =>
	{
		return (pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpContent = libFs.readFileSync(pFilePath, 'utf8');
				pResponse.writeHead(200, { 'Content-Type': pContentType + '; charset=utf-8' });
				pResponse.write(tmpContent);
				pResponse.end();
			}
			catch (pReadError)
			{
				pResponse.send(500, { Success: false, Error: 'Failed to load ' + libPath.basename(pFilePath) });
			}
			return fNext();
		};
	};

	// ---- HTML ----
	pOratorServiceServer.get(`${tmpPrefix}/`,
		fServeFile(libPath.join(tmpWebDir, 'index.html'), 'text/html'));

	// Redirect /clone → /clone/
	pOratorServiceServer.get(`${tmpPrefix}`,
		(pRequest, pResponse, fNext) =>
		{
			pResponse.redirect(`${tmpPrefix}/`, fNext);
		});

	// ---- Pict library (from node_modules) ----
	pOratorServiceServer.get(`${tmpPrefix}/pict.min.js`,
		fServeFile(require.resolve('pict/dist/pict.min.js'), 'application/javascript'));

	// ---- Application bundle ----
	pOratorServiceServer.get(`${tmpPrefix}/data-cloner.js`,
		fServeFile(libPath.join(tmpWebDir, 'data-cloner.js'), 'application/javascript'));
};
