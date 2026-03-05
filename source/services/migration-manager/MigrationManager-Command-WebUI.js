/**
 * MigrationManager Command - Web UI
 *
 * Serves the migration manager web UI HTML and static JS library files.
 * Library files are resolved from meadow-migrationmanager's node_modules
 * at runtime, matching the standalone server's approach.
 *
 * When a RoutePrefix is configured (e.g. '/meadow-migrationmanager'),
 * the HTML is patched at serve time to inject window.MIGRATION_MANAGER_BASE
 * and rewrite script src paths so the web UI resolves all resources
 * under the prefix.
 *
 * GET    {prefix}/                          (index.html)
 * GET    {prefix}/lib/codejar.js            (CodeJar editor)
 * GET    {prefix}/lib/pict.min.js           (Pict browser bundle)
 * GET    {prefix}/lib/pict-section-flow.min.js (Flow diagram visualization)
 */
const libFs = require('fs');
const libPath = require('path');

// Resolve paths relative to the meadow-migrationmanager package root
const _MigrationManagerBase = libPath.dirname(require.resolve('meadow-migrationmanager/package.json'));

module.exports = function(pMigrationService, pOratorServiceServer)
{
	let tmpPrefix = pMigrationService.routePrefix;

	// GET {prefix}/lib/codejar.js — serve CodeJar as a global (strip ES module export)
	let tmpCodeJarPath = libPath.join(_MigrationManagerBase, 'node_modules', 'codejar', 'dist', 'codejar.js');
	pOratorServiceServer.get(tmpPrefix + '/lib/codejar.js',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpSource = libFs.readFileSync(tmpCodeJarPath, 'utf8');
				// Strip the ES module `export ` keyword so CodeJar becomes a global function
				tmpSource = tmpSource.replace('export function CodeJar', 'function CodeJar');
				pResponse.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
				pResponse.write(tmpSource);
				pResponse.end();
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: 'Failed to load CodeJar.' });
			}
			return fNext();
		});

	// GET {prefix}/lib/pict.min.js — serve Pict browser bundle
	let tmpPictPath = libPath.join(_MigrationManagerBase, 'node_modules', 'pict', 'dist', 'pict.min.js');
	pOratorServiceServer.get(tmpPrefix + '/lib/pict.min.js',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpSource = libFs.readFileSync(tmpPictPath, 'utf8');
				pResponse.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
				pResponse.write(tmpSource);
				pResponse.end();
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: 'Failed to load Pict.' });
			}
			return fNext();
		});

	// GET {prefix}/lib/pict-section-flow.min.js — serve pict-section-flow browser bundle
	let tmpFlowPath = libPath.join(_MigrationManagerBase, 'node_modules', 'pict-section-flow', 'dist', 'pict-section-flow.min.js');
	pOratorServiceServer.get(tmpPrefix + '/lib/pict-section-flow.min.js',
		(pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpSource = libFs.readFileSync(tmpFlowPath, 'utf8');
				pResponse.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
				pResponse.write(tmpSource);
				pResponse.end();
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: 'Failed to load pict-section-flow.' });
			}
			return fNext();
		});

	// GET {prefix}/ — serve the web UI HTML
	let tmpHTMLPath = libPath.join(_MigrationManagerBase, 'source', 'web', 'index.html');

	let fServeHTML = (pRequest, pResponse, fNext) =>
		{
			try
			{
				let tmpHTML = libFs.readFileSync(tmpHTMLPath, 'utf8');

				// When a route prefix is set, inject the base path
				// so the web UI's api() function and script src tags
				// resolve to the correct prefixed URLs.
				if (tmpPrefix)
				{
					tmpHTML = tmpHTML.replace(/src="\/lib\//g, 'src="' + tmpPrefix + '/lib/');
					tmpHTML = tmpHTML.replace('<script src=', '<script>window.MIGRATION_MANAGER_BASE=\'' + tmpPrefix + '\';</script>\n<script src=');
				}

				pResponse.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				pResponse.write(tmpHTML);
				pResponse.end();
			}
			catch (pError)
			{
				pResponse.send(500, { Success: false, Error: 'Failed to load web UI.' });
			}
			return fNext();
		};

	pOratorServiceServer.get(tmpPrefix + '/', fServeHTML);

	// Also serve without trailing slash when a prefix is active
	if (tmpPrefix)
	{
		pOratorServiceServer.get(tmpPrefix, fServeHTML);
	}
};
