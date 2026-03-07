const libPictView = require('pict-view');

class DataClonerSessionView extends libPictView
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
			this.pict.providers.DataCloner.setStatus('sessionConfigStatus', 'Server URL is required.', 'error');
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

		this.pict.providers.DataCloner.setStatus('sessionConfigStatus', 'Configuring session...', 'info');

		this.pict.providers.DataCloner.api('POST', '/clone/session/configure', tmpBody)
			.then(
				(pData) =>
				{
					if (pData.Success)
					{
						this.pict.providers.DataCloner.setStatus('sessionConfigStatus', 'Session configured for ' + pData.ServerURL + ' (domain: ' + pData.DomainMatch + ')', 'ok');
					}
					else
					{
						this.pict.providers.DataCloner.setStatus('sessionConfigStatus', 'Configuration failed: ' + (pData.Error || 'Unknown error'), 'error');
					}
				})
			.catch(
				(pError) =>
				{
					this.pict.providers.DataCloner.setStatus('sessionConfigStatus', 'Request failed: ' + pError.message, 'error');
				});
	}

	authenticate()
	{
		let tmpUserName = document.getElementById('userName').value.trim();
		let tmpPassword = document.getElementById('password').value.trim();

		if (!tmpUserName || !tmpPassword)
		{
			this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Username and password are required.', 'error');
			this.pict.providers.DataCloner.setSectionPhase(2, 'error');
			return;
		}

		this.pict.providers.DataCloner.setSectionPhase(2, 'busy');
		this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Authenticating...', 'info');

		this.pict.providers.DataCloner.api('POST', '/clone/session/authenticate', { UserName: tmpUserName, Password: tmpPassword })
			.then(
				(pData) =>
				{
					if (pData.Success && pData.Authenticated)
					{
						this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Authenticated successfully.', 'ok');
						this.pict.providers.DataCloner.setSectionPhase(2, 'ok');
					}
					else
					{
						this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Authentication failed: ' + (pData.Error || 'Not authenticated'), 'error');
						this.pict.providers.DataCloner.setSectionPhase(2, 'error');
					}
				})
			.catch(
				(pError) =>
				{
					this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Request failed: ' + pError.message, 'error');
					this.pict.providers.DataCloner.setSectionPhase(2, 'error');
				});
	}

	checkSession()
	{
		this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Checking session...', 'info');

		this.pict.providers.DataCloner.api('GET', '/clone/session/check')
			.then(
				(pData) =>
				{
					if (pData.Authenticated)
					{
						this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Session is active. Server: ' + (pData.ServerURL || 'N/A'), 'ok');
					}
					else if (pData.Configured)
					{
						this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Session configured but not authenticated.', 'warn');
					}
					else
					{
						this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'No session configured.', 'warn');
					}
				})
			.catch(
				(pError) =>
				{
					this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Request failed: ' + pError.message, 'error');
				});
	}

	deauthenticate()
	{
		this.pict.providers.DataCloner.api('POST', '/clone/session/deauthenticate')
			.then(
				(pData) =>
				{
					this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Session deauthenticated.', 'info');
				})
			.catch(
				(pError) =>
				{
					this.pict.providers.DataCloner.setStatus('sessionAuthStatus', 'Request failed: ' + pError.message, 'error');
				});
	}

	goAction()
	{
		// Two-step: configure session, then authenticate after delay
		this.pict.providers.DataCloner.setSectionPhase(2, 'busy');
		this.configureSession();
		setTimeout(
			() =>
			{
				this.authenticate();
			}, 1500);
	}
}

module.exports = DataClonerSessionView;

module.exports.default_configuration =
{
	ViewIdentifier: 'DataCloner-Session',
	DefaultRenderable: 'DataCloner-Session',
	DefaultDestinationAddress: '#DataCloner-Section-Session',
	Templates:
	[
		{
			Hash: 'DataCloner-Session',
			Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">2</div>
	<div class="accordion-card" id="section2" data-section="2">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section2')">
			<div class="accordion-title">Remote Session</div>
			<span class="accordion-phase" id="phase2"></span>
			<div class="accordion-preview" id="preview2">Configure remote server URL and credentials</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['DataCloner-Session'].goAction()">go</span>
				<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto2"> <span class="auto-label">auto</span></label>
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

			<button class="primary" onclick="pict.views['DataCloner-Session'].configureSession()">Configure Session</button>
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

			<button class="success" onclick="pict.views['DataCloner-Session'].authenticate()">Authenticate</button>
			<button class="secondary" onclick="pict.views['DataCloner-Session'].checkSession()">Check Session</button>
			<button class="danger" onclick="pict.views['DataCloner-Session'].deauthenticate()">Deauthenticate</button>
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
			RenderableHash: 'DataCloner-Session',
			TemplateHash: 'DataCloner-Session',
			DestinationAddress: '#DataCloner-Section-Session'
		}
	]
};
