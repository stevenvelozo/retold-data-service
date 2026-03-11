const libPictView = require('pict-view');

class ComprehensionLoaderSessionView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	configureSession()
	{
		let tmpServerURL = document.getElementById('serverURL').value.trim();
		if (!tmpServerURL)
		{
			this.pict.providers.ComprehensionLoader.setStatus('sessionConfigStatus', 'Server URL is required.', 'error');
			return;
		}

		let tmpBody = { ServerURL: tmpServerURL.replace(/\/+$/, '') + '/1.0/' };

		let tmpAuthMethod = document.getElementById('authMethod').value.trim();
		if (tmpAuthMethod)
		{
			tmpBody.AuthenticationMethod = tmpAuthMethod;
		}

		let tmpAuthURI = document.getElementById('authURI').value.trim();
		if (tmpAuthURI)
		{
			tmpBody.AuthenticationURITemplate = tmpAuthURI;
		}

		let tmpCheckURI = document.getElementById('checkURI').value.trim();
		if (tmpCheckURI)
		{
			tmpBody.CheckSessionURITemplate = tmpCheckURI;
		}

		let tmpCookieName = document.getElementById('cookieName').value.trim();
		if (tmpCookieName)
		{
			tmpBody.CookieName = tmpCookieName;
		}

		let tmpCookieValueAddr = document.getElementById('cookieValueAddr').value.trim();
		if (tmpCookieValueAddr)
		{
			tmpBody.CookieValueAddress = tmpCookieValueAddr;
		}

		let tmpCookieValueTemplate = document.getElementById('cookieValueTemplate').value.trim();
		if (tmpCookieValueTemplate)
		{
			tmpBody.CookieValueTemplate = tmpCookieValueTemplate;
		}

		let tmpLoginMarker = document.getElementById('loginMarker').value.trim();
		if (tmpLoginMarker)
		{
			tmpBody.CheckSessionLoginMarker = tmpLoginMarker;
		}

		this.pict.providers.ComprehensionLoader.setStatus('sessionConfigStatus', 'Configuring session...', 'info');

		this.pict.providers.ComprehensionLoader.api('POST', '/comprehension_load/session/configure', tmpBody)
			.then(
				(pData) =>
				{
					if (pData.Success)
					{
						this.pict.providers.ComprehensionLoader.setStatus('sessionConfigStatus', 'Session configured for ' + pData.ServerURL + ' (domain: ' + pData.DomainMatch + ')', 'ok');
					}
					else
					{
						this.pict.providers.ComprehensionLoader.setStatus('sessionConfigStatus', 'Configuration failed: ' + (pData.Error || 'Unknown error'), 'error');
					}
				})
			.catch(
				(pError) =>
				{
					this.pict.providers.ComprehensionLoader.setStatus('sessionConfigStatus', 'Request failed: ' + pError.message, 'error');
				});
	}

	authenticate()
	{
		let tmpUserName = document.getElementById('userName').value.trim();
		let tmpPassword = document.getElementById('password').value.trim();

		if (!tmpUserName || !tmpPassword)
		{
			this.pict.providers.ComprehensionLoader.setStatus('sessionAuthStatus', 'Username and password are required.', 'error');
			this.pict.providers.ComprehensionLoader.setSectionPhase(1, 'error');
			return;
		}

		this.pict.providers.ComprehensionLoader.setSectionPhase(1, 'busy');
		this.pict.providers.ComprehensionLoader.setStatus('sessionAuthStatus', 'Authenticating...', 'info');

		this.pict.providers.ComprehensionLoader.api('POST', '/comprehension_load/session/authenticate', { UserName: tmpUserName, Password: tmpPassword })
			.then(
				(pData) =>
				{
					if (pData.Success && pData.Authenticated)
					{
						this.pict.providers.ComprehensionLoader.setStatus('sessionAuthStatus', 'Authenticated successfully.', 'ok');
						this.pict.providers.ComprehensionLoader.setSectionPhase(1, 'ok');
					}
					else
					{
						this.pict.providers.ComprehensionLoader.setStatus('sessionAuthStatus', 'Authentication failed: ' + (pData.Error || 'Not authenticated'), 'error');
						this.pict.providers.ComprehensionLoader.setSectionPhase(1, 'error');
					}
				})
			.catch(
				(pError) =>
				{
					this.pict.providers.ComprehensionLoader.setStatus('sessionAuthStatus', 'Request failed: ' + pError.message, 'error');
					this.pict.providers.ComprehensionLoader.setSectionPhase(1, 'error');
				});
	}

	checkSession()
	{
		this.pict.providers.ComprehensionLoader.setStatus('sessionAuthStatus', 'Checking session...', 'info');

		this.pict.providers.ComprehensionLoader.api('GET', '/comprehension_load/session/check')
			.then(
				(pData) =>
				{
					if (pData.Authenticated)
					{
						this.pict.providers.ComprehensionLoader.setStatus('sessionAuthStatus', 'Session is active. Server: ' + (pData.ServerURL || 'N/A'), 'ok');
					}
					else if (pData.Configured)
					{
						this.pict.providers.ComprehensionLoader.setStatus('sessionAuthStatus', 'Session configured but not authenticated.', 'warn');
					}
					else
					{
						this.pict.providers.ComprehensionLoader.setStatus('sessionAuthStatus', 'No session configured.', 'warn');
					}
				})
			.catch(
				(pError) =>
				{
					this.pict.providers.ComprehensionLoader.setStatus('sessionAuthStatus', 'Request failed: ' + pError.message, 'error');
				});
	}

	deauthenticate()
	{
		this.pict.providers.ComprehensionLoader.api('POST', '/comprehension_load/session/deauthenticate')
			.then(
				(pData) =>
				{
					this.pict.providers.ComprehensionLoader.setStatus('sessionAuthStatus', 'Session deauthenticated.', 'info');
					this.pict.providers.ComprehensionLoader.setSectionPhase(1, '');
				})
			.catch(
				(pError) =>
				{
					this.pict.providers.ComprehensionLoader.setStatus('sessionAuthStatus', 'Request failed: ' + pError.message, 'error');
				});
	}

	goAction()
	{
		// Two-step: configure session, then authenticate after delay
		this.pict.providers.ComprehensionLoader.setSectionPhase(1, 'busy');
		this.configureSession();
		setTimeout(
			() =>
			{
				this.authenticate();
			}, 1500);
	}
}

module.exports = ComprehensionLoaderSessionView;

module.exports.default_configuration =
{
	ViewIdentifier: 'ComprehensionLoader-Session',
	DefaultRenderable: 'ComprehensionLoader-Session',
	DefaultDestinationAddress: '#ComprehensionLoader-Section-Session',
	Templates:
	[
		{
			Hash: 'ComprehensionLoader-Session',
			Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">1</div>
	<div class="accordion-card" id="section1" data-section="1">
		<div class="accordion-header" onclick="pict.views['ComprehensionLoader-Layout'].toggleSection('section1')">
			<div class="accordion-title">Remote Session</div>
			<span class="accordion-phase" id="phase1"></span>
			<div class="accordion-preview" id="preview1">Configure remote server URL and credentials</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['ComprehensionLoader-Session'].goAction()">go</span>
				<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto1"> <span class="auto-label">auto</span></label>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<div class="inline-group">
				<div style="flex:2">
					<label for="serverURL">Remote Server URL</label>
					<input type="text" id="serverURL" placeholder="http://remote-server:8086" value="">
				</div>
				<div style="flex:1">
					<label for="authMethod">Auth Method</label>
					<input type="text" id="authMethod" placeholder="get" value="get">
				</div>
			</div>

			<details style="margin-bottom:10px">
				<summary style="cursor:pointer; font-size:0.9em; color:#666">Advanced Session Options</summary>
				<div style="padding:10px 0">
					<label for="authURI">Authentication URI Template (leave blank for default)</label>
					<input type="text" id="authURI" placeholder="Authenticate/{~D:Record.UserName~}/{~D:Record.Password~}">
					<label for="checkURI">Check Session URI Template</label>
					<input type="text" id="checkURI" placeholder="CheckSession">
					<label for="cookieName">Cookie Name</label>
					<input type="text" id="cookieName" placeholder="SessionID" value="SessionID">
					<label for="cookieValueAddr">Cookie Value Address</label>
					<input type="text" id="cookieValueAddr" placeholder="SessionID" value="SessionID">
					<label for="cookieValueTemplate">Cookie Value Template (overrides Address if set)</label>
					<input type="text" id="cookieValueTemplate" placeholder="{~D:Record.SessionID~}">
					<label for="loginMarker">Login Marker</label>
					<input type="text" id="loginMarker" placeholder="LoggedIn" value="LoggedIn">
				</div>
			</details>

			<button class="primary" onclick="pict.views['ComprehensionLoader-Session'].configureSession()">Configure Session</button>
			<div id="sessionConfigStatus"></div>

			<hr style="margin:16px 0; border:none; border-top:1px solid #eee">

			<div class="inline-group">
				<div>
					<label for="userName">Username</label>
					<input type="text" id="userName" placeholder="username">
				</div>
				<div>
					<label for="password">Password</label>
					<input type="password" id="password" placeholder="password">
				</div>
			</div>

			<button class="success" onclick="pict.views['ComprehensionLoader-Session'].authenticate()">Authenticate</button>
			<button class="secondary" onclick="pict.views['ComprehensionLoader-Session'].checkSession()">Check Session</button>
			<button class="danger" onclick="pict.views['ComprehensionLoader-Session'].deauthenticate()">Deauthenticate</button>
			<div id="sessionAuthStatus"></div>
		</div>
	</div>
</div>
`
		}
	],
	Renderables:
	[
		{
			RenderableHash: 'ComprehensionLoader-Session',
			TemplateHash: 'ComprehensionLoader-Session',
			DestinationAddress: '#ComprehensionLoader-Section-Session'
		}
	]
};
