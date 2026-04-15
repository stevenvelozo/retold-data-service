const libPictView = require('pict-view');

class DataClonerConnectionView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onProviderChange()
	{
		let tmpProvider = document.getElementById('connProvider').value;
		let tmpProviders = ['SQLite', 'MySQL', 'MSSQL', 'PostgreSQL', 'Solr', 'MongoDB', 'RocksDB', 'Bibliograph'];
		for (let i = 0; i < tmpProviders.length; i++)
		{
			let tmpEl = document.getElementById('config' + tmpProviders[i]);
			if (tmpEl)
			{
				tmpEl.style.display = (tmpProvider === tmpProviders[i]) ? '' : 'none';
			}
		}
		this.pict.providers.DataCloner.saveField('connProvider');
	}

	getProviderConfig()
	{
		let tmpProvider = document.getElementById('connProvider').value;
		let tmpConfig = {};

		if (tmpProvider === 'SQLite')
		{
			tmpConfig.SQLiteFilePath = document.getElementById('sqliteFilePath').value.trim() || '~/headlight-liveconnect-local/cloned.sqlite';
		}
		else if (tmpProvider === 'MySQL')
		{
			tmpConfig.host = document.getElementById('mysqlServer').value.trim() || '127.0.0.1';
			tmpConfig.port = parseInt(document.getElementById('mysqlPort').value, 10) || 3306;
			tmpConfig.user = document.getElementById('mysqlUser').value.trim() || 'root';
			tmpConfig.password = document.getElementById('mysqlPassword').value;
			tmpConfig.database = document.getElementById('mysqlDatabase').value.trim();
			tmpConfig.connectionLimit = parseInt(document.getElementById('mysqlConnectionLimit').value, 10) || 20;
		}
		else if (tmpProvider === 'MSSQL')
		{
			tmpConfig.server = document.getElementById('mssqlServer').value.trim() || '127.0.0.1';
			tmpConfig.port = parseInt(document.getElementById('mssqlPort').value, 10) || 1433;
			tmpConfig.user = document.getElementById('mssqlUser').value.trim() || 'sa';
			tmpConfig.password = document.getElementById('mssqlPassword').value;
			tmpConfig.database = document.getElementById('mssqlDatabase').value.trim();
			tmpConfig.connectionLimit = parseInt(document.getElementById('mssqlConnectionLimit').value, 10) || 20;
			// Use ROW_NUMBER() pagination instead of OFFSET/FETCH for
			// SQL Server 2008 R2 / 2012 or databases whose compatibility
			// level is < 110 (the parser rejects OFFSET/FETCH syntax
			// otherwise).
			tmpConfig.LegacyPagination = document.getElementById('mssqlLegacyPagination').checked;
		}
		else if (tmpProvider === 'PostgreSQL')
		{
			tmpConfig.host = document.getElementById('postgresqlHost').value.trim() || '127.0.0.1';
			tmpConfig.port = parseInt(document.getElementById('postgresqlPort').value, 10) || 5432;
			tmpConfig.user = document.getElementById('postgresqlUser').value.trim() || 'postgres';
			tmpConfig.password = document.getElementById('postgresqlPassword').value;
			tmpConfig.database = document.getElementById('postgresqlDatabase').value.trim();
			tmpConfig.max = parseInt(document.getElementById('postgresqlConnectionLimit').value, 10) || 10;
		}
		else if (tmpProvider === 'Solr')
		{
			tmpConfig.host = document.getElementById('solrHost').value.trim() || 'localhost';
			tmpConfig.port = parseInt(document.getElementById('solrPort').value, 10) || 8983;
			tmpConfig.core = document.getElementById('solrCore').value.trim() || 'default';
			tmpConfig.path = document.getElementById('solrPath').value.trim() || '/solr';
			tmpConfig.secure = document.getElementById('solrSecure').checked;
		}
		else if (tmpProvider === 'MongoDB')
		{
			tmpConfig.host = document.getElementById('mongodbHost').value.trim() || '127.0.0.1';
			tmpConfig.port = parseInt(document.getElementById('mongodbPort').value, 10) || 27017;
			tmpConfig.user = document.getElementById('mongodbUser').value.trim();
			tmpConfig.password = document.getElementById('mongodbPassword').value;
			tmpConfig.database = document.getElementById('mongodbDatabase').value.trim() || 'test';
			tmpConfig.maxPoolSize = parseInt(document.getElementById('mongodbConnectionLimit').value, 10) || 10;
		}
		else if (tmpProvider === 'RocksDB')
		{
			tmpConfig.RocksDBFolder = document.getElementById('rocksdbFolder').value.trim() || 'data/rocksdb';
		}
		else if (tmpProvider === 'Bibliograph')
		{
			tmpConfig.StorageFolder = document.getElementById('bibliographFolder').value.trim() || 'data/bibliograph';
		}

		return { Provider: tmpProvider, Config: tmpConfig };
	}

	connectProvider()
	{
		// Guard against re-entrant calls (e.g. rapid auto-connect polling)
		if (this._connectInFlight)
		{
			return;
		}
		this._connectInFlight = true;

		let tmpConnInfo = this.getProviderConfig();

		this.pict.providers.DataCloner.setSectionPhase(1, 'busy');
		this.pict.providers.DataCloner.setStatus('connectionStatus', 'Connecting to ' + tmpConnInfo.Provider + '...', 'info');

		let tmpSelf = this;
		this.pict.providers.DataCloner.api('POST', '/clone/connection/configure', tmpConnInfo)
			.then(
				(pData) =>
				{
					tmpSelf._connectInFlight = false;
					if (pData.Success)
					{
						tmpSelf.pict.providers.DataCloner.setStatus('connectionStatus', pData.Message, 'ok');
						tmpSelf.pict.providers.DataCloner.setSectionPhase(1, 'ok');
					}
					else
					{
						tmpSelf.pict.providers.DataCloner.setStatus('connectionStatus', 'Connection failed: ' + (pData.Error || 'Unknown error'), 'error');
						tmpSelf.pict.providers.DataCloner.setSectionPhase(1, 'error');
					}
				})
			.catch(
				(pError) =>
				{
					tmpSelf._connectInFlight = false;
					tmpSelf.pict.providers.DataCloner.setStatus('connectionStatus', 'Request failed: ' + pError.message, 'error');
					tmpSelf.pict.providers.DataCloner.setSectionPhase(1, 'error');
				});
	}

	testConnection()
	{
		let tmpConnInfo = this.getProviderConfig();

		this.pict.providers.DataCloner.setStatus('connectionStatus', 'Testing ' + tmpConnInfo.Provider + ' connection...', 'info');

		this.pict.providers.DataCloner.api('POST', '/clone/connection/test', tmpConnInfo)
			.then(
				(pData) =>
				{
					if (pData.Success)
					{
						this.pict.providers.DataCloner.setStatus('connectionStatus', pData.Message, 'ok');
					}
					else
					{
						this.pict.providers.DataCloner.setStatus('connectionStatus', 'Test failed: ' + (pData.Error || 'Unknown error'), 'error');
					}
				})
			.catch(
				(pError) =>
				{
					this.pict.providers.DataCloner.setStatus('connectionStatus', 'Request failed: ' + pError.message, 'error');
				});
	}

	checkConnectionStatus()
	{
		this.pict.providers.DataCloner.api('GET', '/clone/connection/status')
			.then(
				(pData) =>
				{
					if (pData.Connected)
					{
						this.pict.providers.DataCloner.setStatus('connectionStatus', 'Connected: ' + pData.Provider, 'ok');
						this.pict.providers.DataCloner.setSectionPhase(1, 'ok');
					}
				})
			.catch(
				() =>
				{
					/* ignore */
				});
	}
}

module.exports = DataClonerConnectionView;

module.exports.default_configuration =
{
	ViewIdentifier: 'DataCloner-Connection',
	DefaultRenderable: 'DataCloner-Connection',
	DefaultDestinationAddress: '#DataCloner-Section-Connection',
	Templates:
	[
		{
			Hash: 'DataCloner-Connection',
			Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">1</div>
	<div class="accordion-card" id="section1" data-section="1">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section1')">
			<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto1"> <span class="auto-label">auto</span></label>
			<div class="accordion-title">Database Connection</div>
			<span class="accordion-phase" id="phase1"></span>
			<div class="accordion-preview" id="preview1">SQLite at data/cloned.sqlite</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['DataCloner-Connection'].connectProvider()">go</span>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<p style="font-size:0.9em; color:#666; margin-bottom:10px">Configure the local database where cloned data will be stored. SQLite is connected by default.</p>

			<div class="inline-group">
				<div style="flex:0 0 200px">
					<label for="connProvider">Provider</label>
					<select id="connProvider" onchange="pict.views['DataCloner-Connection'].onProviderChange()">
						<option value="SQLite" selected>SQLite</option>
						<option value="MySQL">MySQL</option>
						<option value="MSSQL">MSSQL</option>
						<option value="PostgreSQL">PostgreSQL</option>
						<option value="Solr">Solr</option>
						<option value="MongoDB">MongoDB</option>
						<option value="RocksDB">RocksDB</option>
						<option value="Bibliograph">Bibliograph</option>
					</select>
				</div>
				<div style="flex:1; display:flex; align-items:flex-end; gap:8px">
					<button class="primary" onclick="pict.views['DataCloner-Connection'].connectProvider()">Connect</button>
					<button class="secondary" onclick="pict.views['DataCloner-Connection'].testConnection()">Test Connection</button>
				</div>
			</div>

			<!-- SQLite Config -->
			<div id="configSQLite">
				<label for="sqliteFilePath">SQLite File Path</label>
				<input type="text" id="sqliteFilePath" placeholder="~/headlight-liveconnect-local/cloned.sqlite" value="~/headlight-liveconnect-local/cloned.sqlite">
			</div>

			<!-- MySQL Config -->
			<div id="configMySQL" style="display:none">
				<div class="inline-group">
					<div style="flex:2">
						<label for="mysqlServer">Server</label>
						<input type="text" id="mysqlServer" placeholder="127.0.0.1" value="127.0.0.1">
					</div>
					<div style="flex:1">
						<label for="mysqlPort">Port</label>
						<input type="number" id="mysqlPort" placeholder="3306" value="3306">
					</div>
				</div>
				<div class="inline-group">
					<div>
						<label for="mysqlUser">User</label>
						<input type="text" id="mysqlUser" placeholder="root" value="root">
					</div>
					<div>
						<label for="mysqlPassword">Password</label>
						<input type="password" id="mysqlPassword" placeholder="password">
					</div>
				</div>
				<label for="mysqlDatabase">Database</label>
				<input type="text" id="mysqlDatabase" placeholder="meadow_clone">
				<div class="inline-group">
					<div>
						<label for="mysqlConnectionLimit">Connection Limit</label>
						<input type="number" id="mysqlConnectionLimit" placeholder="20" value="20">
					</div>
					<div></div>
				</div>
			</div>

			<!-- MSSQL Config -->
			<div id="configMSSQL" style="display:none">
				<div class="inline-group">
					<div style="flex:2">
						<label for="mssqlServer">Server</label>
						<input type="text" id="mssqlServer" placeholder="127.0.0.1" value="127.0.0.1">
					</div>
					<div style="flex:1">
						<label for="mssqlPort">Port</label>
						<input type="number" id="mssqlPort" placeholder="1433" value="1433">
					</div>
				</div>
				<div class="inline-group">
					<div>
						<label for="mssqlUser">User</label>
						<input type="text" id="mssqlUser" placeholder="sa" value="sa">
					</div>
					<div>
						<label for="mssqlPassword">Password</label>
						<input type="password" id="mssqlPassword" placeholder="password">
					</div>
				</div>
				<label for="mssqlDatabase">Database</label>
				<input type="text" id="mssqlDatabase" placeholder="meadow_clone">
				<div class="inline-group">
					<div>
						<label for="mssqlConnectionLimit">Connection Limit</label>
						<input type="number" id="mssqlConnectionLimit" placeholder="20" value="20">
					</div>
					<div></div>
				</div>
				<div style="margin-top:8px">
					<input type="checkbox" id="mssqlLegacyPagination">
					<label for="mssqlLegacyPagination" title="Enable for SQL Server 2008 R2 / 2012 or databases at compatibility_level &lt; 110. Uses ROW_NUMBER() pagination instead of OFFSET/FETCH.">Legacy pagination (SQL Server &lt; 2012 / compat level &lt; 110)</label>
				</div>
			</div>

			<!-- PostgreSQL Config -->
			<div id="configPostgreSQL" style="display:none">
				<div class="inline-group">
					<div style="flex:2">
						<label for="postgresqlHost">Host</label>
						<input type="text" id="postgresqlHost" placeholder="127.0.0.1" value="127.0.0.1">
					</div>
					<div style="flex:1">
						<label for="postgresqlPort">Port</label>
						<input type="number" id="postgresqlPort" placeholder="5432" value="5432">
					</div>
				</div>
				<div class="inline-group">
					<div>
						<label for="postgresqlUser">User</label>
						<input type="text" id="postgresqlUser" placeholder="postgres" value="postgres">
					</div>
					<div>
						<label for="postgresqlPassword">Password</label>
						<input type="password" id="postgresqlPassword" placeholder="password">
					</div>
				</div>
				<label for="postgresqlDatabase">Database</label>
				<input type="text" id="postgresqlDatabase" placeholder="meadow_clone">
				<div class="inline-group">
					<div>
						<label for="postgresqlConnectionLimit">Connection Pool Limit</label>
						<input type="number" id="postgresqlConnectionLimit" placeholder="10" value="10">
					</div>
					<div></div>
				</div>
			</div>

			<!-- Solr Config -->
			<div id="configSolr" style="display:none">
				<div class="inline-group">
					<div style="flex:2">
						<label for="solrHost">Host</label>
						<input type="text" id="solrHost" placeholder="localhost" value="localhost">
					</div>
					<div style="flex:1">
						<label for="solrPort">Port</label>
						<input type="number" id="solrPort" placeholder="8983" value="8983">
					</div>
				</div>
				<div class="inline-group">
					<div style="flex:2">
						<label for="solrCore">Core</label>
						<input type="text" id="solrCore" placeholder="default" value="default">
					</div>
					<div style="flex:1">
						<label for="solrPath">Path</label>
						<input type="text" id="solrPath" placeholder="/solr" value="/solr">
					</div>
				</div>
				<div class="checkbox-row">
					<input type="checkbox" id="solrSecure">
					<label for="solrSecure">Use HTTPS</label>
				</div>
			</div>

			<!-- MongoDB Config -->
			<div id="configMongoDB" style="display:none">
				<div class="inline-group">
					<div style="flex:2">
						<label for="mongodbHost">Host</label>
						<input type="text" id="mongodbHost" placeholder="127.0.0.1" value="127.0.0.1">
					</div>
					<div style="flex:1">
						<label for="mongodbPort">Port</label>
						<input type="number" id="mongodbPort" placeholder="27017" value="27017">
					</div>
				</div>
				<div class="inline-group">
					<div>
						<label for="mongodbUser">User</label>
						<input type="text" id="mongodbUser" placeholder="(optional)">
					</div>
					<div>
						<label for="mongodbPassword">Password</label>
						<input type="password" id="mongodbPassword" placeholder="(optional)">
					</div>
				</div>
				<label for="mongodbDatabase">Database</label>
				<input type="text" id="mongodbDatabase" placeholder="test" value="test">
				<div class="inline-group">
					<div>
						<label for="mongodbConnectionLimit">Max Pool Size</label>
						<input type="number" id="mongodbConnectionLimit" placeholder="10" value="10">
					</div>
					<div></div>
				</div>
			</div>

			<!-- RocksDB Config -->
			<div id="configRocksDB" style="display:none">
				<label for="rocksdbFolder">RocksDB Folder Path</label>
				<input type="text" id="rocksdbFolder" placeholder="data/rocksdb" value="data/rocksdb">
			</div>

			<!-- Bibliograph Config -->
			<div id="configBibliograph" style="display:none">
				<label for="bibliographFolder">Storage Folder Path</label>
				<input type="text" id="bibliographFolder" placeholder="data/bibliograph" value="data/bibliograph">
			</div>

			<div id="connectionStatus"></div>
		</div>
	</div>
</div>
`
		}
	],
	Renderables:
	[
		{
			RenderableHash: 'DataCloner-Connection',
			TemplateHash: 'DataCloner-Connection',
			DestinationAddress: '#DataCloner-Section-Connection'
		}
	]
};
