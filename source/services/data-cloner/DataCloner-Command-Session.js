/**
 * DataCloner Session Management Routes
 *
 * Registers /clone/session/* endpoints for remote session configuration,
 * authentication, check, and deauthentication via pict-sessionmanager.
 *
 * @param {Object} pDataClonerService - The RetoldDataServiceDataCloner instance
 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
 */
module.exports = (pDataClonerService, pOratorServiceServer) =>
{
	let tmpFable = pDataClonerService.fable;
	let tmpCloneState = pDataClonerService.cloneState;
	let tmpPict = pDataClonerService.pict;
	let tmpPrefix = pDataClonerService.routePrefix;

	// POST /clone/session/configure
	pOratorServiceServer.post(`${tmpPrefix}/session/configure`,
		(pRequest, pResponse, fNext) =>
		{
			let tmpBody = pRequest.body || {};
			let tmpServerURL = tmpBody.ServerURL;

			if (!tmpServerURL)
			{
				pResponse.send(400, { Success: false, Error: 'ServerURL is required.' });
				return fNext();
			}

			tmpCloneState.RemoteServerURL = tmpServerURL;

			// Remove existing session if reconfiguring
			if (tmpPict.SessionManager.getSession('Remote'))
			{
				tmpPict.SessionManager.deauthenticate('Remote');
				delete tmpPict.SessionManager.sessions['Remote'];
			}

			// Extract domain from ServerURL for cookie matching
			let tmpDomainMatch = tmpBody.DomainMatch;
			if (!tmpDomainMatch)
			{
				try
				{
					let tmpURL = new URL(tmpServerURL);
					tmpDomainMatch = tmpURL.hostname;
				}
				catch (pParseError)
				{
					tmpDomainMatch = tmpServerURL;
				}
			}

			// Helper: ensure a URI template is fully qualified with the server URL
			let fQualifyURI = (pTemplate, pDefault) =>
			{
				let tmpTemplate = pTemplate || pDefault;
				// Already a full URL — use as-is
				if (tmpTemplate.indexOf('://') > -1)
				{
					return tmpTemplate;
				}
				// Strip leading slash
				let tmpPath = tmpTemplate.replace(/^\//, '');
				// If the server URL already ends with a version prefix (e.g. /1.0/)
				// and the path redundantly starts with the same prefix, strip it
				// to avoid double-prefixing (e.g. /1.0/1.0/Authenticate).
				let tmpVersionMatch = tmpServerURL.match(/\/(\d+\.\d+)\/?$/);
				if (tmpVersionMatch)
				{
					let tmpURLPrefix = tmpVersionMatch[1] + '/';
					if (tmpPath.indexOf(tmpURLPrefix) === 0)
					{
						tmpPath = tmpPath.substring(tmpURLPrefix.length);
					}
				}
				return tmpServerURL + tmpPath;
			};

			let tmpSessionConfig = (
				{
					Type: 'Cookie',

					// Authentication
					AuthenticationMethod: tmpBody.AuthenticationMethod || 'get',
					AuthenticationURITemplate: fQualifyURI(tmpBody.AuthenticationURITemplate, 'Authenticate/{~D:Record.UserName~}/{~D:Record.Password~}'),
					AuthenticationRetryCount: 2,
					AuthenticationRetryDebounce: 200,

					// Session check
					CheckSessionURITemplate: fQualifyURI(tmpBody.CheckSessionURITemplate, 'CheckSession'),
					CheckSessionLoginMarkerType: tmpBody.CheckSessionLoginMarkerType || 'boolean',
					CheckSessionLoginMarker: tmpBody.CheckSessionLoginMarker || 'LoggedIn',

					// Cookie injection
					DomainMatch: tmpDomainMatch,
					CookieName: tmpBody.CookieName || 'SessionID',
					CookieValueAddress: tmpBody.CookieValueAddress || 'SessionID',
					CookieValueTemplate: tmpBody.CookieValueTemplate || false
				});

			// If authentication is POST-based, set up the request body template
			if (tmpBody.AuthenticationMethod === 'post')
			{
				tmpSessionConfig.AuthenticationRequestBody = tmpBody.AuthenticationRequestBody || (
					{
						username: '{~D:Record.UserName~}',
						password: '{~D:Record.Password~}'
					});
			}

			tmpPict.SessionManager.addSession('Remote', tmpSessionConfig);
			tmpPict.SessionManager.connectToRestClient();

			tmpCloneState.SessionConfigured = true;
			tmpCloneState.SessionAuthenticated = false;

			tmpFable.log.info(`Data Cloner: Session configured for ${tmpServerURL} (domain: ${tmpDomainMatch})`);

			pResponse.send(200,
				{
					Success: true,
					ServerURL: tmpServerURL,
					DomainMatch: tmpDomainMatch,
					AuthenticationMethod: tmpSessionConfig.AuthenticationMethod
				});
			return fNext();
		});

	// POST /clone/session/authenticate
	pOratorServiceServer.post(`${tmpPrefix}/session/authenticate`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpCloneState.SessionConfigured)
			{
				pResponse.send(400, { Success: false, Error: 'Session not configured. Call POST /clone/session/configure first.' });
				return fNext();
			}

			let tmpBody = pRequest.body || {};
			let tmpCredentials = (
				{
					UserName: tmpBody.UserName || tmpBody.username,
					Password: tmpBody.Password || tmpBody.password
				});

			if (!tmpCredentials.UserName || !tmpCredentials.Password)
			{
				pResponse.send(400, { Success: false, Error: 'UserName and Password are required.' });
				return fNext();
			}

			tmpFable.log.info(`Data Cloner: Authenticating as ${tmpCredentials.UserName}...`);

			tmpPict.SessionManager.authenticate('Remote', tmpCredentials,
				(pAuthError, pSessionState) =>
				{
					if (pAuthError)
					{
						tmpFable.log.error(`Data Cloner: Authentication failed: ${pAuthError.message || pAuthError}`);
						tmpCloneState.SessionAuthenticated = false;
						pResponse.send(401,
							{
								Success: false,
								Error: `Authentication failed: ${pAuthError.message || pAuthError}`
							});
						return fNext();
					}

					tmpCloneState.SessionAuthenticated = pSessionState && pSessionState.Authenticated;

					tmpFable.log.info(`Data Cloner: Authentication ${tmpCloneState.SessionAuthenticated ? 'succeeded' : 'failed'}.`);

					pResponse.send(200,
						{
							Success: tmpCloneState.SessionAuthenticated,
							Authenticated: tmpCloneState.SessionAuthenticated,
							SessionData: pSessionState ? pSessionState.SessionData : {}
						});
					return fNext();
				});
		});

	// GET /clone/session/check
	pOratorServiceServer.get(`${tmpPrefix}/session/check`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpCloneState.SessionConfigured)
			{
				pResponse.send(200,
					{
						Configured: false,
						Authenticated: false
					});
				return fNext();
			}

			tmpPict.SessionManager.checkSession('Remote',
				(pCheckError, pAuthenticated, pCheckData) =>
				{
					tmpCloneState.SessionAuthenticated = pAuthenticated;

					pResponse.send(200,
						{
							Configured: tmpCloneState.SessionConfigured,
							Authenticated: pAuthenticated,
							ServerURL: tmpCloneState.RemoteServerURL,
							CheckData: pCheckData || {}
						});
					return fNext();
				});
		});

	// POST /clone/session/deauthenticate
	pOratorServiceServer.post(`${tmpPrefix}/session/deauthenticate`,
		(pRequest, pResponse, fNext) =>
		{
			if (tmpCloneState.SessionConfigured)
			{
				tmpPict.SessionManager.deauthenticate('Remote');
			}
			tmpCloneState.SessionAuthenticated = false;

			tmpFable.log.info('Data Cloner: Session deauthenticated.');

			pResponse.send(200, { Success: true, Authenticated: false });
			return fNext();
		});
};
