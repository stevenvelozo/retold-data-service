const libPictProvider = require('pict-provider');

class ComprehensionLoaderProvider extends libPictProvider
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
		// Section 1 — Remote Session
		let tmpServerURL = document.getElementById('serverURL');
		if (!tmpServerURL) return;
		tmpServerURL = tmpServerURL.value;
		let tmpUserName = document.getElementById('userName').value;
		if (tmpServerURL)
		{
			let tmpPreview1 = tmpServerURL;
			if (tmpUserName) tmpPreview1 += ' as ' + tmpUserName;
			document.getElementById('preview1').textContent = tmpPreview1;
		}
		else
		{
			document.getElementById('preview1').textContent = 'Configure remote server URL and credentials';
		}

		// Section 2 — Remote Schema
		let tmpEntities = this.pict.AppData.ComprehensionLoader.FetchedEntities || [];
		if (tmpEntities.length > 0)
		{
			document.getElementById('preview2').textContent = tmpEntities.length + ' entit' + (tmpEntities.length === 1 ? 'y' : 'ies') + ' discovered';
		}
		else
		{
			let tmpSchemaURL = document.getElementById('schemaURL').value;
			if (tmpSchemaURL)
			{
				document.getElementById('preview2').textContent = 'Schema from ' + tmpSchemaURL;
			}
			else
			{
				document.getElementById('preview2').textContent = 'Fetch entity schema from the remote server';
			}
		}

		// Section 3 — Comprehension Source
		let tmpSourceMode = document.querySelector('input[name="comprehensionSourceMode"]:checked');
		let tmpModeName = tmpSourceMode ? tmpSourceMode.value : 'url';
		if (tmpModeName === 'url')
		{
			let tmpURL = document.getElementById('comprehensionURL').value;
			if (tmpURL)
			{
				document.getElementById('preview3').textContent = 'URL: ' + tmpURL;
			}
			else
			{
				document.getElementById('preview3').textContent = 'Provide a comprehension JSON URL or upload files';
			}
		}
		else
		{
			document.getElementById('preview3').textContent = 'File upload mode';
		}

		// Section 4 — Load
		let tmpPreview4El = document.getElementById('preview4');
		if (tmpPreview4El)
		{
			tmpPreview4El.textContent = 'Push comprehension data to the remote server';
		}
	}

	initAccordionPreviews()
	{
		let tmpSelf = this;

		let tmpPreviewFields = [
			'serverURL', 'userName',
			'schemaURL',
			'comprehensionURL'
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

		document.querySelectorAll('input[name="comprehensionSourceMode"]').forEach(function(pEl)
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
			localStorage.setItem('comprehensionLoader_' + pFieldId, tmpEl.value);
		}
	}

	restoreFields()
	{
		let tmpPersistFields = this.pict.AppData.ComprehensionLoader.PersistFields;
		for (let i = 0; i < tmpPersistFields.length; i++)
		{
			let tmpId = tmpPersistFields[i];
			let tmpSaved = localStorage.getItem('comprehensionLoader_' + tmpId);
			if (tmpSaved !== null)
			{
				let tmpEl = document.getElementById(tmpId);
				if (tmpEl) tmpEl.value = tmpSaved;
			}
		}

		// Restore source mode radio
		let tmpSourceMode = localStorage.getItem('comprehensionLoader_comprehensionSourceMode');
		if (tmpSourceMode === 'file')
		{
			let tmpFileRadio = document.getElementById('sourceMode_file');
			if (tmpFileRadio) tmpFileRadio.checked = true;
		}
	}

	initPersistence()
	{
		let tmpSelf = this;
		this.restoreFields();

		let tmpPersistFields = this.pict.AppData.ComprehensionLoader.PersistFields;
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

		// Persist source mode radio
		document.querySelectorAll('input[name="comprehensionSourceMode"]').forEach(function(pEl)
		{
			pEl.addEventListener('change', function()
			{
				localStorage.setItem('comprehensionLoader_comprehensionSourceMode', this.value);
			});
		});

		// Persist auto-process checkboxes
		let tmpAutoIds = ['auto1', 'auto2', 'auto3', 'auto4'];
		for (let a = 0; a < tmpAutoIds.length; a++)
		{
			(function(pId)
			{
				let tmpEl = document.getElementById(pId);
				if (tmpEl)
				{
					let tmpSaved = localStorage.getItem('comprehensionLoader_' + pId);
					if (tmpSaved !== null) tmpEl.checked = tmpSaved === 'true';
					tmpEl.addEventListener('change', function()
					{
						localStorage.setItem('comprehensionLoader_' + pId, this.checked);
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
		let tmpAppData = this.pict.AppData.ComprehensionLoader;
		if (tmpAppData.LiveStatusTimer) clearInterval(tmpAppData.LiveStatusTimer);
		this.pollLiveStatus();
		let tmpSelf = this;
		tmpAppData.LiveStatusTimer = setInterval(function() { tmpSelf.pollLiveStatus(); }, 1500);
	}

	pollLiveStatus()
	{
		let tmpSelf = this;
		this.api('GET', '/comprehension_load/load/live-status')
			.then(function(pData)
			{
				tmpSelf.renderLiveStatus(pData);
			})
			.catch(function()
			{
				tmpSelf.renderLiveStatus({ Phase: 'disconnected', Message: 'Cannot reach server', TotalPushed: 0, TotalRecords: 0 });
			});
	}

	renderLiveStatus(pData)
	{
		// Cache the live status data for the detail view
		this.pict.AppData.ComprehensionLoader.LastLiveStatus = pData;

		let tmpBar = document.getElementById('liveStatusBar');
		let tmpMsg = document.getElementById('liveStatusMessage');
		let tmpMeta = document.getElementById('liveStatusMeta');
		let tmpProgressFill = document.getElementById('liveStatusProgressFill');
		if (!tmpBar) return;

		// Update phase class (preserve expanded class if present)
		let tmpWasExpanded = tmpBar.classList.contains('expanded');
		tmpBar.className = 'live-status-bar phase-' + (pData.Phase || 'idle');
		if (tmpWasExpanded) tmpBar.classList.add('expanded');

		// Update message
		tmpMsg.textContent = pData.Message || 'Idle';

		// Update meta info
		let tmpMetaParts = [];
		if (pData.Phase === 'loading' || pData.Phase === 'stopping')
		{
			if (pData.Elapsed)
			{
				tmpMetaParts.push('<span class="live-status-meta-item">\u23F1 ' + pData.Elapsed + '</span>');
			}
			if (pData.ETA)
			{
				tmpMetaParts.push('<span class="live-status-meta-item">~' + pData.ETA + ' remaining</span>');
			}
			if (pData.TotalEntities > 0)
			{
				tmpMetaParts.push('<span class="live-status-meta-item"><strong>' + pData.Completed + '</strong> / ' + pData.TotalEntities + ' entities</span>');
			}
			if (pData.TotalPushed > 0)
			{
				let tmpPushed = pData.TotalPushed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
				if (pData.TotalRecords > 0)
				{
					let tmpTotal = pData.TotalRecords.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
					tmpMetaParts.push('<span class="live-status-meta-item"><strong>' + tmpPushed + '</strong> / ' + tmpTotal + ' records</span>');
				}
				else
				{
					tmpMetaParts.push('<span class="live-status-meta-item"><strong>' + tmpPushed + '</strong> records</span>');
				}
			}
			if (pData.Errors > 0)
			{
				tmpMetaParts.push('<span class="live-status-meta-item" style="color:#dc3545"><strong>' + pData.Errors + '</strong> error' + (pData.Errors === 1 ? '' : 's') + '</span>');
			}
		}
		else if (pData.Phase === 'complete')
		{
			if (pData.TotalPushed > 0)
			{
				let tmpPushed = pData.TotalPushed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
				tmpMetaParts.push('<span class="live-status-meta-item"><strong>' + tmpPushed + '</strong> records pushed</span>');
			}
		}
		tmpMeta.innerHTML = tmpMetaParts.join('');

		// Update progress bar
		let tmpPct = 0;
		if (pData.Phase === 'loading' && pData.TotalRecords > 0 && pData.TotalPushed > 0)
		{
			tmpPct = Math.min((pData.TotalPushed / pData.TotalRecords) * 100, 99.9);
		}
		else if (pData.Phase === 'loading' && pData.TotalEntities > 0)
		{
			tmpPct = (pData.Completed / pData.TotalEntities) * 100;
		}
		else if (pData.Phase === 'complete')
		{
			tmpPct = 100;
		}
		tmpProgressFill.style.width = Math.min(100, Math.round(tmpPct)) + '%';

		// Auto-expand the detail view when load starts
		if ((pData.Phase === 'loading' || pData.Phase === 'stopping') && !this.pict.AppData.ComprehensionLoader.StatusDetailExpanded)
		{
			let tmpLayoutView = this.pict.views['ComprehensionLoader-Layout'];
			if (tmpLayoutView && typeof tmpLayoutView.toggleStatusDetail === 'function')
			{
				tmpLayoutView.toggleStatusDetail();
			}
		}

		// If the detail view is expanded, re-render it with fresh data
		if (this.pict.AppData.ComprehensionLoader.StatusDetailExpanded)
		{
			this.renderStatusDetail();
		}

		// Auto-fetch the load report when we detect a completed load but haven't loaded the report yet
		if (pData.Phase === 'complete' && !this.pict.AppData.ComprehensionLoader.LastReport)
		{
			let tmpSelf = this;
			this.api('GET', '/comprehension_load/load/report')
				.then(function(pReportData)
				{
					if (pReportData && pReportData.ReportVersion)
					{
						tmpSelf.pict.AppData.ComprehensionLoader.LastReport = pReportData;
						if (tmpSelf.pict.AppData.ComprehensionLoader.StatusDetailExpanded)
						{
							tmpSelf.renderStatusDetail();
						}
					}
				})
				.catch(function() { /* ignore fetch errors */ });
		}
	}

	// ================================================================
	// Status Detail Expansion
	// ================================================================

	onStatusDetailExpanded()
	{
		let tmpAppData = this.pict.AppData.ComprehensionLoader;
		tmpAppData.StatusDetailExpanded = true;

		// Immediate render from whatever data we have
		this.renderStatusDetail();

		// Start detail polling (poll /load/status for per-entity data)
		if (tmpAppData.StatusDetailTimer) clearInterval(tmpAppData.StatusDetailTimer);
		let tmpSelf = this;
		tmpAppData.StatusDetailTimer = setInterval(function() { tmpSelf.pollStatusDetail(); }, 2000);
		this.pollStatusDetail();
	}

	onStatusDetailCollapsed()
	{
		let tmpAppData = this.pict.AppData.ComprehensionLoader;
		tmpAppData.StatusDetailExpanded = false;

		if (tmpAppData.StatusDetailTimer)
		{
			clearInterval(tmpAppData.StatusDetailTimer);
			tmpAppData.StatusDetailTimer = null;
		}
	}

	pollStatusDetail()
	{
		let tmpSelf = this;
		this.api('GET', '/comprehension_load/load/status')
			.then(function(pData)
			{
				tmpSelf.pict.AppData.ComprehensionLoader.StatusDetailData = pData;
				tmpSelf.renderStatusDetail();
			})
			.catch(function() { /* ignore poll errors */ });
	}

	renderStatusDetail()
	{
		let tmpContainer = document.getElementById('ComprehensionLoader-StatusDetail-Container');
		if (!tmpContainer) return;

		let tmpAppData = this.pict.AppData.ComprehensionLoader;
		let tmpLiveStatus = tmpAppData.LastLiveStatus;
		let tmpStatusData = tmpAppData.StatusDetailData;
		let tmpReport = tmpAppData.LastReport;

		// Determine data source: live during load, report after load
		let tmpEntities = {};
		let tmpThroughputSamples = [];
		let tmpIsLive = false;

		if (tmpLiveStatus && (tmpLiveStatus.Phase === 'loading' || tmpLiveStatus.Phase === 'stopping'))
		{
			tmpIsLive = true;
			if (tmpStatusData && tmpStatusData.Entities) tmpEntities = tmpStatusData.Entities;
			if (tmpLiveStatus.ThroughputSamples) tmpThroughputSamples = tmpLiveStatus.ThroughputSamples;
		}
		else if (tmpReport && tmpReport.ReportVersion)
		{
			// Build entities object from report
			for (let i = 0; i < tmpReport.Entities.length; i++)
			{
				let tmpE = tmpReport.Entities[i];
				tmpEntities[tmpE.Name] = tmpE;
			}
			tmpThroughputSamples = tmpReport.ThroughputSamples || [];
		}
		else if (tmpStatusData && tmpStatusData.Entities)
		{
			tmpEntities = tmpStatusData.Entities;
			if (tmpLiveStatus && tmpLiveStatus.ThroughputSamples)
			{
				tmpThroughputSamples = tmpLiveStatus.ThroughputSamples;
			}
		}

		// Categorize entities
		let tmpRunning = [];
		let tmpPending = [];
		let tmpCompleted = [];
		let tmpErrors = [];
		let tmpEntityNames = Object.keys(tmpEntities);

		for (let i = 0; i < tmpEntityNames.length; i++)
		{
			let tmpName = tmpEntityNames[i];
			let tmpE = tmpEntities[tmpName];
			if (tmpE.Status === 'Pushing')
			{
				tmpRunning.push({ Name: tmpName, Data: tmpE });
			}
			else if (tmpE.Status === 'Pending')
			{
				tmpPending.push(tmpName);
			}
			else if (tmpE.Status === 'Complete')
			{
				tmpCompleted.push({ Name: tmpName, Data: tmpE });
			}
			else if (tmpE.Status === 'Error')
			{
				tmpErrors.push({ Name: tmpName, Data: tmpE });
			}
		}

		let tmpHtml = '';

		// === Section 1: Running Operations ===
		if (tmpRunning.length > 0 || tmpPending.length > 0)
		{
			tmpHtml += '<div class="status-detail-section">';
			tmpHtml += '<div class="status-detail-section-title">Running</div>';
			for (let i = 0; i < tmpRunning.length; i++)
			{
				let tmpOp = tmpRunning[i];
				let tmpPct = tmpOp.Data.Total > 0 ? Math.round((tmpOp.Data.Pushed / tmpOp.Data.Total) * 100) : 0;
				let tmpPushedFmt = this.formatNumber(tmpOp.Data.Pushed || 0);
				let tmpTotalFmt = this.formatNumber(tmpOp.Data.Total || 0);
				tmpHtml += '<div class="running-op-row">';
				tmpHtml += '  <div class="running-op-name">' + this.escapeHtml(tmpOp.Name) + '</div>';
				tmpHtml += '  <div class="running-op-bar"><div class="running-op-bar-fill" style="width:' + tmpPct + '%"></div></div>';
				tmpHtml += '  <div class="running-op-count">' + tmpPushedFmt + ' / ' + tmpTotalFmt + ' (' + tmpPct + '%)</div>';
				tmpHtml += '</div>';
			}
			if (tmpPending.length > 0)
			{
				tmpHtml += '<div class="running-op-pending">' + tmpPending.length + ' entit' + (tmpPending.length === 1 ? 'y' : 'ies') + ' waiting</div>';
			}
			tmpHtml += '</div>';
		}

		// === Section 2: Completed Operations ===
		if (tmpCompleted.length > 0)
		{
			tmpHtml += '<div class="status-detail-section">';
			tmpHtml += '<div class="status-detail-section-title">Completed (' + tmpCompleted.length + ')</div>';
			for (let i = 0; i < tmpCompleted.length; i++)
			{
				let tmpOp = tmpCompleted[i];
				let tmpPushedFmt = this.formatNumber(tmpOp.Data.Pushed || tmpOp.Data.Total || 0);
				tmpHtml += '<div class="completed-op-row">';
				tmpHtml += '<div class="completed-op-header">';
				tmpHtml += '  <span class="completed-op-checkmark">\u2713</span>';
				tmpHtml += '  <span class="completed-op-name">' + this.escapeHtml(tmpOp.Name) + '</span>';
				tmpHtml += '  <span class="completed-op-stats">' + tmpPushedFmt + ' records</span>';
				tmpHtml += '</div>';
				tmpHtml += '</div>';
			}
			tmpHtml += '</div>';
		}

		// === Section 3: Errors ===
		if (tmpErrors.length > 0)
		{
			tmpHtml += '<div class="status-detail-section">';
			tmpHtml += '<div class="status-detail-section-title">Errors (' + tmpErrors.length + ')</div>';
			for (let i = 0; i < tmpErrors.length; i++)
			{
				let tmpOp = tmpErrors[i];
				let tmpPushedFmt = this.formatNumber(tmpOp.Data.Pushed || 0);
				let tmpTotalFmt = this.formatNumber(tmpOp.Data.Total || 0);
				tmpHtml += '<div class="error-op-row">';
				tmpHtml += '<div class="error-op-header">';
				tmpHtml += '  <span style="color:#dc3545">\u2717</span>';
				tmpHtml += '  <span class="error-op-name">' + this.escapeHtml(tmpOp.Name) + '</span>';
				tmpHtml += '  <span class="error-op-status">' + tmpPushedFmt + ' / ' + tmpTotalFmt + '</span>';
				tmpHtml += '</div>';
				if (tmpOp.Data.ErrorMessage)
				{
					tmpHtml += '<div class="error-op-message">' + this.escapeHtml(tmpOp.Data.ErrorMessage) + '</div>';
				}
				tmpHtml += '</div>';
			}
			tmpHtml += '</div>';
		}

		if (tmpHtml === '')
		{
			if (tmpIsLive)
			{
				tmpHtml = '<div style="font-size:0.9em; color:#888; padding:8px 0">Load in progress, waiting for entity data\u2026</div>';
			}
			else
			{
				tmpHtml = '<div style="font-size:0.9em; color:#888; padding:8px 0">No load data available. Run a load to see operation details here.</div>';
			}
		}

		tmpContainer.innerHTML = tmpHtml;

		// Update the throughput histogram
		this.updateThroughputHistogram(tmpThroughputSamples);
	}

	updateThroughputHistogram(pSamples)
	{
		let tmpHistContainer = document.getElementById('ComprehensionLoader-Throughput-Histogram');
		if (!tmpHistContainer) return;

		if (!pSamples || pSamples.length < 2)
		{
			tmpHistContainer.style.display = 'none';
			return;
		}

		// Compute raw deltas per interval
		let tmpRawDeltas = [];
		for (let i = 1; i < pSamples.length; i++)
		{
			let tmpDelta = pSamples[i].pushed - pSamples[i - 1].pushed;
			if (tmpDelta < 0) tmpDelta = 0;
			tmpRawDeltas.push({ delta: tmpDelta, t: pSamples[i].t });
		}

		// Downsample if too many bars
		let tmpContainerWidth = tmpHistContainer.clientWidth || 800;
		let tmpMaxBars = Math.max(20, Math.floor(tmpContainerWidth / 6));
		let tmpAggregated = tmpRawDeltas;

		if (tmpRawDeltas.length > tmpMaxBars)
		{
			let tmpBucketSize = Math.ceil(tmpRawDeltas.length / tmpMaxBars);
			tmpAggregated = [];
			for (let i = 0; i < tmpRawDeltas.length; i += tmpBucketSize)
			{
				let tmpSum = 0;
				let tmpLastT = 0;
				for (let j = i; j < Math.min(i + tmpBucketSize, tmpRawDeltas.length); j++)
				{
					tmpSum += tmpRawDeltas[j].delta;
					tmpLastT = tmpRawDeltas[j].t;
				}
				tmpAggregated.push({ delta: tmpSum, t: tmpLastT });
			}
		}

		// Check for data
		let tmpHasData = false;
		for (let i = 0; i < tmpAggregated.length; i++)
		{
			if (tmpAggregated[i].delta > 0) { tmpHasData = true; break; }
		}
		if (!tmpHasData)
		{
			tmpHistContainer.style.display = 'none';
			return;
		}

		// Build bins
		let tmpStartT = pSamples[0].t;
		let tmpBins = [];
		for (let i = 0; i < tmpAggregated.length; i++)
		{
			let tmpElapsedSec = Math.round((tmpAggregated[i].t - tmpStartT) / 1000);
			tmpBins.push({
				Label: this.formatElapsed(tmpElapsedSec),
				Value: tmpAggregated[i].delta
			});
		}

		// Update the histogram view
		tmpHistContainer.style.display = '';
		let tmpHistView = this.pict.views['ComprehensionLoader-StatusHistogram'];
		if (tmpHistView)
		{
			tmpHistView.setBins(tmpBins);
			tmpHistView.renderHistogram();
		}
	}

	formatElapsed(pSec)
	{
		if (pSec < 60) return pSec + 's';
		if (pSec < 3600)
		{
			let tmpM = Math.floor(pSec / 60);
			let tmpS = pSec % 60;
			return tmpM + ':' + (tmpS < 10 ? '0' : '') + tmpS;
		}
		let tmpH = Math.floor(pSec / 3600);
		let tmpM = Math.floor((pSec % 3600) / 60);
		return tmpH + 'h' + (tmpM < 10 ? '0' : '') + tmpM;
	}

	formatCompact(pNum)
	{
		if (pNum >= 1000000) return (pNum / 1000000).toFixed(1) + 'M';
		if (pNum >= 10000) return (pNum / 1000).toFixed(0) + 'K';
		if (pNum >= 1000) return (pNum / 1000).toFixed(1) + 'K';
		return pNum.toString();
	}

	formatNumber(pNum)
	{
		return pNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	}

	// ================================================================
	// Auto-Process
	// ================================================================

	initAutoProcess()
	{
		let tmpSelf = this;
		this.api('GET', '/comprehension_load/load/live-status')
			.then(function(pData)
			{
				if (pData.Phase === 'loading' || pData.Phase === 'stopping')
				{
					tmpSelf.pict.AppData.ComprehensionLoader.ServerBusyAtLoad = true;
					tmpSelf.setSectionPhase(4, 'busy');
					tmpSelf.pict.views['ComprehensionLoader-Load'].startPolling();
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
			setTimeout(function() { tmpSelf.pict.views['ComprehensionLoader-Session'].goAction(); }, tmpDelay);
			tmpDelay += tmpStepDelay + 1500;
		}
		if (document.getElementById('auto2') && document.getElementById('auto2').checked)
		{
			setTimeout(function() { tmpSelf.pict.views['ComprehensionLoader-Schema'].fetchSchema(); }, tmpDelay);
			tmpDelay += tmpStepDelay;
		}
		if (document.getElementById('auto3') && document.getElementById('auto3').checked)
		{
			setTimeout(function() { tmpSelf.pict.views['ComprehensionLoader-Source'].goAction(); }, tmpDelay);
			tmpDelay += tmpStepDelay;
		}
		if (document.getElementById('auto4') && document.getElementById('auto4').checked)
		{
			setTimeout(function() { tmpSelf.pict.views['ComprehensionLoader-Load'].startLoad(); }, tmpDelay);
		}
	}
}

module.exports = ComprehensionLoaderProvider;

module.exports.default_configuration =
{
	ProviderIdentifier: 'ComprehensionLoader',
	AutoInitialize: true,
	AutoInitializeOrdinal: 0
};
