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
		// Section 1 — Database Connection (schema-driven; the
		// Connection view owns the heuristic that turns the active
		// schema's field values into preview text).  The view's
		// _buildPreviewText reads live DOM values for the active
		// provider and falls back to schema Defaults if a field's
		// element doesn't exist yet.
		let tmpConnView = this.pict.views['DataCloner-Connection'];
		let tmpConnState = (this.pict.AppData.DataCloner && this.pict.AppData.DataCloner.Connection) || null;
		let tmpPreview1Text;
		if (tmpConnView && tmpConnState && (tmpConnState.Schemas || []).length > 0)
		{
			tmpPreview1Text = tmpConnView._buildPreviewText(tmpConnState);
		}
		else
		{
			tmpPreview1Text = (tmpConnState && tmpConnState.PreviewText) || 'Loading providers…';
		}
		let tmpPreview1El = document.getElementById('preview1');
		if (tmpPreview1El) { tmpPreview1El.textContent = tmpPreview1Text; }

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
		let tmpMaxRecords = document.getElementById('syncMaxRecords').value;
		let tmpLogFile = document.getElementById('syncLogFile').checked;
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

		// Static (non-connection) fields that drive accordion previews.
		// Connection-section fields hook updateAllPreviews via
		// _persistConnectionFields() once schemas load — see
		// bootstrapConnectionSchemas().
		let tmpPreviewFields = [
			'connProvider',
			'serverURL', 'userName',
			'schemaURL',
			'pageSize', 'dateTimePrecisionMS',
			'syncMaxRecords',
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
		let tmpCheckboxes = ['syncDeletedRecords', 'syncLogFile'];
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
		if (!tmpEl) { return; }
		// Checkboxes persist .checked, everything else persists .value.
		// Older code special-cased a small set of checkbox ids (solrSecure,
		// mssqlLegacyPagination, etc.); the schema-driven path no longer
		// needs those — the checkbox handler in bootstrapConnectionSchemas
		// stores 'true' / 'false' which restore picks up below.
		if (tmpEl.type === 'checkbox')
		{
			localStorage.setItem('dataCloner_' + pFieldId, tmpEl.checked ? 'true' : 'false');
		}
		else
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
				if (tmpEl)
				{
					if (tmpEl.type === 'checkbox')
					{
						tmpEl.checked = (tmpSaved === 'true');
					}
					else
					{
						tmpEl.value = tmpSaved;
					}
				}
			}
		}

		// Restore checkbox state for non-connection checkboxes that
		// aren't in PersistFields (these all live outside the schema-
		// driven Connection section, so they stay hardcoded).
		let tmpSyncDeleted = localStorage.getItem('dataCloner_syncDeletedRecords');
		if (tmpSyncDeleted !== null)
		{
			let tmpEl = document.getElementById('syncDeletedRecords');
			if (tmpEl) tmpEl.checked = tmpSyncDeleted === 'true';
		}
		let tmpSyncMode = localStorage.getItem('dataCloner_syncMode');
		if (tmpSyncMode === 'Ongoing')
		{
			let tmpEl = document.getElementById('syncModeOngoing');
			if (tmpEl) tmpEl.checked = true;
		}
		let tmpAdvancedIDPagination = localStorage.getItem('dataCloner_syncAdvancedIDPagination');
		if (tmpAdvancedIDPagination !== null)
		{
			let tmpEl = document.getElementById('syncAdvancedIDPagination');
			if (tmpEl) tmpEl.checked = tmpAdvancedIDPagination === 'true';
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

		// (Connection-section checkboxes — solrSecure, mssqlLegacyPagination —
		// are handled by bootstrapConnectionSchemas() which hooks change
		// listeners after the schema-driven form renders.)

		// Persist advanced ID pagination checkbox
		let tmpAdvancedIDPaginationEl = document.getElementById('syncAdvancedIDPagination');
		if (tmpAdvancedIDPaginationEl)
		{
			tmpAdvancedIDPaginationEl.addEventListener('change', function()
			{
				localStorage.setItem('dataCloner_syncAdvancedIDPagination', this.checked);
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
	// Connection Schemas Bootstrap
	//
	// Fetches the host's aggregated connection-form schemas and re-
	// renders the Connection view so it shows the real provider list +
	// per-provider field blocks.  Then restores localStorage values
	// for the new (schema-driven) DOM ids and hooks save listeners.
	// ================================================================

	bootstrapConnectionSchemas(fCallback)
	{
		let tmpSelf = this;
		let tmpDone = (typeof(fCallback) === 'function') ? fCallback : function () {};

		this.api('GET', '/clone/connection/schemas')
			.then(function (pData)
			{
				let tmpSchemas = (pData && Array.isArray(pData.Schemas)) ? pData.Schemas : [];
				tmpSelf._applyConnectionSchemas(tmpSchemas);
				return tmpDone(null, tmpSchemas);
			})
			.catch(function (pError)
			{
				if (tmpSelf.fable && tmpSelf.fable.log && tmpSelf.fable.log.error)
				{
					tmpSelf.fable.log.error(`DataCloner: failed to fetch connection schemas: ${pError && pError.message}`);
				}
				// On failure, leave the empty-schema state in place — the
				// shared view's "no schemas detected" notice will surface.
				tmpSelf._applyConnectionSchemas([]);
				return tmpDone(pError);
			});
	}

	_applyConnectionSchemas(pSchemas)
	{
		let tmpAppData = this.pict.AppData.DataCloner;
		if (!tmpAppData.Connection) { tmpAppData.Connection = { Schemas: [], ActiveProvider: '', PreviewText: '' }; }
		tmpAppData.Connection.Schemas = pSchemas;

		// Pick an initial ActiveProvider — restore from localStorage
		// if the saved value matches one of the available providers,
		// otherwise default to the first schema (or stay empty).
		let tmpAvailable = pSchemas.map(function (pS) { return pS.Provider; });
		let tmpSavedProvider = localStorage.getItem('dataCloner_activeProvider');
		if (tmpSavedProvider && tmpAvailable.indexOf(tmpSavedProvider) >= 0)
		{
			tmpAppData.Connection.ActiveProvider = tmpSavedProvider;
		}
		else if (pSchemas.length > 0)
		{
			tmpAppData.Connection.ActiveProvider = pSchemas[0].Provider;
		}

		// Hand the schemas to the shared view, which renders the form
		// into #DataCloner-Connection-FormSlot.
		let tmpForm = this.pict.views['PictSection-ConnectionForm'];
		if (tmpForm)
		{
			let tmpSelf = this;
			tmpForm.options.OnProviderChange = function (pProvider)
			{
				tmpAppData.Connection.ActiveProvider = pProvider;
				localStorage.setItem('dataCloner_activeProvider', pProvider);
				// Re-hook persistence on the new active form's inputs
				// (the shared view re-renders on provider change, so the
				// previous input listeners are gone).
				tmpSelf._persistConnectionFields(pSchemas);
				tmpSelf.updateAllPreviews();
			};
			if (tmpAppData.Connection.ActiveProvider)
			{
				tmpForm._ActiveProvider = tmpAppData.Connection.ActiveProvider;
			}
			tmpForm.setSchemas(pSchemas);
		}

		// Re-render the DataCloner accordion shell so the preview text
		// reflects the active provider.
		let tmpAccordion = this.pict.views['DataCloner-Connection'];
		if (tmpAccordion) { tmpAccordion.render(); }

		// Restore values + hook input listeners on the freshly-rendered
		// shared-view inputs.
		this._persistConnectionFields(pSchemas);
		this.updateAllPreviews();
	}

	_persistConnectionFields(pSchemas)
	{
		let tmpForm = this.pict.views['PictSection-ConnectionForm'];
		if (!tmpForm) { return; }

		let tmpSelf = this;

		// Restore + hook every per-provider field.  saveField()
		// dispatches on element type internally so checkboxes and
		// text inputs share the same path.
		(pSchemas || []).forEach(function (pSchema)
		{
			(pSchema.Fields || []).forEach(function (pField)
			{
				let tmpId = tmpForm.fieldDOMId(pSchema.Provider, pField.Name);
				let tmpEl = document.getElementById(tmpId);
				if (!tmpEl) { return; }

				let tmpSaved = localStorage.getItem('dataCloner_' + tmpId);
				if (tmpSaved !== null)
				{
					if (tmpEl.type === 'checkbox')
					{
						tmpEl.checked = (tmpSaved === 'true');
					}
					else
					{
						tmpEl.value = tmpSaved;
					}
				}

				// Avoid double-binding when the shared view re-renders
				// on provider change.  We tag the element so subsequent
				// runs of this method are no-ops.
				if (tmpEl.dataset && tmpEl.dataset.dataclonerHooked === '1') { return; }
				if (tmpEl.dataset) { tmpEl.dataset.dataclonerHooked = '1'; }
				tmpEl.addEventListener('input',  function () { tmpSelf.saveField(tmpId); tmpSelf.updateAllPreviews(); });
				tmpEl.addEventListener('change', function () { tmpSelf.saveField(tmpId); tmpSelf.updateAllPreviews(); });
			});
		});
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
		// Cache the live status data for the detail view
		this.pict.AppData.DataCloner.LastLiveStatus = pData;

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
				let tmpCountedSoFar = pData.PreCountGrandTotal > 0
					? ' (' + pData.PreCountGrandTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' records found)'
					: '';
				tmpMetaParts.push('<span class="live-status-meta-item">counting: ' + pData.PreCountProgress.Counted + ' / ' + pData.PreCountProgress.TotalTables + ' tables' + tmpCountedSoFar + '</span>');
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
		if (pData.Phase === 'syncing' && pData.PreCountProgress && pData.PreCountProgress.Counted < pData.PreCountProgress.TotalTables)
		{
			// During counting phase, show table counting progress
			tmpPct = Math.min((pData.PreCountProgress.Counted / pData.PreCountProgress.TotalTables) * 100, 99);
		}
		else if (pData.Phase === 'syncing' && pData.PreCountGrandTotal > 0 && pData.TotalSynced > 0)
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

		// Auto-expand the detail view once when sync first starts so users see counting progress.
		// Only expand once per sync run — if the user collapses it, respect that choice.
		if ((pData.Phase === 'syncing' || pData.Phase === 'stopping') && !this.pict.AppData.DataCloner.StatusDetailExpanded && !this.pict.AppData.DataCloner.StatusDetailAutoExpanded)
		{
			this.pict.AppData.DataCloner.StatusDetailAutoExpanded = true;
			let tmpLayoutView = this.pict.views['DataCloner-Layout'];
			if (tmpLayoutView && typeof tmpLayoutView.toggleStatusDetail === 'function')
			{
				tmpLayoutView.toggleStatusDetail();
			}
		}

		// Reset the auto-expand flag when the sync is no longer running,
		// so the next sync run will auto-expand again.
		if (pData.Phase !== 'syncing' && pData.Phase !== 'stopping')
		{
			this.pict.AppData.DataCloner.StatusDetailAutoExpanded = false;
		}

		// If the detail view is expanded, re-render it with fresh data
		if (this.pict.AppData.DataCloner.StatusDetailExpanded)
		{
			this.renderStatusDetail();
		}

		// Auto-fetch the sync report when we detect a completed sync but haven't loaded the report yet
		if (pData.Phase === 'complete' && !this.pict.AppData.DataCloner.LastReport)
		{
			let tmpSelf = this;
			this.api('GET', '/clone/sync/report')
				.then(function(pReportData)
				{
					if (pReportData && pReportData.ReportVersion)
					{
						tmpSelf.pict.AppData.DataCloner.LastReport = pReportData;
						if (tmpSelf.pict.AppData.DataCloner.StatusDetailExpanded)
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
		let tmpAppData = this.pict.AppData.DataCloner;
		tmpAppData.StatusDetailExpanded = true;

		// Immediate render from whatever data we have
		this.renderStatusDetail();

		// Start detail polling (poll /sync/status for per-table data)
		if (tmpAppData.StatusDetailTimer) clearInterval(tmpAppData.StatusDetailTimer);
		let tmpSelf = this;
		tmpAppData.StatusDetailTimer = setInterval(function() { tmpSelf.pollStatusDetail(); }, 2000);
		this.pollStatusDetail();
	}

	onStatusDetailCollapsed()
	{
		let tmpAppData = this.pict.AppData.DataCloner;
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
		this.api('GET', '/clone/sync/status')
			.then(function(pData)
			{
				tmpSelf.pict.AppData.DataCloner.StatusDetailData = pData;
				tmpSelf.renderStatusDetail();
			})
			.catch(function() { /* ignore poll errors */ });
	}

	renderCountingPhaseDetail(pContainer, pPreCountProgress)
	{
		let tmpTables = pPreCountProgress.Tables || [];
		let tmpCounted = pPreCountProgress.Counted || 0;
		let tmpTotal = pPreCountProgress.TotalTables || 0;
		let tmpRunningTotal = 0;

		let tmpHtml = '<div class="status-detail-section">';
		tmpHtml += '<div class="status-detail-section-title">Counting Records (' + tmpCounted + ' / ' + tmpTotal + ' tables)</div>';

		if (tmpTables.length > 0)
		{
			tmpHtml += '<table class="precount-table">';
			tmpHtml += '<thead><tr><th>Table</th><th style="text-align:right">Records</th><th style="text-align:right">Time</th></tr></thead>';
			tmpHtml += '<tbody>';
			for (let i = 0; i < tmpTables.length; i++)
			{
				let tmpT = tmpTables[i];
				tmpRunningTotal += tmpT.Count;
				let tmpCountFmt = this.formatNumber(tmpT.Count);
				let tmpTimeFmt = tmpT.ElapsedMs < 1000
					? tmpT.ElapsedMs + 'ms'
					: (tmpT.ElapsedMs / 1000).toFixed(1) + 's';
				let tmpRowClass = tmpT.Error ? ' class="precount-error"' : '';
				tmpHtml += '<tr' + tmpRowClass + '>';
				tmpHtml += '<td>' + this.escapeHtml(tmpT.Name) + '</td>';
				tmpHtml += '<td style="text-align:right; font-variant-numeric:tabular-nums">' + tmpCountFmt + '</td>';
				tmpHtml += '<td style="text-align:right; font-variant-numeric:tabular-nums; color:#888">' + tmpTimeFmt + '</td>';
				tmpHtml += '</tr>';
			}
			tmpHtml += '</tbody>';
			tmpHtml += '<tfoot><tr>';
			tmpHtml += '<td><strong>Total</strong></td>';
			tmpHtml += '<td style="text-align:right; font-variant-numeric:tabular-nums"><strong>' + this.formatNumber(tmpRunningTotal) + '</strong></td>';
			tmpHtml += '<td></td>';
			tmpHtml += '</tr></tfoot>';
			tmpHtml += '</table>';
		}

		// Show pending indicator for remaining tables
		let tmpRemaining = tmpTotal - tmpCounted;
		if (tmpRemaining > 0)
		{
			tmpHtml += '<div class="precount-pending">';
			tmpHtml += '<span class="precount-spinner"></span> ';
			tmpHtml += tmpRemaining + ' table' + (tmpRemaining === 1 ? '' : 's') + ' remaining…';
			tmpHtml += '</div>';
		}

		tmpHtml += '</div>';
		pContainer.innerHTML = tmpHtml;
	}

	renderStatusDetail()
	{
		let tmpContainer = document.getElementById('DataCloner-StatusDetail-Container');
		if (!tmpContainer) return;

		let tmpAppData = this.pict.AppData.DataCloner;
		let tmpLiveStatus = tmpAppData.LastLiveStatus;
		let tmpStatusData = tmpAppData.StatusDetailData;
		let tmpReport = tmpAppData.LastReport;

		// During the counting phase, show per-table counts as they arrive
		if (tmpLiveStatus && tmpLiveStatus.PreCountProgress
			&& tmpLiveStatus.PreCountProgress.Tables
			&& tmpLiveStatus.Phase === 'syncing'
			&& tmpLiveStatus.PreCountProgress.Counted < tmpLiveStatus.PreCountProgress.TotalTables)
		{
			this.renderCountingPhaseDetail(tmpContainer, tmpLiveStatus.PreCountProgress);
			// Prepend the summary banner above the counting detail
			let tmpSummaryBanner = this.buildStatusSummaryHtml();
			if (tmpSummaryBanner)
			{
				tmpContainer.innerHTML = tmpSummaryBanner + tmpContainer.innerHTML;
			}
			// Hide histogram during counting
			let tmpHistContainer = document.getElementById('DataCloner-Throughput-Histogram');
			if (tmpHistContainer) tmpHistContainer.style.display = 'none';
			return;
		}

		// Determine data source: live during sync, report after sync
		let tmpTables = {};
		let tmpThroughputSamples = [];
		let tmpEventLog = [];
		let tmpIsLive = false;

		if (tmpLiveStatus && (tmpLiveStatus.Phase === 'syncing' || tmpLiveStatus.Phase === 'stopping'))
		{
			tmpIsLive = true;
			if (tmpStatusData && tmpStatusData.Tables) tmpTables = tmpStatusData.Tables;
			if (tmpLiveStatus.ThroughputSamples) tmpThroughputSamples = tmpLiveStatus.ThroughputSamples;
		}
		else if (tmpReport && tmpReport.ReportVersion)
		{
			// Build tables object from report
			for (let i = 0; i < tmpReport.Tables.length; i++)
			{
				let tmpT = tmpReport.Tables[i];
				tmpTables[tmpT.Name] = tmpT;
			}
			tmpThroughputSamples = tmpReport.ThroughputSamples || [];
			tmpEventLog = tmpReport.EventLog || [];
		}
		else if (tmpStatusData && tmpStatusData.Tables)
		{
			tmpTables = tmpStatusData.Tables;
			// Use throughput samples from live status if available (e.g. after page reload with completed sync)
			if (tmpLiveStatus && tmpLiveStatus.ThroughputSamples)
			{
				tmpThroughputSamples = tmpLiveStatus.ThroughputSamples;
			}
		}

		// Categorize tables
		let tmpRunning = [];
		let tmpPending = [];
		let tmpCompleted = [];
		let tmpErrors = [];
		let tmpTableNames = Object.keys(tmpTables);

		for (let i = 0; i < tmpTableNames.length; i++)
		{
			let tmpName = tmpTableNames[i];
			let tmpT = tmpTables[tmpName];
			if (tmpT.Status === 'Syncing')
			{
				tmpRunning.push({ Name: tmpName, Data: tmpT });
			}
			else if (tmpT.Status === 'Pending')
			{
				tmpPending.push(tmpName);
			}
			else if (tmpT.Status === 'Complete')
			{
				tmpCompleted.push({ Name: tmpName, Data: tmpT });
			}
			else if (tmpT.Status === 'Error' || tmpT.Status === 'Partial')
			{
				tmpErrors.push({ Name: tmpName, Data: tmpT });
			}
		}

		let tmpHtml = '';

		// === Summary Banner (mirrors collapsed bar counters) ===
		tmpHtml += this.buildStatusSummaryHtml();

		// === Section 1: Running Operations ===
		if (tmpRunning.length > 0 || tmpPending.length > 0)
		{
			tmpHtml += '<div class="status-detail-section">';
			tmpHtml += '<div class="status-detail-section-title">Running</div>';
			for (let i = 0; i < tmpRunning.length; i++)
			{
				let tmpOp = tmpRunning[i];
				let tmpPct = tmpOp.Data.Total > 0 ? Math.round((tmpOp.Data.Synced / tmpOp.Data.Total) * 100) : 0;
				let tmpSyncedFmt = this.formatNumber(tmpOp.Data.Synced || 0);
				let tmpTotalFmt = this.formatNumber(tmpOp.Data.Total || 0);
				tmpHtml += '<div class="running-op-row">';
				tmpHtml += '  <div class="running-op-name">' + this.escapeHtml(tmpOp.Name) + '</div>';
				tmpHtml += '  <div class="running-op-bar"><div class="running-op-bar-fill" style="width:' + tmpPct + '%"></div></div>';
				tmpHtml += '  <div class="running-op-count">' + tmpSyncedFmt + ' / ' + tmpTotalFmt + ' (' + tmpPct + '%)</div>';
				tmpHtml += '</div>';
			}
			if (tmpPending.length > 0)
			{
				tmpHtml += '<div class="running-op-pending">' + tmpPending.length + ' table' + (tmpPending.length === 1 ? '' : 's') + ' waiting</div>';
			}
			tmpHtml += '</div>';
		}

		// === Section 2: Completed Successful Operations ===
		if (tmpCompleted.length > 0)
		{
			tmpHtml += '<div class="status-detail-section">';
			tmpHtml += '<div class="status-detail-section-title">Completed (' + tmpCompleted.length + ')</div>';

			for (let i = 0; i < tmpCompleted.length; i++)
			{
				tmpHtml += this.renderCompletedRow(tmpCompleted[i]);
			}
			tmpHtml += '</div>';
		}

		// === Section 3: Unsuccessful Operations ===
		if (tmpErrors.length > 0)
		{
			tmpHtml += '<div class="status-detail-section">';
			tmpHtml += '<div class="status-detail-section-title">Errors (' + tmpErrors.length + ')</div>';
			for (let i = 0; i < tmpErrors.length; i++)
			{
				tmpHtml += this.renderErrorRow(tmpErrors[i], tmpEventLog);
			}
			tmpHtml += '</div>';
		}

		if (tmpHtml === '')
		{
			if (tmpIsLive)
			{
				tmpHtml = '<div style="font-size:0.9em; color:#888; padding:8px 0">Sync in progress, waiting for table data\u2026</div>';
			}
			else
			{
				tmpHtml = '<div style="font-size:0.9em; color:#888; padding:8px 0">No sync data available. Run a sync to see operation details here.</div>';
			}
		}

		tmpContainer.innerHTML = tmpHtml;

		// Update the throughput histogram via pict-section-histogram
		this.updateThroughputHistogram(tmpThroughputSamples);
	}

	updateThroughputHistogram(pSamples)
	{
		let tmpHistContainer = document.getElementById('DataCloner-Throughput-Histogram');
		if (!tmpHistContainer) return;

		if (!pSamples || pSamples.length < 2)
		{
			tmpHistContainer.style.display = 'none';
			return;
		}

		// --- Step 1: Compute raw deltas per 10s interval ---
		let tmpRawDeltas = [];
		for (let i = 1; i < pSamples.length; i++)
		{
			let tmpDelta = pSamples[i].synced - pSamples[i - 1].synced;
			if (tmpDelta < 0) tmpDelta = 0;
			tmpRawDeltas.push({ delta: tmpDelta, t: pSamples[i].t });
		}

		// --- Step 2: Downsample if there are too many bars ---
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

		// --- Step 3: Check for data ---
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

		// --- Step 4: Build bins for the histogram library ---
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

		// --- Step 5: Update the histogram view via the library ---
		tmpHistContainer.style.display = '';
		let tmpHistView = this.pict.views['DataCloner-StatusHistogram'];
		if (tmpHistView)
		{
			tmpHistView.setBins(tmpBins);
			tmpHistView.renderHistogram();
		}
	}

	buildStatusSummaryHtml()
	{
		let tmpLiveStatus = this.pict.AppData.DataCloner.LastLiveStatus;
		let tmpReport = this.pict.AppData.DataCloner.LastReport;

		let tmpParts = [];
		let tmpMessage = '';

		if (tmpLiveStatus && (tmpLiveStatus.Phase === 'syncing' || tmpLiveStatus.Phase === 'stopping'))
		{
			tmpMessage = tmpLiveStatus.Message || '';
			if (tmpLiveStatus.Elapsed)
			{
				tmpParts.push('<span class="live-status-meta-item">\u23F1 ' + this.escapeHtml(tmpLiveStatus.Elapsed) + '</span>');
			}
			if (tmpLiveStatus.ETA)
			{
				tmpParts.push('<span class="live-status-meta-item">~' + this.escapeHtml(tmpLiveStatus.ETA) + ' remaining</span>');
			}
			if (tmpLiveStatus.TotalTables > 0)
			{
				tmpParts.push('<span class="live-status-meta-item"><strong>' + tmpLiveStatus.Completed + '</strong> / ' + tmpLiveStatus.TotalTables + ' tables</span>');
			}
			if (tmpLiveStatus.TotalSynced > 0)
			{
				let tmpSynced = this.formatNumber(tmpLiveStatus.TotalSynced);
				if (tmpLiveStatus.PreCountGrandTotal > 0)
				{
					let tmpGrandTotal = this.formatNumber(tmpLiveStatus.PreCountGrandTotal);
					tmpParts.push('<span class="live-status-meta-item"><strong>' + tmpSynced + '</strong> / ' + tmpGrandTotal + ' records</span>');
				}
				else
				{
					tmpParts.push('<span class="live-status-meta-item"><strong>' + tmpSynced + '</strong> records</span>');
				}
			}
			else if (tmpLiveStatus.PreCountGrandTotal > 0)
			{
				let tmpGrandTotal = this.formatNumber(tmpLiveStatus.PreCountGrandTotal);
				tmpParts.push('<span class="live-status-meta-item">' + tmpGrandTotal + ' records to sync</span>');
			}
			if (tmpLiveStatus.PreCountProgress && tmpLiveStatus.PreCountProgress.Counted < tmpLiveStatus.PreCountProgress.TotalTables)
			{
				let tmpCountedSoFar = tmpLiveStatus.PreCountGrandTotal > 0
					? ' (' + this.formatNumber(tmpLiveStatus.PreCountGrandTotal) + ' records found)'
					: '';
				tmpParts.push('<span class="live-status-meta-item">counting: ' + tmpLiveStatus.PreCountProgress.Counted + ' / ' + tmpLiveStatus.PreCountProgress.TotalTables + ' tables' + tmpCountedSoFar + '</span>');
			}
			if (tmpLiveStatus.Errors > 0)
			{
				tmpParts.push('<span class="live-status-meta-item" style="color:#dc3545"><strong>' + tmpLiveStatus.Errors + '</strong> error' + (tmpLiveStatus.Errors === 1 ? '' : 's') + '</span>');
			}
		}
		else if (tmpLiveStatus && tmpLiveStatus.Phase === 'complete')
		{
			tmpMessage = tmpLiveStatus.Message || 'Sync complete';
			if (tmpLiveStatus.Elapsed)
			{
				tmpParts.push('<span class="live-status-meta-item">\u23F1 ' + this.escapeHtml(tmpLiveStatus.Elapsed) + '</span>');
			}
			if (tmpLiveStatus.TotalSynced > 0)
			{
				let tmpSynced = this.formatNumber(tmpLiveStatus.TotalSynced);
				tmpParts.push('<span class="live-status-meta-item"><strong>' + tmpSynced + '</strong> records synced</span>');
			}
		}
		else if (tmpReport && tmpReport.ReportVersion)
		{
			tmpMessage = 'Sync ' + (tmpReport.Outcome || 'complete').toLowerCase();
			if (tmpReport.RunTimestamps && tmpReport.RunTimestamps.DurationSeconds)
			{
				tmpParts.push('<span class="live-status-meta-item">\u23F1 ' + this.formatElapsed(tmpReport.RunTimestamps.DurationSeconds) + '</span>');
			}
			if (tmpReport.Summary)
			{
				if (tmpReport.Summary.TotalSynced > 0)
				{
					tmpParts.push('<span class="live-status-meta-item"><strong>' + this.formatNumber(tmpReport.Summary.TotalSynced) + '</strong> records synced</span>');
				}
				tmpParts.push('<span class="live-status-meta-item"><strong>' + tmpReport.Summary.TotalTables + '</strong> tables</span>');
				if (tmpReport.Summary.TotalErrors > 0)
				{
					tmpParts.push('<span class="live-status-meta-item" style="color:#dc3545"><strong>' + tmpReport.Summary.TotalErrors + '</strong> error' + (tmpReport.Summary.TotalErrors === 1 ? '' : 's') + '</span>');
				}
			}
		}

		if (!tmpMessage && tmpParts.length === 0) return '';

		let tmpHtml = '<div class="status-detail-summary">';
		if (tmpMessage)
		{
			tmpHtml += '<div class="status-detail-summary-message">' + this.escapeHtml(tmpMessage) + '</div>';
		}
		if (tmpParts.length > 0)
		{
			tmpHtml += '<div class="status-detail-summary-counters">' + tmpParts.join('') + '</div>';
		}
		tmpHtml += '</div>';
		return tmpHtml;
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

	renderCompletedRow(pOp)
	{
		let tmpNew = pOp.Data.New || 0;
		let tmpUpdated = pOp.Data.Updated || 0;
		let tmpUnchanged = pOp.Data.Unchanged || 0;
		let tmpDeleted = pOp.Data.Deleted || 0;
		let tmpServerTotal = pOp.Data.ServerTotal || 0;

		// Grand total for the ratio bar: all records the adapter dealt with
		let tmpGrandTotal = tmpUnchanged + tmpNew + tmpUpdated + tmpDeleted;
		if (tmpGrandTotal === 0 && tmpServerTotal > 0)
		{
			tmpGrandTotal = tmpServerTotal;
			tmpUnchanged = tmpServerTotal;
		}

		let tmpHtml = '<div class="completed-op-row">';
		tmpHtml += '<div class="completed-op-header">';
		tmpHtml += '  <span class="completed-op-checkmark">\u2713</span>';
		tmpHtml += '  <span class="completed-op-name">' + this.escapeHtml(pOp.Name) + '</span>';
		tmpHtml += '</div>';

		// Ratio bar: Unchanged / New / Updated / Deleted
		if (tmpGrandTotal > 0)
		{
			let tmpUnchangedPct = Math.round((tmpUnchanged / tmpGrandTotal) * 100);
			let tmpNewPct = Math.round((tmpNew / tmpGrandTotal) * 100);
			let tmpUpdatedPct = Math.round((tmpUpdated / tmpGrandTotal) * 100);
			let tmpDeletedPct = Math.round((tmpDeleted / tmpGrandTotal) * 100);

			// Ensure percentages sum to 100
			let tmpPctSum = tmpUnchangedPct + tmpNewPct + tmpUpdatedPct + tmpDeletedPct;
			if (tmpPctSum !== 100 && tmpPctSum > 0)
			{
				tmpUnchangedPct += (100 - tmpPctSum);
				if (tmpUnchangedPct < 0) tmpUnchangedPct = 0;
			}

			tmpHtml += '<div class="ratio-bar-container">';
			if (tmpUnchangedPct > 0) tmpHtml += '<div class="ratio-bar-segment unchanged" style="width:' + tmpUnchangedPct + '%" title="Unchanged: ' + this.formatNumber(tmpUnchanged) + '"></div>';
			if (tmpNewPct > 0) tmpHtml += '<div class="ratio-bar-segment new-records" style="width:' + tmpNewPct + '%" title="New: ' + this.formatNumber(tmpNew) + '"></div>';
			if (tmpUpdatedPct > 0) tmpHtml += '<div class="ratio-bar-segment updated" style="width:' + tmpUpdatedPct + '%" title="Updated: ' + this.formatNumber(tmpUpdated) + '"></div>';
			if (tmpDeletedPct > 0) tmpHtml += '<div class="ratio-bar-segment deleted" style="width:' + tmpDeletedPct + '%" title="Deleted: ' + this.formatNumber(tmpDeleted) + '"></div>';
			tmpHtml += '</div>';

			tmpHtml += '<div class="ratio-bar-legend">';
			if (tmpUnchanged > 0) tmpHtml += '<span class="ratio-bar-legend-item"><span class="ratio-bar-legend-dot unchanged-dot"></span> Unchanged (' + this.formatNumber(tmpUnchanged) + ')</span>';
			if (tmpNew > 0) tmpHtml += '<span class="ratio-bar-legend-item"><span class="ratio-bar-legend-dot new-dot"></span> New (' + this.formatNumber(tmpNew) + ')</span>';
			if (tmpUpdated > 0) tmpHtml += '<span class="ratio-bar-legend-item"><span class="ratio-bar-legend-dot updated-dot"></span> Updated (' + this.formatNumber(tmpUpdated) + ')</span>';
			if (tmpDeleted > 0) tmpHtml += '<span class="ratio-bar-legend-item"><span class="ratio-bar-legend-dot deleted-dot"></span> Deleted (' + this.formatNumber(tmpDeleted) + ')</span>';
			tmpHtml += '</div>';
		}

		tmpHtml += '</div>';
		return tmpHtml;
	}

	renderErrorRow(pOp, pEventLog)
	{
		let tmpSynced = pOp.Data.Synced || 0;
		let tmpTotal = pOp.Data.Total || 0;
		let tmpSyncedFmt = this.formatNumber(tmpSynced);
		let tmpTotalFmt = this.formatNumber(tmpTotal);

		let tmpHtml = '<div class="error-op-row">';
		tmpHtml += '<div class="error-op-header">';
		tmpHtml += '  <span style="color:#dc3545">\u2717</span>';
		tmpHtml += '  <span class="error-op-name">' + this.escapeHtml(pOp.Name) + '</span>';
		tmpHtml += '  <span class="error-op-status">' + pOp.Data.Status + ' \u2014 ' + tmpSyncedFmt + ' / ' + tmpTotalFmt + '</span>';
		tmpHtml += '</div>';

		if (pOp.Data.ErrorMessage)
		{
			tmpHtml += '<div class="error-op-message">' + this.escapeHtml(pOp.Data.ErrorMessage) + '</div>';
		}

		// Extract relevant log entries from EventLog
		if (pEventLog && pEventLog.length > 0)
		{
			let tmpRelevantLogs = [];
			for (let j = 0; j < pEventLog.length; j++)
			{
				let tmpLog = pEventLog[j];
				if (tmpLog.Data && tmpLog.Data.Table === pOp.Name &&
					(tmpLog.Type === 'TableError' || tmpLog.Type === 'TablePartial'))
				{
					tmpRelevantLogs.push(tmpLog);
				}
			}
			if (tmpRelevantLogs.length > 0)
			{
				tmpHtml += '<div class="error-op-log-entries">';
				for (let j = 0; j < tmpRelevantLogs.length; j++)
				{
					let tmpTimestamp = tmpRelevantLogs[j].Timestamp.replace('T', ' ').replace(/\.\d+Z$/, '');
					tmpHtml += '<div>' + this.escapeHtml(tmpTimestamp + ' ' + tmpRelevantLogs[j].Message) + '</div>';
				}
				tmpHtml += '</div>';
			}
		}

		tmpHtml += '</div>';
		return tmpHtml;
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
