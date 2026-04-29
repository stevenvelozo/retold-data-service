const libPictView = require('pict-view');

class DataClonerExportView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	buildConfigObject()
	{
		// LocalDatabase block — schema-driven via the Connection view's
		// getProviderConfig().  The wire format produced there matches
		// what each meadow-connection provider expects (lowercase field
		// names for SQL drivers, PascalCase for SQLite path, etc.).
		let tmpConnInfo = this.pict.views['DataCloner-Connection'].getProviderConfig();
		let tmpProvider = tmpConnInfo.Provider;
		let tmpConfig = {};
		tmpConfig.LocalDatabase = { Provider: tmpProvider, Config: tmpConnInfo.Config || {} };

		// ---- Remote Session ----
		tmpConfig.RemoteSession = {};
		let tmpServerURL = document.getElementById('serverURL').value.trim();
		if (tmpServerURL) tmpConfig.RemoteSession.ServerURL = tmpServerURL + '/1.0/';

		let tmpAuthMethod = document.getElementById('authMethod').value.trim();
		if (tmpAuthMethod) tmpConfig.RemoteSession.AuthenticationMethod = tmpAuthMethod;

		let tmpAuthURI = document.getElementById('authURI').value.trim();
		if (tmpAuthURI) tmpConfig.RemoteSession.AuthenticationURITemplate = tmpAuthURI;

		let tmpCheckURI = document.getElementById('checkURI').value.trim();
		if (tmpCheckURI) tmpConfig.RemoteSession.CheckSessionURITemplate = tmpCheckURI;

		let tmpCookieName = document.getElementById('cookieName').value.trim();
		if (tmpCookieName) tmpConfig.RemoteSession.CookieName = tmpCookieName;

		let tmpCookieValueAddr = document.getElementById('cookieValueAddr').value.trim();
		if (tmpCookieValueAddr) tmpConfig.RemoteSession.CookieValueAddress = tmpCookieValueAddr;

		let tmpCookieValueTemplate = document.getElementById('cookieValueTemplate').value.trim();
		if (tmpCookieValueTemplate) tmpConfig.RemoteSession.CookieValueTemplate = tmpCookieValueTemplate;

		let tmpLoginMarker = document.getElementById('loginMarker').value.trim();
		if (tmpLoginMarker) tmpConfig.RemoteSession.CheckSessionLoginMarker = tmpLoginMarker;

		// ---- Credentials ----
		let tmpUserName = document.getElementById('userName').value.trim();
		let tmpPassword = document.getElementById('password').value;
		if (tmpUserName || tmpPassword)
		{
			tmpConfig.Credentials = {};
			if (tmpUserName) tmpConfig.Credentials.UserName = tmpUserName;
			if (tmpPassword) tmpConfig.Credentials.Password = tmpPassword;
		}

		// ---- Schema ----
		let tmpSchemaURL = document.getElementById('schemaURL').value.trim();
		if (tmpSchemaURL) tmpConfig.SchemaURL = tmpSchemaURL;

		// ---- Tables ----
		let tmpSelectedTables = this.pict.views['DataCloner-Schema'].getSelectedTables();
		if (tmpSelectedTables.length > 0) tmpConfig.Tables = tmpSelectedTables;

		// ---- Sync Options ----
		tmpConfig.Sync = {};
		tmpConfig.Sync.Mode = document.querySelector('input[name="syncMode"]:checked').value;
		tmpConfig.Sync.PageSize = parseInt(document.getElementById('pageSize').value, 10) || 100;
		tmpConfig.Sync.SyncDeletedRecords = document.getElementById('syncDeletedRecords').checked;
		let tmpPrecision = parseInt(document.getElementById('dateTimePrecisionMS').value, 10);
		if (!isNaN(tmpPrecision) && tmpPrecision !== 1000) tmpConfig.Sync.DateTimePrecisionMS = tmpPrecision;
		let tmpMaxRecords = parseInt(document.getElementById('syncMaxRecords').value, 10);
		if (tmpMaxRecords > 0) tmpConfig.Sync.MaxRecords = tmpMaxRecords;
		if (document.getElementById('syncAdvancedIDPagination').checked) tmpConfig.Sync.UseAdvancedIDPagination = true;

		// Strategy-specific options
		let tmpBackSyncEl = document.getElementById('backSyncTimeLimit');
		if (tmpBackSyncEl)
		{
			let tmpBackSyncTimeLimit = parseInt(tmpBackSyncEl.value, 10);
			if (tmpBackSyncTimeLimit > 0) tmpConfig.Sync.BackSyncTimeLimit = tmpBackSyncTimeLimit;
		}
		let tmpTrueUpEl = document.getElementById('trueUpPageSize');
		if (tmpTrueUpEl)
		{
			let tmpTrueUpPageSize = parseInt(tmpTrueUpEl.value, 10);
			if (tmpTrueUpPageSize > 0) tmpConfig.Sync.TrueUpPageSize = tmpTrueUpPageSize;
		}

		return tmpConfig;
	}

	buildMeadowIntegrationConfig()
	{
		// Pull current connection values via the schema-driven Connection
		// view.  buildConfigObject() above can use the result directly,
		// but meadow-integration's clone CLI expects a slightly different
		// destination shape — `server` instead of `host`, `ConnectionPoolLimit`
		// instead of `connectionLimit` for MSSQL — so we adapt here.
		let tmpConnInfo = this.pict.views['DataCloner-Connection'].getProviderConfig();
		let tmpProvider = tmpConnInfo.Provider;
		let tmpConfigConn = tmpConnInfo.Config || {};
		let tmpConfig = {};

		// ---- Source ----
		let tmpServerURL = document.getElementById('serverURL').value.trim();
		tmpConfig.Source = { ServerURL: tmpServerURL ? tmpServerURL + '/1.0/' : 'https://localhost:8080/1.0/' };
		// When SessionManager handles auth, Source credentials are not needed
		tmpConfig.Source.UserID = false;
		tmpConfig.Source.Password = false;

		// ---- Destination ----
		// meadow-integration clone supports MySQL and MSSQL
		tmpConfig.Destination = {};
		if (tmpProvider === 'MySQL')
		{
			tmpConfig.Destination.Provider = 'MySQL';
			tmpConfig.Destination.MySQL =
				{
					server:          tmpConfigConn.host || '127.0.0.1',
					port:            tmpConfigConn.port || 3306,
					user:            tmpConfigConn.user || 'root',
					password:        tmpConfigConn.password || '',
					database:        tmpConfigConn.database || 'meadow',
					connectionLimit: tmpConfigConn.connectionLimit || 20
				};
		}
		else if (tmpProvider === 'MSSQL')
		{
			tmpConfig.Destination.Provider = 'MSSQL';
			tmpConfig.Destination.MSSQL =
				{
					server:              tmpConfigConn.server || '127.0.0.1',
					port:                tmpConfigConn.port || 1433,
					user:                tmpConfigConn.user || 'sa',
					password:            tmpConfigConn.password || '',
					database:            tmpConfigConn.database || 'meadow',
					ConnectionPoolLimit: tmpConfigConn.connectionLimit || 20
				};
			if (tmpConfigConn.LegacyPagination)
			{
				tmpConfig.Destination.MSSQL.LegacyPagination = true;
			}
		}
		else
		{
			// Default to MySQL placeholder for unsupported providers
			tmpConfig.Destination.Provider = 'MySQL';
			tmpConfig.Destination.MySQL = { server: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'meadow', connectionLimit: 20 };
		}

		// ---- Schema ----
		let tmpSchemaURL = document.getElementById('schemaURL').value.trim();
		if (tmpSchemaURL)
		{
			tmpConfig.SchemaURL = tmpSchemaURL;
		}
		else
		{
			tmpConfig.SchemaPath = './schema/Model-Extended.json';
		}

		// ---- Sync ----
		tmpConfig.Sync = {};
		tmpConfig.Sync.DefaultSyncMode = document.querySelector('input[name="syncMode"]:checked').value;
		tmpConfig.Sync.PageSize = parseInt(document.getElementById('pageSize').value, 10) || 100;
		let tmpMdwintPrecision = parseInt(document.getElementById('dateTimePrecisionMS').value, 10);
		if (!isNaN(tmpMdwintPrecision)) tmpConfig.Sync.DateTimePrecisionMS = tmpMdwintPrecision;
		let tmpSelectedTables = this.pict.views['DataCloner-Schema'].getSelectedTables();
		tmpConfig.Sync.SyncEntityList = tmpSelectedTables.length > 0 ? tmpSelectedTables : [];
		tmpConfig.Sync.SyncEntityOptions = {};
		if (document.getElementById('syncAdvancedIDPagination').checked) tmpConfig.Sync.UseAdvancedIDPagination = true;

		// Strategy-specific options
		let tmpBackSyncEl = document.getElementById('backSyncTimeLimit');
		if (tmpBackSyncEl)
		{
			let tmpBackSyncTimeLimit = parseInt(tmpBackSyncEl.value, 10);
			if (tmpBackSyncTimeLimit > 0) tmpConfig.Sync.BackSyncTimeLimit = tmpBackSyncTimeLimit;
		}
		let tmpTrueUpEl = document.getElementById('trueUpPageSize');
		if (tmpTrueUpEl)
		{
			let tmpTrueUpPageSize = parseInt(tmpTrueUpEl.value, 10);
			if (tmpTrueUpPageSize > 0) tmpConfig.Sync.TrueUpPageSize = tmpTrueUpPageSize;
		}

		// ---- SessionManager ----
		tmpConfig.SessionManager = { Sessions: {} };

		let tmpSessionConfig = {};
		tmpSessionConfig.Type = 'Cookie';

		// Authentication method
		let tmpAuthMethod = document.getElementById('authMethod').value.trim() || 'get';
		tmpSessionConfig.AuthenticationMethod = tmpAuthMethod;

		// Build the authentication URI template
		let tmpAuthURI = document.getElementById('authURI').value.trim();
		if (tmpAuthURI)
		{
			// If the URI is a relative path, prepend the server URL
			if (tmpAuthURI.charAt(0) === '/')
			{
				tmpSessionConfig.AuthenticationURITemplate = (tmpServerURL || '') + tmpAuthURI;
			}
			else
			{
				tmpSessionConfig.AuthenticationURITemplate = tmpAuthURI;
			}
		}
		else if (tmpServerURL)
		{
			// Default: Meadow-style GET authentication
			if (tmpAuthMethod === 'post')
			{
				tmpSessionConfig.AuthenticationURITemplate = tmpServerURL + '/1.0/Authenticate';
				tmpSessionConfig.AuthenticationRequestBody = {
					UserName: '{~D:Record.UserName~}',
					Password: '{~D:Record.Password~}'
				};
			}
			else
			{
				tmpSessionConfig.AuthenticationURITemplate = tmpServerURL + '/1.0/Authenticate/{~D:Record.UserName~}/{~D:Record.Password~}';
			}
		}

		// Check session URI
		let tmpCheckURI = document.getElementById('checkURI').value.trim();
		if (tmpCheckURI)
		{
			tmpSessionConfig.CheckSessionURITemplate = tmpCheckURI.charAt(0) === '/' ? (tmpServerURL || '') + tmpCheckURI : tmpCheckURI;
		}
		else if (tmpServerURL)
		{
			tmpSessionConfig.CheckSessionURITemplate = tmpServerURL + '/1.0/CheckSession';
		}

		// Login marker
		let tmpLoginMarker = document.getElementById('loginMarker').value.trim();
		tmpSessionConfig.CheckSessionLoginMarkerType = 'boolean';
		tmpSessionConfig.CheckSessionLoginMarker = tmpLoginMarker || 'LoggedIn';

		// Domain match — extract from server URL for auto-injection
		if (tmpServerURL)
		{
			try
			{
				let tmpUrlObj = new URL(tmpServerURL);
				tmpSessionConfig.DomainMatch = tmpUrlObj.host;
			}
			catch (pError)
			{
				tmpSessionConfig.DomainMatch = tmpServerURL;
			}
		}

		// Cookie injection
		let tmpCookieName = document.getElementById('cookieName').value.trim();
		tmpSessionConfig.CookieName = tmpCookieName || 'SessionID';

		let tmpCookieValueAddr = document.getElementById('cookieValueAddr').value.trim();
		if (tmpCookieValueAddr) tmpSessionConfig.CookieValueAddress = tmpCookieValueAddr;

		let tmpCookieValueTemplate = document.getElementById('cookieValueTemplate').value.trim();
		if (tmpCookieValueTemplate) tmpSessionConfig.CookieValueTemplate = tmpCookieValueTemplate;

		// Credentials
		let tmpUserName = document.getElementById('userName').value.trim();
		let tmpPassword = document.getElementById('password').value;
		tmpSessionConfig.Credentials = {};
		if (tmpUserName) tmpSessionConfig.Credentials.UserName = tmpUserName;
		if (tmpPassword) tmpSessionConfig.Credentials.Password = tmpPassword;

		tmpConfig.SessionManager.Sessions.SourceAPI = tmpSessionConfig;

		return tmpConfig;
	}

	generateConfig()
	{
		let tmpConfig = this.buildConfigObject();
		let tmpJson = JSON.stringify(tmpConfig, null, '\t');

		let tmpTextarea = document.getElementById('configOutput');
		tmpTextarea.value = tmpJson;
		tmpTextarea.style.display = '';

		// Build CLI flags from export options
		let tmpLogFlag = document.getElementById('syncLogFile').checked ? ' --log' : '';
		let tmpMaxFlag = '';
		let tmpExportMax = parseInt(document.getElementById('syncMaxRecords').value, 10);
		if (tmpExportMax > 0) tmpMaxFlag = ' --max ' + tmpExportMax;

		// Build CLI command (with config file)
		let tmpCliDiv = document.getElementById('cliCommand');
		tmpCliDiv.style.display = '';
		tmpCliDiv.querySelector('div').textContent = 'npx retold-data-service-clone --config clone-config.json --run' + tmpLogFlag + tmpMaxFlag;

		// Build one-liner (no config file needed) using --config-json
		let tmpOneShotDiv = document.getElementById('cliOneShot');
		tmpOneShotDiv.style.display = '';
		let tmpCompactJSON = JSON.stringify(tmpConfig);
		// Escape single quotes for shell wrapping
		let tmpEscapedJSON = tmpCompactJSON.replace(/'/g, "'\\''");
		let tmpOneShot = "npx retold-data-service-clone --config-json '" + tmpEscapedJSON + "' --run" + tmpLogFlag + tmpMaxFlag;
		tmpOneShotDiv.querySelector('div').textContent = tmpOneShot;

		// ---- meadow-integration (mdwint clone) config ----
		let tmpMdwintConfig = this.buildMeadowIntegrationConfig();
		let tmpMdwintJSON = JSON.stringify(tmpMdwintConfig, null, '\t');

		let tmpMdwintDiv = document.getElementById('mdwintExport');
		tmpMdwintDiv.style.display = '';

		let tmpMdwintTextarea = document.getElementById('mdwintConfigOutput');
		tmpMdwintTextarea.value = tmpMdwintJSON;

		// Build the mdwint CLI command
		let tmpMdwintCLI = 'mdwint clone --schema_path ./schema/Model-Extended.json';
		let tmpMdwintCLIDiv = document.getElementById('mdwintCLICommand');
		tmpMdwintCLIDiv.querySelector('div').textContent = tmpMdwintCLI;

		// Provider compatibility note
		let tmpProvider = document.getElementById('connProvider').value;
		if (tmpProvider !== 'MySQL' && tmpProvider !== 'MSSQL')
		{
			this.pict.providers.DataCloner.setStatus('mdwintConfigStatus', 'Note: mdwint clone only supports MySQL and MSSQL destinations. The config defaults to MySQL; update the Destination section for your target database.', 'warn');
		}
		else
		{
			this.pict.providers.DataCloner.setStatus('mdwintConfigStatus', '', '');
		}

		this.pict.providers.DataCloner.setStatus('configExportStatus', 'Config generated. Save as clone-config.json or copy the one-liner below.', 'ok');
	}

	copyConfig()
	{
		let tmpTextarea = document.getElementById('configOutput');
		if (!tmpTextarea.value)
		{
			this.pict.providers.DataCloner.setStatus('configExportStatus', 'Generate a config first.', 'warn');
			return;
		}
		let tmpSelf = this;
		navigator.clipboard.writeText(tmpTextarea.value).then(function()
		{
			tmpSelf.pict.providers.DataCloner.setStatus('configExportStatus', 'Config copied to clipboard.', 'ok');
		});
	}

	copyCLI()
	{
		let tmpCmd = document.getElementById('cliCommand').querySelector('div').textContent;
		let tmpSelf = this;
		navigator.clipboard.writeText(tmpCmd).then(function()
		{
			tmpSelf.pict.providers.DataCloner.setStatus('configExportStatus', 'CLI command copied to clipboard.', 'ok');
		});
	}

	copyOneShot()
	{
		let tmpCmd = document.getElementById('cliOneShot').querySelector('div').textContent;
		let tmpSelf = this;
		navigator.clipboard.writeText(tmpCmd).then(function()
		{
			tmpSelf.pict.providers.DataCloner.setStatus('configExportStatus', 'One-liner copied to clipboard.', 'ok');
		});
	}

	downloadConfig()
	{
		let tmpTextarea = document.getElementById('configOutput');
		if (!tmpTextarea.value)
		{
			this.generateConfig();
		}
		let tmpBlob = new Blob([tmpTextarea.value], { type: 'application/json' });
		let tmpAnchor = document.createElement('a');
		tmpAnchor.href = URL.createObjectURL(tmpBlob);
		tmpAnchor.download = 'clone-config.json';
		tmpAnchor.click();
		URL.revokeObjectURL(tmpAnchor.href);
		this.pict.providers.DataCloner.setStatus('configExportStatus', 'Config downloaded as clone-config.json.', 'ok');
	}

	copyMdwintConfig()
	{
		let tmpTextarea = document.getElementById('mdwintConfigOutput');
		if (!tmpTextarea.value)
		{
			this.pict.providers.DataCloner.setStatus('mdwintConfigStatus', 'Generate a config first.', 'warn');
			return;
		}
		let tmpSelf = this;
		navigator.clipboard.writeText(tmpTextarea.value).then(function()
		{
			tmpSelf.pict.providers.DataCloner.setStatus('mdwintConfigStatus', '.meadow.config.json copied to clipboard.', 'ok');
		});
	}

	copyMdwintCLI()
	{
		let tmpCmd = document.getElementById('mdwintCLICommand').querySelector('div').textContent;
		let tmpSelf = this;
		navigator.clipboard.writeText(tmpCmd).then(function()
		{
			tmpSelf.pict.providers.DataCloner.setStatus('mdwintConfigStatus', 'mdwint CLI command copied to clipboard.', 'ok');
		});
	}

	downloadMdwintConfig()
	{
		let tmpTextarea = document.getElementById('mdwintConfigOutput');
		if (!tmpTextarea.value)
		{
			this.generateConfig();
		}
		let tmpBlob = new Blob([tmpTextarea.value], { type: 'application/json' });
		let tmpAnchor = document.createElement('a');
		tmpAnchor.href = URL.createObjectURL(tmpBlob);
		tmpAnchor.download = '.meadow.config.json';
		tmpAnchor.click();
		URL.revokeObjectURL(tmpAnchor.href);
		this.pict.providers.DataCloner.setStatus('mdwintConfigStatus', 'Config downloaded as .meadow.config.json.', 'ok');
	}
}

module.exports = DataClonerExportView;

module.exports.default_configuration =
{
	ViewIdentifier: 'DataCloner-Export',
	DefaultRenderable: 'DataCloner-Export',
	DefaultDestinationAddress: '#DataCloner-Section-Export',
	Templates:
	[
		{
			Hash: 'DataCloner-Export',
			Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">6</div>
	<div class="accordion-card" id="section6" data-section="6">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section6')">
			<div class="accordion-title">Export Configuration</div>
			<div class="accordion-preview" id="preview6">Generate JSON config for headless cloning</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<p style="font-size:0.9em; color:#666; margin-bottom:10px">Generate a JSON config file from your current settings. Use it to run headless clones from the command line.</p>
			<div style="display:flex; gap:8px; margin-bottom:10px">
				<button class="primary" onclick="pict.views['DataCloner-Export'].generateConfig()">Generate Config</button>
				<button class="secondary" onclick="pict.views['DataCloner-Export'].copyConfig()">Copy to Clipboard</button>
				<button class="secondary" onclick="pict.views['DataCloner-Export'].downloadConfig()">Download JSON</button>
			</div>
			<div id="configExportStatus"></div>
			<div id="cliCommand" style="display:none; margin-bottom:10px">
				<label style="margin-bottom:4px">CLI Command <span style="color:#888; font-weight:normal">(with config file)</span></label>
				<div style="background:#1a1a1a; color:#4fc3f7; padding:10px 14px; border-radius:4px; font-family:monospace; font-size:0.9em; word-break:break-all; cursor:pointer" onclick="pict.views['DataCloner-Export'].copyCLI()" title="Click to copy"></div>
			</div>
			<div id="cliOneShot" style="display:none; margin-bottom:10px">
				<label style="margin-bottom:4px">One-liner <span style="color:#888; font-weight:normal">(no config file needed)</span></label>
				<div style="background:#1a1a1a; color:#4fc3f7; padding:10px 14px; border-radius:4px; font-family:monospace; font-size:0.9em; word-break:break-all; cursor:pointer; white-space:pre-wrap" onclick="pict.views['DataCloner-Export'].copyOneShot()" title="Click to copy"></div>
			</div>
			<textarea id="configOutput" style="display:none; width:100%; min-height:300px; font-family:monospace; font-size:0.85em; padding:10px; border:1px solid #ccc; border-radius:4px; background:#fafafa; tab-size:4; resize:vertical" readonly></textarea>

			<div id="mdwintExport" style="display:none; margin-top:16px; padding-top:16px; border-top:1px solid #eee">
				<h3 style="margin:0 0 8px; font-size:1em">meadow-integration CLI <span style="color:#888; font-weight:normal; font-size:0.85em">(mdwint clone)</span></h3>
				<p style="font-size:0.85em; color:#666; margin-bottom:8px">Save as <code>.meadow.config.json</code> in your project root, then run the command below. Requires a local Meadow extended schema JSON file.</p>
				<div style="display:flex; gap:8px; margin-bottom:10px">
					<button class="secondary" onclick="pict.views['DataCloner-Export'].copyMdwintConfig()">Copy Config</button>
					<button class="secondary" onclick="pict.views['DataCloner-Export'].downloadMdwintConfig()">Download .meadow.config.json</button>
				</div>
				<div id="mdwintCLICommand" style="margin-bottom:10px">
					<label style="margin-bottom:4px">CLI Command</label>
					<div style="background:#1a1a1a; color:#4fc3f7; padding:10px 14px; border-radius:4px; font-family:monospace; font-size:0.9em; word-break:break-all; cursor:pointer" onclick="pict.views['DataCloner-Export'].copyMdwintCLI()" title="Click to copy"></div>
				</div>
				<div id="mdwintConfigStatus"></div>
				<textarea id="mdwintConfigOutput" style="width:100%; min-height:250px; font-family:monospace; font-size:0.85em; padding:10px; border:1px solid #ccc; border-radius:4px; background:#fafafa; tab-size:4; resize:vertical" readonly></textarea>
			</div>
		</div>
	</div>
</div>
`
		}
	],
	Renderables:
	[
		{
			RenderableHash: 'DataCloner-Export',
			TemplateHash: 'DataCloner-Export',
			DestinationAddress: '#DataCloner-Section-Export'
		}
	]
};
