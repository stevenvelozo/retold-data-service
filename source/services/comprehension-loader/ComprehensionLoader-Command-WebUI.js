/**
 * ComprehensionLoader Web UI Routes
 *
 * Serves the Pict-application-based comprehension loader web UI.
 * The HTML entry point loads pict.min.js (from node_modules) and the
 * Quackage-built application bundle.
 *
 * @param {Object} pComprehensionLoaderService - The RetoldDataServiceComprehensionLoader instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = (pComprehensionLoaderService, pOratorServiceServer) =>
{
	let libFs = require('fs');
	let libPath = require('path');

	let tmpPrefix = pComprehensionLoaderService.routePrefix;
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

	// Redirect /comprehension_load -> /comprehension_load/
	pOratorServiceServer.get(`${tmpPrefix}`,
		(pRequest, pResponse, fNext) =>
		{
			pResponse.redirect(`${tmpPrefix}/`, fNext);
		});

	// ---- Pict library (from node_modules) ----
	pOratorServiceServer.get(`${tmpPrefix}/pict.min.js`,
		fServeFile(require.resolve('pict/dist/pict.min.js'), 'application/javascript'));

	// ---- Application bundle ----
	pOratorServiceServer.get(`${tmpPrefix}/comprehension-loader.js`,
		fServeFile(libPath.join(tmpWebDir, 'comprehension-loader.js'), 'application/javascript'));
};
