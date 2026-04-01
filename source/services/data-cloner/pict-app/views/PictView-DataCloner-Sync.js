const libPictView = require('pict-view');

class DataClonerSyncView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	startSync()
	{
		let tmpSelectedTables = this.pict.views['DataCloner-Schema'].getSelectedTables();
		let tmpPageSize = parseInt(document.getElementById('pageSize').value, 10) || 100;
		let tmpDateTimePrecisionMS = parseInt(document.getElementById('dateTimePrecisionMS').value, 10);
		if (isNaN(tmpDateTimePrecisionMS)) tmpDateTimePrecisionMS = 1000;
		let tmpSyncDeletedRecords = document.getElementById('syncDeletedRecords').checked;
		let tmpSyncMode = document.querySelector('input[name="syncMode"]:checked').value;
		let tmpMaxRecords = parseInt(document.getElementById('syncMaxRecords').value, 10) || 0;
		let tmpLogToFile = document.getElementById('syncLogFile').checked;
		let tmpAdvancedIDPagination = document.getElementById('syncAdvancedIDPagination').checked;

		if (tmpSelectedTables.length === 0)
		{
			this.pict.providers.DataCloner.setStatus('syncStatus', 'No tables selected for sync.', 'error');
			this.pict.providers.DataCloner.setSectionPhase(5, 'error');
			return;
		}

		this.pict.providers.DataCloner.setSectionPhase(5, 'busy');
		this.pict.providers.DataCloner.setStatus('syncStatus', 'Starting ' + tmpSyncMode.toLowerCase() + ' sync...', 'info');

		let tmpSelf = this;
		let tmpPostBody = { Tables: tmpSelectedTables, PageSize: tmpPageSize, DateTimePrecisionMS: tmpDateTimePrecisionMS, SyncDeletedRecords: tmpSyncDeletedRecords, SyncMode: tmpSyncMode };
		if (tmpMaxRecords > 0) tmpPostBody.MaxRecordsPerEntity = tmpMaxRecords;
		if (tmpLogToFile) tmpPostBody.LogToFile = true;
		if (tmpAdvancedIDPagination) tmpPostBody.UseAdvancedIDPagination = true;
		this.pict.providers.DataCloner.api('POST', '/clone/sync/start', tmpPostBody)
			.then(function(pData)
			{
				if (pData.Success)
				{
					let tmpMsg = pData.SyncMode + ' sync started for ' + pData.Tables.length + ' tables.';
					if (pData.SyncDeletedRecords) tmpMsg += ' (including deleted records)';
					tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', tmpMsg, 'ok');
					tmpSelf.startPolling();
				}
				else
				{
					tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Sync start failed: ' + (pData.Error || 'Unknown error'), 'error');
					tmpSelf.pict.providers.DataCloner.setSectionPhase(5, 'error');
				}
			})
			.catch(function(pError)
			{
				tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Request failed: ' + pError.message, 'error');
				tmpSelf.pict.providers.DataCloner.setSectionPhase(5, 'error');
			});
	}

	stopSync()
	{
		let tmpSelf = this;
		this.pict.providers.DataCloner.api('POST', '/clone/sync/stop')
			.then(function(pData)
			{
				tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Sync stop requested.', 'warn');
			})
			.catch(function(pError)
			{
				tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Request failed: ' + pError.message, 'error');
			});
	}

	startPolling()
	{
		if (this.pict.AppData.DataCloner.SyncPollTimer) clearInterval(this.pict.AppData.DataCloner.SyncPollTimer);
		let tmpSelf = this;
		this.pict.AppData.DataCloner.SyncPollTimer = setInterval(function() { tmpSelf.pollSyncStatus(); }, 2000);
		this.pollSyncStatus();
	}

	stopPolling()
	{
		if (this.pict.AppData.DataCloner.SyncPollTimer)
		{
			clearInterval(this.pict.AppData.DataCloner.SyncPollTimer);
			this.pict.AppData.DataCloner.SyncPollTimer = null;
		}
	}

	pollSyncStatus()
	{
		let tmpSelf = this;
		this.pict.providers.DataCloner.api('GET', '/clone/sync/status')
			.then(function(pData)
			{
				tmpSelf.renderSyncProgress(pData);

				if (!pData.Running && !pData.Stopping)
				{
					tmpSelf.stopPolling();
					if (Object.keys(pData.Tables || {}).length > 0)
					{
						// Check if any tables had errors or partial sync
						let tmpTables = pData.Tables || {};
						let tmpHasErrors = false;
						let tmpHasPartial = false;
						let tmpNames = Object.keys(tmpTables);
						for (let i = 0; i < tmpNames.length; i++)
						{
							if (tmpTables[tmpNames[i]].Status === 'Error') tmpHasErrors = true;
							if (tmpTables[tmpNames[i]].Status === 'Partial') tmpHasPartial = true;
						}

						if (tmpHasErrors)
						{
							tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Sync finished with errors. Check the table below for details.', 'error');
							tmpSelf.pict.providers.DataCloner.setSectionPhase(5, 'error');
						}
						else if (tmpHasPartial)
						{
							tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Sync finished. Some records were skipped (GUID conflicts or permission issues).', 'warn');
							tmpSelf.pict.providers.DataCloner.setSectionPhase(5, 'ok');
						}
						else
						{
							tmpSelf.pict.providers.DataCloner.setStatus('syncStatus', 'Sync complete.', 'ok');
							tmpSelf.pict.providers.DataCloner.setSectionPhase(5, 'ok');
						}

						// Fetch the structured report
						tmpSelf.fetchSyncReport();
					}
				}
			})
			.catch(function(pError)
			{
				// Silently ignore poll errors
			});
	}

	fetchSyncReport()
	{
		let tmpSelf = this;
		this.pict.providers.DataCloner.api('GET', '/clone/sync/report')
			.then(function(pData)
			{
				if (pData && pData.ReportVersion)
				{
					tmpSelf.pict.AppData.DataCloner.LastReport = pData;
					tmpSelf.renderSyncReport(pData);
				}
			})
			.catch(function(pError)
			{
				// Ignore report fetch errors
			});
	}

	renderSyncReport(pReport)
	{
		let tmpSection = document.getElementById('syncReportSection');
		tmpSection.style.display = '';

		// --- Summary Cards ---
		let tmpCardsContainer = document.getElementById('reportSummaryCards');
		let tmpOutcomeClass = 'outcome-' + pReport.Outcome.toLowerCase();
		let tmpOutcomeColor = { Success: '#28a745', Partial: '#ffc107', Error: '#dc3545', Stopped: '#6c757d' }[pReport.Outcome] || '#666';

		let tmpDurationSec = pReport.RunTimestamps.DurationSeconds || 0;
		let tmpDurationStr = tmpDurationSec < 60 ? tmpDurationSec + 's' : Math.floor(tmpDurationSec / 60) + 'm ' + (tmpDurationSec % 60) + 's';

		let tmpTotalSynced = pReport.Summary.TotalSynced.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		let tmpTotalRecords = pReport.Summary.TotalRecords.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

		tmpCardsContainer.innerHTML = ''
			+ '<div class="report-card ' + tmpOutcomeClass + '">'
			+ '  <div class="card-label">Outcome</div>'
			+ '  <div class="card-value" style="color:' + tmpOutcomeColor + '">' + pReport.Outcome + '</div>'
			+ '</div>'
			+ '<div class="report-card">'
			+ '  <div class="card-label">Mode</div>'
			+ '  <div class="card-value">' + pReport.Config.SyncMode + '</div>'
			+ '</div>'
			+ '<div class="report-card">'
			+ '  <div class="card-label">Duration</div>'
			+ '  <div class="card-value">' + tmpDurationStr + '</div>'
			+ '</div>'
			+ '<div class="report-card">'
			+ '  <div class="card-label">Tables</div>'
			+ '  <div class="card-value">' + pReport.Summary.Complete + ' / ' + pReport.Summary.TotalTables + '</div>'
			+ '</div>'
			+ '<div class="report-card">'
			+ '  <div class="card-label">Records</div>'
			+ '  <div class="card-value">' + tmpTotalSynced + '</div>'
			+ '  <div style="font-size:0.75em; color:#888">of ' + tmpTotalRecords + '</div>'
			+ '</div>';

		// --- Anomalies ---
		let tmpAnomalyContainer = document.getElementById('reportAnomalies');
		if (pReport.Anomalies.length === 0)
		{
			tmpAnomalyContainer.innerHTML = '<div style="color:#28a745; font-weight:600; font-size:0.9em">No anomalies detected.</div>';
		}
		else
		{
			let tmpHtml = '<h4 style="margin:0 0 8px; color:#dc3545; font-size:0.95em">Anomalies (' + pReport.Anomalies.length + ')</h4>';
			tmpHtml += '<table class="progress-table">';
			tmpHtml += '<tr><th>Table</th><th>Type</th><th>Message</th></tr>';
			for (let i = 0; i < pReport.Anomalies.length; i++)
			{
				let tmpAnomaly = pReport.Anomalies[i];
				let tmpTypeColor = tmpAnomaly.Type === 'Error' ? '#dc3545' : (tmpAnomaly.Type === 'Partial' ? '#ffc107' : '#6c757d');
				tmpHtml += '<tr>';
				tmpHtml += '<td><strong>' + this.pict.providers.DataCloner.escapeHtml(tmpAnomaly.Table) + '</strong></td>';
				tmpHtml += '<td style="color:' + tmpTypeColor + '">' + tmpAnomaly.Type + '</td>';
				tmpHtml += '<td>' + this.pict.providers.DataCloner.escapeHtml(tmpAnomaly.Message) + '</td>';
				tmpHtml += '</tr>';
			}
			tmpHtml += '</table>';
			tmpAnomalyContainer.innerHTML = tmpHtml;
		}

		// --- Top Tables by Duration ---
		let tmpTopContainer = document.getElementById('reportTopTables');
		let tmpTopCount = Math.min(10, pReport.Tables.length);
		if (tmpTopCount > 0)
		{
			let tmpHtml = '<h4 style="margin:0 0 8px; font-size:0.95em; color:#444">Top Tables by Duration</h4>';
			tmpHtml += '<table class="progress-table">';
			tmpHtml += '<tr><th>Table</th><th>Duration</th><th>Records</th><th>Status</th></tr>';
			for (let i = 0; i < tmpTopCount; i++)
			{
				let tmpTable = pReport.Tables[i];
				let tmpDur = tmpTable.DurationSeconds < 60 ? tmpTable.DurationSeconds + 's' : Math.floor(tmpTable.DurationSeconds / 60) + 'm ' + (tmpTable.DurationSeconds % 60) + 's';
				let tmpRecs = tmpTable.Total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
				let tmpStatusColor = { Complete: '#28a745', Error: '#dc3545', Partial: '#ffc107' }[tmpTable.Status] || '#666';
				tmpHtml += '<tr>';
				tmpHtml += '<td><strong>' + this.pict.providers.DataCloner.escapeHtml(tmpTable.Name) + '</strong></td>';
				tmpHtml += '<td>' + tmpDur + '</td>';
				tmpHtml += '<td>' + tmpRecs + '</td>';
				tmpHtml += '<td style="color:' + tmpStatusColor + '">' + tmpTable.Status + '</td>';
				tmpHtml += '</tr>';
			}
			tmpHtml += '</table>';
			tmpTopContainer.innerHTML = tmpHtml;
		}
	}

	downloadReport()
	{
		if (!this.pict.AppData.DataCloner.LastReport)
		{
			this.pict.providers.DataCloner.setStatus('reportStatus', 'No report available.', 'warn');
			return;
		}
		let tmpJson = JSON.stringify(this.pict.AppData.DataCloner.LastReport, null, '\t');
		let tmpBlob = new Blob([tmpJson], { type: 'application/json' });
		let tmpAnchor = document.createElement('a');
		tmpAnchor.href = URL.createObjectURL(tmpBlob);
		let tmpTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		tmpAnchor.download = 'DataCloner-Report-' + tmpTimestamp + '.json';
		tmpAnchor.click();
		URL.revokeObjectURL(tmpAnchor.href);
		this.pict.providers.DataCloner.setStatus('reportStatus', 'Report downloaded.', 'ok');
	}

	copyReport()
	{
		if (!this.pict.AppData.DataCloner.LastReport)
		{
			this.pict.providers.DataCloner.setStatus('reportStatus', 'No report available.', 'warn');
			return;
		}
		let tmpJson = JSON.stringify(this.pict.AppData.DataCloner.LastReport, null, '\t');
		let tmpSelf = this;
		navigator.clipboard.writeText(tmpJson).then(function()
		{
			tmpSelf.pict.providers.DataCloner.setStatus('reportStatus', 'Report copied to clipboard.', 'ok');
		});
	}

	renderSyncProgress(pData)
	{
		let tmpContainer = document.getElementById('syncProgress');
		let tmpTables = pData.Tables || {};
		let tmpTableNames = Object.keys(tmpTables);

		if (tmpTableNames.length === 0)
		{
			tmpContainer.innerHTML = '';
			return;
		}

		// Categorize tables into sections, preserving original order for pending
		let tmpSyncing = [];
		let tmpPending = [];
		let tmpCompleted = [];
		let tmpErrors = [];

		for (let i = 0; i < tmpTableNames.length; i++)
		{
			let tmpName = tmpTableNames[i];
			let tmpTable = tmpTables[tmpName];

			if (tmpTable.Status === 'Syncing')
			{
				tmpSyncing.push({ Name: tmpName, Data: tmpTable });
			}
			else if (tmpTable.Status === 'Pending')
			{
				tmpPending.push({ Name: tmpName, Data: tmpTable });
			}
			else if (tmpTable.Status === 'Complete')
			{
				tmpCompleted.push({ Name: tmpName, Data: tmpTable });
			}
			else
			{
				// Error, Partial, or anything else
				tmpErrors.push({ Name: tmpName, Data: tmpTable });
			}
		}

		let tmpHtml = '';
		let tmpSelf = this;
		let fRenderRow = (pName, pTable) =>
		{
			// Calculate percentage
			let tmpPct = 0;
			if (pTable.Total === 0 && (pTable.Status === 'Complete' || pTable.Status === 'Error'))
			{
				tmpPct = 100;
			}
			else if (pTable.Total > 0)
			{
				tmpPct = Math.round((pTable.Synced / pTable.Total) * 100);
			}

			// Color the progress bar based on status
			let tmpBarColor = '#28a745'; // green
			if (pTable.Status === 'Error') tmpBarColor = '#dc3545';
			else if (pTable.Status === 'Partial') tmpBarColor = '#ffc107';
			else if (pTable.Status === 'Syncing') tmpBarColor = '#4a90d9';
			else if (pTable.Status === 'Pending') tmpBarColor = '#adb5bd';

			// Status badge
			let tmpStatusBadge = pTable.Status;
			if (pTable.Status === 'Complete' && pTable.Total === 0) tmpStatusBadge = 'Complete (empty)';
			if (pTable.Status === 'Partial') tmpStatusBadge = 'Partial \u26A0';
			if (pTable.Status === 'Error') tmpStatusBadge = 'Error \u2716';

			// Details column
			let tmpDetails = '';
			if (pTable.ErrorMessage) tmpDetails = pTable.ErrorMessage;
			else if (pTable.Skipped > 0) tmpDetails = pTable.Skipped + ' record(s) skipped';
			else if ((pTable.Errors || 0) > 0) tmpDetails = pTable.Errors + ' error(s)';
			else if (pTable.Status === 'Complete' && pTable.Total === 0) tmpDetails = 'No records on server';
			else if (pTable.Status === 'Complete') tmpDetails = '\u2714 OK';

			let tmpRow = '<tr>';
			tmpRow += '<td><strong>' + pName + '</strong></td>';
			tmpRow += '<td>' + tmpStatusBadge + '</td>';
			tmpRow += '<td>';
			tmpRow += '<div class="progress-bar-container"><div class="progress-bar-fill" style="width:' + tmpPct + '%; background:' + tmpBarColor + '"></div></div>';
			tmpRow += ' ' + tmpPct + '%';
			tmpRow += '</td>';
			tmpRow += '<td>' + pTable.Synced + ' / ' + pTable.Total + '</td>';
			tmpRow += '<td>' + tmpDetails + '</td>';
			tmpRow += '</tr>';
			return tmpRow;
		};

		// === SYNCING — currently active ===
		if (tmpSyncing.length > 0)
		{
			tmpHtml += '<div class="sync-section-header">Syncing</div>';
			tmpHtml += '<table class="progress-table">';
			tmpHtml += '<tr><th>Table</th><th>Status</th><th>Progress</th><th>Synced</th><th>Details</th></tr>';
			for (let i = 0; i < tmpSyncing.length; i++)
			{
				tmpHtml += fRenderRow(tmpSyncing[i].Name, tmpSyncing[i].Data);
			}
			tmpHtml += '</table>';
		}

		// === NEXT UP — pending tables in queue order ===
		if (tmpPending.length > 0)
		{
			tmpHtml += '<div class="sync-section-header">Next Up <span class="sync-section-count">' + tmpPending.length + '</span></div>';
			// Show at most 8 upcoming; collapse the rest
			let tmpShowCount = Math.min(8, tmpPending.length);
			tmpHtml += '<table class="progress-table progress-table-muted">';
			for (let i = 0; i < tmpShowCount; i++)
			{
				tmpHtml += '<tr><td>' + tmpPending[i].Name + '</td>';
				if (tmpPending[i].Data.Total > 0)
				{
					tmpHtml += '<td class="sync-pending-count">' + tmpPending[i].Data.Total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' records</td>';
				}
				else
				{
					tmpHtml += '<td class="sync-pending-count">—</td>';
				}
				tmpHtml += '</tr>';
			}
			tmpHtml += '</table>';
			if (tmpPending.length > tmpShowCount)
			{
				tmpHtml += '<div class="sync-section-overflow">+ ' + (tmpPending.length - tmpShowCount) + ' more table' + (tmpPending.length - tmpShowCount === 1 ? '' : 's') + '</div>';
			}
		}

		// === ERRORS — failed or partial ===
		if (tmpErrors.length > 0)
		{
			tmpHtml += '<div class="sync-section-header sync-section-header-error">Errors <span class="sync-section-count">' + tmpErrors.length + '</span></div>';
			tmpHtml += '<table class="progress-table">';
			tmpHtml += '<tr><th>Table</th><th>Status</th><th>Progress</th><th>Synced</th><th>Details</th></tr>';
			for (let i = 0; i < tmpErrors.length; i++)
			{
				tmpHtml += fRenderRow(tmpErrors[i].Name, tmpErrors[i].Data);
			}
			tmpHtml += '</table>';
		}

		// === COMPLETED — successful tables ===
		if (tmpCompleted.length > 0)
		{
			tmpHtml += '<div class="sync-section-header sync-section-header-ok">Completed <span class="sync-section-count">' + tmpCompleted.length + '</span></div>';
			tmpHtml += '<table class="progress-table">';
			tmpHtml += '<tr><th>Table</th><th>Status</th><th>Progress</th><th>Synced</th><th>Details</th></tr>';
			for (let i = 0; i < tmpCompleted.length; i++)
			{
				tmpHtml += fRenderRow(tmpCompleted[i].Name, tmpCompleted[i].Data);
			}
			tmpHtml += '</table>';
		}

		tmpContainer.innerHTML = tmpHtml;
	}
}

module.exports = DataClonerSyncView;

module.exports.default_configuration =
{
	ViewIdentifier: 'DataCloner-Sync',
	DefaultRenderable: 'DataCloner-Sync',
	DefaultDestinationAddress: '#DataCloner-Section-Sync',
	CSS: /*css*/`
.progress-table { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 4px; }
.progress-table th, .progress-table td { text-align: left; padding: 6px 12px; border-bottom: 1px solid #eee; font-size: 0.9em; }
.progress-table th { background: #f8f9fa; font-weight: 600; }
.progress-table-muted td { color: #888; padding: 3px 12px; font-size: 0.85em; border-bottom: 1px solid #f4f5f6; }
.progress-bar-container { width: 120px; height: 16px; background: #e9ecef; border-radius: 8px; overflow: hidden; display: inline-block; vertical-align: middle; }
.progress-bar-fill { height: 100%; background: #28a745; transition: width 0.3s; }
.sync-section-header { font-size: 0.8em; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #4a90d9; padding: 10px 0 2px 0; margin-top: 6px; border-top: 1px solid #e0e0e0; }
.sync-section-header:first-child { border-top: none; margin-top: 10px; }
.sync-section-header-error { color: #dc3545; }
.sync-section-header-ok { color: #28a745; }
.sync-section-count { font-weight: 400; color: #999; font-size: 0.95em; }
.sync-section-overflow { font-size: 0.8em; color: #aaa; padding: 2px 12px 6px; }
.sync-pending-count { text-align: right; color: #aaa; font-size: 0.85em; }
.report-card { background: #f8f9fa; border-radius: 8px; padding: 12px 16px; min-width: 140px; text-align: center; border: 1px solid #e9ecef; }
.report-card .card-label { font-size: 0.8em; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.report-card .card-value { font-size: 1.4em; font-weight: 700; }
.report-card.outcome-success { border-left: 4px solid #28a745; }
.report-card.outcome-partial { border-left: 4px solid #ffc107; }
.report-card.outcome-error { border-left: 4px solid #dc3545; }
.report-card.outcome-stopped { border-left: 4px solid #6c757d; }
`,
	Templates:
	[
		{
			Hash: 'DataCloner-Sync',
			Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">5</div>
	<div class="accordion-card" id="section5" data-section="5">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section5')">
			<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto5"> <span class="auto-label">auto</span></label>
			<div class="accordion-title">Synchronize Data</div>
			<span class="accordion-phase" id="phase5"></span>
			<div class="accordion-preview" id="preview5">Initial sync, page size 100</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['DataCloner-Sync'].startSync()">go</span>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:4px">
				<div style="flex:0 0 150px">
					<label for="pageSize">Page Size</label>
					<input type="number" id="pageSize" value="100" min="1" max="10000" style="margin-bottom:0">
				</div>
				<div style="flex:0 0 220px">
					<label for="dateTimePrecisionMS">Timestamp Precision (ms)</label>
					<input type="number" id="dateTimePrecisionMS" value="1000" min="0" max="60000" style="margin-bottom:0">
				</div>
				<div style="flex:0 0 auto; display:flex; gap:8px">
					<button class="success" style="margin:0" onclick="pict.views['DataCloner-Sync'].startSync()">Start Sync</button>
					<button class="danger" style="margin:0" onclick="pict.views['DataCloner-Sync'].stopSync()">Stop Sync</button>
				</div>
			</div>
			<div style="font-size:0.8em; color:#888; margin-bottom:10px; padding-left:158px">Cross-DB tolerance for date comparison (default: 1000ms)</div>

			<div style="margin-bottom:10px">
				<label style="margin-bottom:6px">Sync Mode</label>
				<div style="display:flex; gap:16px; align-items:center">
					<label style="font-weight:normal; margin:0; cursor:pointer">
						<input type="radio" name="syncMode" id="syncModeInitial" value="Initial" checked> Initial
						<span style="color:#888; font-size:0.85em">(full clone — download all records)</span>
					</label>
					<label style="font-weight:normal; margin:0; cursor:pointer">
						<input type="radio" name="syncMode" id="syncModeOngoing" value="Ongoing"> Ongoing
						<span style="color:#888; font-size:0.85em">(delta — only new/updated records since last sync)</span>
					</label>
				</div>
			</div>

			<div class="checkbox-row">
				<input type="checkbox" id="syncDeletedRecords">
				<label for="syncDeletedRecords">Sync deleted records (fetch records marked Deleted=1 on source and mirror locally)</label>
			</div>

			<div class="checkbox-row">
				<input type="checkbox" id="syncAdvancedIDPagination">
				<label for="syncAdvancedIDPagination">Use advanced ID pagination (faster for large tables; uses keyset pagination instead of OFFSET)</label>
			</div>

			<div class="inline-group" style="margin-top:8px; margin-bottom:4px">
				<div style="flex:0 0 200px">
					<label for="syncMaxRecords">Max Records per Entity</label>
					<input type="number" id="syncMaxRecords" value="" min="0" placeholder="0 = unlimited" style="margin-bottom:0">
				</div>
				<div style="flex:0 0 auto; display:flex; align-items:flex-end; padding-bottom:2px">
					<div class="checkbox-row" style="margin-bottom:0">
						<input type="checkbox" id="syncLogFile" checked>
						<label for="syncLogFile">Write log file</label>
					</div>
				</div>
			</div>

			<div id="syncStatus"></div>
			<div id="syncProgress"></div>

			<!-- Sync Report (appears after sync completes) -->
			<div id="syncReportSection" style="display:none; margin-top:16px; padding-top:16px; border-top:2px solid #ddd">
				<h3 style="margin:0 0 12px; font-size:1.1em">Sync Report</h3>

				<!-- Summary cards -->
				<div id="reportSummaryCards" style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px"></div>

				<!-- Anomalies -->
				<div id="reportAnomalies" style="margin-bottom:16px"></div>

				<!-- Top tables by duration -->
				<div id="reportTopTables" style="margin-bottom:16px"></div>

				<!-- Buttons -->
				<div style="display:flex; gap:8px">
					<button class="secondary" onclick="pict.views['DataCloner-Sync'].downloadReport()">Download Report JSON</button>
					<button class="secondary" onclick="pict.views['DataCloner-Sync'].copyReport()">Copy Report</button>
				</div>
				<div id="reportStatus"></div>
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
			RenderableHash: 'DataCloner-Sync',
			TemplateHash: 'DataCloner-Sync',
			DestinationAddress: '#DataCloner-Section-Sync'
		}
	]
};
