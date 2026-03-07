const libPictProvider = require('pict-provider');

class DataClonerProvider extends libPictProvider
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	// ================================================================
	// API Helper
	// ================================================================

	api(pMethod, pPath, pBody)
	{
		let tmpOpts = { method: pMethod, headers: {} };
		if (pBody)
		{
			tmpOpts.headers['Content-Type'] = 'application/json';
			tmpOpts.body = JSON.stringify(pBody);
		}
		return fetch(pPath, tmpOpts).then(function(pResponse) { return pResponse.json(); });
	}

	setStatus(pElementId, pMessage, pType)
	{
		let tmpEl = document.getElementById(pElementId);
		if (!tmpEl) return;
		tmpEl.className = 'status ' + (pType || 'info');
		tmpEl.textContent = pMessage;
		tmpEl.style.display = 'block';
	}

	escapeHtml(pStr)
	{
		let tmpDiv = document.createElement('div');
		tmpDiv.appendChild(document.createTextNode(pStr));
		return tmpDiv.innerHTML;
	}

	// ================================================================
	// Phase status indicators
	// ================================================================

	setSectionPhase(pSection, pState)
	{
		let tmpEl = document.getElementById('phase' + pSection);
		if (!tmpEl) return;

		tmpEl.className = 'accordion-phase';

		if (pState === 'ok')
		{
			tmpEl.innerHTML = '&#10003;';
			tmpEl.classList.add('visible', 'accordion-phase-ok');
		}
		else if (pState === 'error')
		{
			tmpEl.innerHTML = '&#10007;';
			tmpEl.classList.add('visible', 'accordion-phase-error');
		}
		else if (pState === 'busy')
		{
			tmpEl.innerHTML = '<span class="phase-spinner"></span>';
			tmpEl.classList.add('visible', 'accordion-phase-busy');
		}
		else
		{
			tmpEl.innerHTML = '';
		}
	}

	// ================================================================
	// Accordion Previews
	// ================================================================

	updateAllPreviews()
	{
		// Section 1 — Database Connection
		let tmpProvider = document.getElementById('connProvider');
		if (!tmpProvider) return;
		tmpProvider = tmpProvider.value;
		let tmpPreview1 = tmpProvider;
		if (tmpProvider === 'SQLite')
		{
			let tmpPath = document.getElementById('sqliteFilePath').value || 'data/cloned.sqlite';
			tmpPreview1 = 'SQLite at ' + tmpPath;
		}
		else if (tmpProvider === 'MySQL')
		{
			let tmpHost = document.getElementById('mysqlServer').value || '127.0.0.1';
			let tmpPort = document.getElementById('mysqlPort').value || '3306';
			let tmpUser = document.getElementById('mysqlUser').value || 'root';
			tmpPreview1 = 'MySQL on ' + tmpHost + ':' + tmpPort + ' as ' + tmpUser;
		}
		else if (tmpProvider === 'MSSQL')
		{
			let tmpHost = document.getElementById('mssqlServer').value || '127.0.0.1';
			let tmpPort = document.getElementById('mssqlPort').value || '1433';
			let tmpUser = document.getElementById('mssqlUser').value || 'sa';
			tmpPreview1 = 'MSSQL on ' + tmpHost + ':' + tmpPort + ' as ' + tmpUser;
		}
		else if (tmpProvider === 'PostgreSQL')
		{
			let tmpHost = document.getElementById('postgresqlHost').value || '127.0.0.1';
			let tmpPort = document.getElementById('postgresqlPort').value || '5432';
			let tmpUser = document.getElementById('postgresqlUser').value || 'postgres';
			tmpPreview1 = 'PostgreSQL on ' + tmpHost + ':' + tmpPort + ' as ' + tmpUser;
		}
		else if (tmpProvider === 'MongoDB')
		{
			let tmpHost = document.getElementById('mongodbHost').value || '127.0.0.1';
			let tmpPort = document.getElementById('mongodbPort').value || '27017';
			tmpPreview1 = 'MongoDB on ' + tmpHost + ':' + tmpPort;
		}
		else if (tmpProvider === 'Solr')
		{
			let tmpHost = document.getElementById('solrHost').value || '127.0.0.1';
			let tmpPort = document.getElementById('solrPort').value || '8983';
			tmpPreview1 = 'Solr on ' + tmpHost + ':' + tmpPort;
		}
		else if (tmpProvider === 'RocksDB')
		{
			let tmpFolder = document.getElementById('rocksdbFolder').value || 'data/rocksdb';
			tmpPreview1 = 'RocksDB at ' + tmpFolder;
		}
		else if (tmpProvider === 'Bibliograph')
		{
			let tmpFolder = document.getElementById('bibliographFolder').value || 'data/bibliograph';
			tmpPreview1 = 'Bibliograph at ' + tmpFolder;
		}
		document.getElementById('preview1').textContent = tmpPreview1;

		// Section 2 — Remote Session
		let tmpServerURL = document.getElementById('serverURL').value;
		let tmpUserName = document.getElementById('userName').value;
		if (tmpServerURL)
		{
			let tmpPreview2 = tmpServerURL;
			if (tmpUserName) tmpPreview2 += ' as ' + tmpUserName;
			document.getElementById('preview2').textContent = tmpPreview2;
		}
		else
		{
			document.getElementById('preview2').textContent = 'Configure remote server URL and credentials';
		}

		// Section 3 — Remote Schema
		let tmpTableChecks = document.querySelectorAll('#tableList input[type="checkbox"]:checked');
		if (tmpTableChecks.length > 0)
		{
			document.getElementById('preview3').textContent = tmpTableChecks.length + ' table' + (tmpTableChecks.length === 1 ? '' : 's') + ' selected';
		}
		else
		{
			let tmpSchemaURL = document.getElementById('schemaURL').value;
			if (tmpSchemaURL)
			{
				document.getElementById('preview3').textContent = 'Schema from ' + tmpSchemaURL;
			}
			else
			{
				document.getElementById('preview3').textContent = 'Fetch and select tables from the remote server';
			}
		}

		// Section 4 — Deploy Schema
		let tmpDeployedEl = document.getElementById('deployStatus');
		let tmpDeployedText = tmpDeployedEl ? tmpDeployedEl.textContent : '';
		if (tmpDeployedText && tmpDeployedText.indexOf('deployed') !== -1)
		{
			document.getElementById('preview4').textContent = tmpDeployedText;
		}
		else
		{
			document.getElementById('preview4').textContent = 'Create selected tables in the local database';
		}

		// Section 5 — Synchronize Data
		let tmpSyncMode = document.querySelector('input[name="syncMode"]:checked');
		let tmpModeName = tmpSyncMode ? tmpSyncMode.value : 'Initial';
		let tmpPageSize = document.getElementById('pageSize').value || '100';
		let tmpSyncPreview = tmpModeName + ' sync, page size ' + tmpPageSize;
		let tmpDeleted = document.getElementById('syncDeletedRecords').checked;
		if (tmpDeleted) tmpSyncPreview += ', including deleted';
		document.getElementById('preview5').textContent = tmpSyncPreview;

		// Section 6 — Export Configuration
		let tmpMaxRecords = document.getElementById('exportMaxRecords').value;
		let tmpLogFile = document.getElementById('exportLogFile').checked;
		let tmpExportParts = [];
		if (tmpMaxRecords && parseInt(tmpMaxRecords, 10) > 0) tmpExportParts.push('max ' + tmpMaxRecords + ' records');
		if (tmpLogFile) tmpExportParts.push('log enabled');
		else tmpExportParts.push('log disabled');
		document.getElementById('preview6').textContent = tmpExportParts.length > 0 ? 'Export: ' + tmpExportParts.join(', ') : 'Generate JSON config for headless cloning';

		// Section 7 — View Data
		let tmpViewTable = document.getElementById('viewTable').value;
		if (tmpViewTable)
		{
			document.getElementById('preview7').textContent = 'Viewing ' + tmpViewTable;
		}
		else
		{
			document.getElementById('preview7').textContent = 'Browse synced table data';
		}
	}

	initAccordionPreviews()
	{
		let tmpSelf = this;

		let tmpPreviewFields = [
			'connProvider', 'sqliteFilePath',
			'mysqlServer', 'mysqlPort', 'mysqlUser',
			'mssqlServer', 'mssqlPort', 'mssqlUser',
			'postgresqlHost', 'postgresqlPort', 'postgresqlUser',
			'mongodbHost', 'mongodbPort',
			'solrHost', 'solrPort',
			'rocksdbFolder', 'bibliographFolder',
			'serverURL', 'userName',
			'schemaURL',
			'pageSize', 'dateTimePrecisionMS',
			'exportMaxRecords',
			'viewTable', 'viewLimit'
		];

		let tmpHandler = function() { tmpSelf.updateAllPreviews(); };

		for (let i = 0; i < tmpPreviewFields.length; i++)
		{
			let tmpEl = document.getElementById(tmpPreviewFields[i]);
			if (tmpEl)
			{
				tmpEl.addEventListener('input', tmpHandler);
				tmpEl.addEventListener('change', tmpHandler);
			}
		}

		// Checkboxes and radios
		let tmpCheckboxes = ['syncDeletedRecords', 'exportLogFile'];
		for (let i = 0; i < tmpCheckboxes.length; i++)
		{
			let tmpEl = document.getElementById(tmpCheckboxes[i]);
			if (tmpEl) tmpEl.addEventListener('change', tmpHandler);
		}

		document.querySelectorAll('input[name="syncMode"]').forEach(function(pEl)
		{
			pEl.addEventListener('change', tmpHandler);
		});
	}

	// ================================================================
	// LocalStorage Persistence
	// ================================================================

	saveField(pFieldId)
	{
		let tmpEl = document.getElementById(pFieldId);
		if (tmpEl)
		{
			localStorage.setItem('dataCloner_' + pFieldId, tmpEl.value);
		}
	}

	restoreFields()
	{
		let tmpPersistFields = this.pict.AppData.DataCloner.PersistFields;
		for (let i = 0; i < tmpPersistFields.length; i++)
		{
			let tmpId = tmpPersistFields[i];
			let tmpSaved = localStorage.getItem('dataCloner_' + tmpId);
			if (tmpSaved !== null)
			{
				let tmpEl = document.getElementById(tmpId);
				if (tmpEl) tmpEl.value = tmpSaved;
			}
		}

		// Restore checkbox state
		let tmpSyncDeleted = localStorage.getItem('dataCloner_syncDeletedRecords');
		if (tmpSyncDeleted !== null)
		{
			document.getElementById('syncDeletedRecords').checked = tmpSyncDeleted === 'true';
		}
		// Restore sync mode
		let tmpSyncMode = localStorage.getItem('dataCloner_syncMode');
		if (tmpSyncMode === 'Ongoing')
		{
			document.getElementById('syncModeOngoing').checked = true;
		}
		let tmpSolrSecure = localStorage.getItem('dataCloner_solrSecure');
		if (tmpSolrSecure !== null)
		{
			document.getElementById('solrSecure').checked = tmpSolrSecure === 'true';
		}
	}

	initPersistence()
	{
		let tmpSelf = this;
		this.restoreFields();

		let tmpPersistFields = this.pict.AppData.DataCloner.PersistFields;
		for (let i = 0; i < tmpPersistFields.length; i++)
		{
			(function(pId)
			{
				let tmpEl = document.getElementById(pId);
				if (tmpEl)
				{
					tmpEl.addEventListener('input', function() { tmpSelf.saveField(pId); });
					tmpEl.addEventListener('change', function() { tmpSelf.saveField(pId); });
				}
			})(tmpPersistFields[i]);
		}

		// Persist sync deleted checkbox
		let tmpSyncDeletedEl = document.getElementById('syncDeletedRecords');
		if (tmpSyncDeletedEl)
		{
			tmpSyncDeletedEl.addEventListener('change', function()
			{
				localStorage.setItem('dataCloner_syncDeletedRecords', this.checked);
			});
		}

		// Persist sync mode radio
		document.querySelectorAll('input[name="syncMode"]').forEach(function(pEl)
		{
			pEl.addEventListener('change', function()
			{
				localStorage.setItem('dataCloner_syncMode', this.value);
			});
		});

		// Persist solr secure checkbox
		let tmpSolrSecureEl = document.getElementById('solrSecure');
		if (tmpSolrSecureEl)
		{
			tmpSolrSecureEl.addEventListener('change', function()
			{
				localStorage.setItem('dataCloner_solrSecure', this.checked);
			});
		}

		// Persist auto-process checkboxes
		let tmpAutoIds = ['auto1', 'auto2', 'auto3', 'auto4', 'auto5'];
		for (let a = 0; a < tmpAutoIds.length; a++)
		{
			(function(pId)
			{
				let tmpEl = document.getElementById(pId);
				if (tmpEl)
				{
					let tmpSaved = localStorage.getItem('dataCloner_' + pId);
					if (tmpSaved !== null) tmpEl.checked = tmpSaved === 'true';
					tmpEl.addEventListener('change', function()
					{
						localStorage.setItem('dataCloner_' + pId, this.checked);
					});
				}
			})(tmpAutoIds[a]);
		}
	}

	// ================================================================
	// Live Status Indicator
	// ================================================================

	startLiveStatusPolling()
	{
		let tmpAppData = this.pict.AppData.DataCloner;
		if (tmpAppData.LiveStatusTimer) clearInterval(tmpAppData.LiveStatusTimer);
		this.pollLiveStatus();
		let tmpSelf = this;
		tmpAppData.LiveStatusTimer = setInterval(function() { tmpSelf.pollLiveStatus(); }, 1500);
	}

	pollLiveStatus()
	{
		let tmpSelf = this;
		this.api('GET', '/clone/sync/live-status')
			.then(function(pData)
			{
				tmpSelf.renderLiveStatus(pData);
			})
			.catch(function()
			{
				tmpSelf.renderLiveStatus({ Phase: 'disconnected', Message: 'Cannot reach server', TotalSynced: 0, TotalRecords: 0 });
			});
	}

	renderLiveStatus(pData)
	{
		let tmpBar = document.getElementById('liveStatusBar');
		let tmpMsg = document.getElementById('liveStatusMessage');
		let tmpMeta = document.getElementById('liveStatusMeta');
		let tmpProgressFill = document.getElementById('liveStatusProgressFill');
		if (!tmpBar) return;

		// Update phase class
		tmpBar.className = 'live-status-bar phase-' + (pData.Phase || 'idle');

		// Update message
		tmpMsg.textContent = pData.Message || 'Idle';

		// Update meta info
		let tmpMetaParts = [];
		if (pData.Phase === 'syncing' || pData.Phase === 'stopping')
		{
			if (pData.Elapsed)
			{
				tmpMetaParts.push('<span class="live-status-meta-item">\u23F1 ' + pData.Elapsed + '</span>');
			}
			if (pData.ETA)
			{
				tmpMetaParts.push('<span class="live-status-meta-item">~' + pData.ETA + ' remaining</span>');
			}
			if (pData.TotalTables > 0)
			{
				tmpMetaParts.push('<span class="live-status-meta-item"><strong>' + pData.Completed + '</strong> / ' + pData.TotalTables + ' tables</span>');
			}
			if (pData.TotalSynced > 0)
			{
				let tmpSynced = pData.TotalSynced.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
				if (pData.PreCountGrandTotal > 0)
				{
					let tmpGrandTotal = pData.PreCountGrandTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
					tmpMetaParts.push('<span class="live-status-meta-item"><strong>' + tmpSynced + '</strong> / ' + tmpGrandTotal + ' records</span>');
				}
				else
				{
					tmpMetaParts.push('<span class="live-status-meta-item"><strong>' + tmpSynced + '</strong> records</span>');
				}
			}
			else if (pData.PreCountGrandTotal > 0)
			{
				let tmpGrandTotal = pData.PreCountGrandTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
				tmpMetaParts.push('<span class="live-status-meta-item">' + tmpGrandTotal + ' records to sync</span>');
			}
			if (pData.PreCountProgress && pData.PreCountProgress.Counted < pData.PreCountProgress.TotalTables)
			{
				tmpMetaParts.push('<span class="live-status-meta-item">counting: ' + pData.PreCountProgress.Counted + ' / ' + pData.PreCountProgress.TotalTables + '</span>');
			}
			if (pData.Errors > 0)
			{
				tmpMetaParts.push('<span class="live-status-meta-item" style="color:#dc3545"><strong>' + pData.Errors + '</strong> error' + (pData.Errors === 1 ? '' : 's') + '</span>');
			}
		}
		else if (pData.Phase === 'complete')
		{
			if (pData.TotalSynced > 0)
			{
				let tmpSynced = pData.TotalSynced.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
				tmpMetaParts.push('<span class="live-status-meta-item"><strong>' + tmpSynced + '</strong> records synced</span>');
			}
		}
		tmpMeta.innerHTML = tmpMetaParts.join('');

		// Update progress bar
		let tmpPct = 0;
		if (pData.Phase === 'syncing' && pData.PreCountGrandTotal > 0 && pData.TotalSynced > 0)
		{
			tmpPct = Math.min((pData.TotalSynced / pData.PreCountGrandTotal) * 100, 99.9);
		}
		else if (pData.Phase === 'syncing' && pData.TotalTables > 0)
		{
			let tmpTablePct = (pData.Completed / pData.TotalTables) * 100;
			if (pData.ActiveProgress && pData.ActiveProgress.Total > 0)
			{
				let tmpEntityPct = (pData.ActiveProgress.Synced / pData.ActiveProgress.Total) * (100 / pData.TotalTables);
				tmpPct = tmpTablePct + tmpEntityPct;
			}
			else
			{
				tmpPct = tmpTablePct;
			}
		}
		else if (pData.Phase === 'complete')
		{
			tmpPct = 100;
		}
		tmpProgressFill.style.width = Math.min(100, Math.round(tmpPct)) + '%';
	}

	// ================================================================
	// Deployed Tables Persistence
	// ================================================================

	saveDeployedTables()
	{
		localStorage.setItem('dataCloner_deployedTables', JSON.stringify(this.pict.AppData.DataCloner.DeployedTables));
	}

	restoreDeployedTables()
	{
		try
		{
			let tmpRaw = localStorage.getItem('dataCloner_deployedTables');
			if (tmpRaw)
			{
				this.pict.AppData.DataCloner.DeployedTables = JSON.parse(tmpRaw);
				this.pict.views['DataCloner-ViewData'].populateViewTableDropdown();
			}
		}
		catch (pError) { /* ignore */ }
	}

	// ================================================================
	// Auto-Process
	// ================================================================

	initAutoProcess()
	{
		let tmpSelf = this;
		this.api('GET', '/clone/sync/live-status')
			.then(function(pData)
			{
				if (pData.Phase === 'syncing' || pData.Phase === 'stopping')
				{
					tmpSelf.pict.AppData.DataCloner.ServerBusyAtLoad = true;
					tmpSelf.setSectionPhase(5, 'busy');
					tmpSelf.pict.views['DataCloner-Sync'].startPolling();
					return;
				}
				tmpSelf.runAutoProcessChain();
			})
			.catch(function()
			{
				// Server unreachable — don't auto-process
			});
	}

	runAutoProcessChain()
	{
		let tmpSelf = this;
		let tmpDelay = 0;
		let tmpStepDelay = 2000;

		if (document.getElementById('auto1') && document.getElementById('auto1').checked)
		{
			setTimeout(function() { tmpSelf.pict.views['DataCloner-Connection'].connectProvider(); }, tmpDelay);
			tmpDelay += tmpStepDelay;
		}
		if (document.getElementById('auto2') && document.getElementById('auto2').checked)
		{
			setTimeout(function() { tmpSelf.pict.views['DataCloner-Session'].goAction(); }, tmpDelay);
			tmpDelay += tmpStepDelay + 1500;
		}
		if (document.getElementById('auto3') && document.getElementById('auto3').checked)
		{
			setTimeout(function() { tmpSelf.pict.views['DataCloner-Schema'].fetchSchema(); }, tmpDelay);
			tmpDelay += tmpStepDelay;
		}
		if (document.getElementById('auto4') && document.getElementById('auto4').checked)
		{
			setTimeout(function() { tmpSelf.pict.views['DataCloner-Deploy'].deploySchema(); }, tmpDelay);
			tmpDelay += tmpStepDelay;
		}
		if (document.getElementById('auto5') && document.getElementById('auto5').checked)
		{
			setTimeout(function() { tmpSelf.pict.views['DataCloner-Sync'].startSync(); }, tmpDelay);
		}
	}
}

module.exports = DataClonerProvider;

module.exports.default_configuration =
{
	ProviderIdentifier: 'DataCloner',
	AutoInitialize: true,
	AutoInitializeOrdinal: 0
};
