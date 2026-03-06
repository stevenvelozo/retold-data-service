/**
 * DataCloner Web UI Routes
 *
 * Serves the data-cloner-web.html file at /clone/ and handles the redirect
 * from /clone to /clone/.
 *
 * @param {Object} pDataClonerService - The RetoldDataServiceDataCloner instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = (pDataClonerService, pOratorServiceServer) =>
{
	let libFs = require('fs');
	let libPath = require('path');

	let tmpPrefix = pDataClonerService.routePrefix;
	let tmpHTMLPath = libPath.join(__dirname, 'data-cloner-web.html');

	pOratorServiceServer.get(`${tmpPrefix}/`,
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpHTML = libFs.readFileSync(tmpHTMLPath, 'utf8');
				pResponse.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				pResponse.write(tmpHTML);
				pResponse.end();
			}
			catch (pReadError)
			{
				pResponse.send(500, { Success: false, Error: 'Failed to load web UI.' });
			}
			return fNext();
		});

	pOratorServiceServer.get(`${tmpPrefix}`,
		(pRequest, pResponse, fNext) =>
		{
			pResponse.redirect(`${tmpPrefix}/`, fNext);
		});
};
