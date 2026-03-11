/**
 * ComprehensionLoader Session Management Routes
 *
 * Registers /comprehension_load/session/* endpoints for remote session
 * configuration, authentication, check, and deauthentication via
 * pict-sessionmanager.
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

	// POST /comprehension_load/session/configure
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

			tmpLoadState.RemoteServerURL = tmpServerURL;

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
				if (tmpTemplate.indexOf('://') > -1)
				{
					return tmpTemplate;
				}
				let tmpPath = tmpTemplate.replace(/^\//, '');
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

					AuthenticationMethod: tmpBody.AuthenticationMethod || 'get',
					AuthenticationURITemplate: fQualifyURI(tmpBody.AuthenticationURITemplate, 'Authenticate/{~D:Record.UserName~}/{~D:Record.Password~}'),
					AuthenticationRetryCount: 2,
					AuthenticationRetryDebounce: 200,

					CheckSessionURITemplate: fQualifyURI(tmpBody.CheckSessionURITemplate, 'CheckSession'),
					CheckSessionLoginMarkerType: tmpBody.CheckSessionLoginMarkerType || 'boolean',
					CheckSessionLoginMarker: tmpBody.CheckSessionLoginMarker || 'LoggedIn',

					DomainMatch: tmpDomainMatch,
					CookieName: tmpBody.CookieName || 'SessionID',
					CookieValueAddress: tmpBody.CookieValueAddress || 'SessionID',
					CookieValueTemplate: tmpBody.CookieValueTemplate || false
				});

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

			tmpLoadState.SessionConfigured = true;
			tmpLoadState.SessionAuthenticated = false;

			tmpFable.log.info(`Comprehension Loader: Session configured for ${tmpServerURL} (domain: ${tmpDomainMatch})`);

			pResponse.send(200,
				{
					Success: true,
					ServerURL: tmpServerURL,
					DomainMatch: tmpDomainMatch,
					AuthenticationMethod: tmpSessionConfig.AuthenticationMethod
				});
			return fNext();
		});

	// POST /comprehension_load/session/authenticate
	pOratorServiceServer.post(`${tmpPrefix}/session/authenticate`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpLoadState.SessionConfigured)
			{
				pResponse.send(400, { Success: false, Error: 'Session not configured. Call POST /comprehension_load/session/configure first.' });
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

			tmpFable.log.info(`Comprehension Loader: Authenticating as ${tmpCredentials.UserName}...`);

			tmpPict.SessionManager.authenticate('Remote', tmpCredentials,
				(pAuthError, pSessionState) =>
				{
					if (pAuthError)
					{
						tmpFable.log.error(`Comprehension Loader: Authentication failed: ${pAuthError.message || pAuthError}`);
						tmpLoadState.SessionAuthenticated = false;
						pResponse.send(401,
							{
								Success: false,
								Error: `Authentication failed: ${pAuthError.message || pAuthError}`
							});
						return fNext();
					}

					tmpLoadState.SessionAuthenticated = pSessionState && pSessionState.Authenticated;

					tmpFable.log.info(`Comprehension Loader: Authentication ${tmpLoadState.SessionAuthenticated ? 'succeeded' : 'failed'}.`);

					pResponse.send(200,
						{
							Success: tmpLoadState.SessionAuthenticated,
							Authenticated: tmpLoadState.SessionAuthenticated,
							SessionData: pSessionState ? pSessionState.SessionData : {}
						});
					return fNext();
				});
		});

	// GET /comprehension_load/session/check
	pOratorServiceServer.get(`${tmpPrefix}/session/check`,
		(pRequest, pResponse, fNext) =>
		{
			if (!tmpLoadState.SessionConfigured)
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
					tmpLoadState.SessionAuthenticated = pAuthenticated;

					pResponse.send(200,
						{
							Configured: tmpLoadState.SessionConfigured,
							Authenticated: pAuthenticated,
							ServerURL: tmpLoadState.RemoteServerURL,
							CheckData: pCheckData || {}
						});
					return fNext();
				});
		});

	// POST /comprehension_load/session/deauthenticate
	pOratorServiceServer.post(`${tmpPrefix}/session/deauthenticate`,
		(pRequest, pResponse, fNext) =>
		{
			if (tmpLoadState.SessionConfigured)
			{
				tmpPict.SessionManager.deauthenticate('Remote');
			}
			tmpLoadState.SessionAuthenticated = false;

			tmpFable.log.info('Comprehension Loader: Session deauthenticated.');

			pResponse.send(200, { Success: true, Authenticated: false });
			return fNext();
		});
};
