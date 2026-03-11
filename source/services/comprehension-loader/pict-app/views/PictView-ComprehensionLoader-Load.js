const libPictView = require('pict-view');

class ComprehensionLoaderLoadView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	startLoad()
	{
		this.pict.providers.ComprehensionLoader.setSectionPhase(4, 'busy');
		this.pict.providers.ComprehensionLoader.setStatus('loadStatus', 'Starting load...', 'info');

		// Clear previous report
		this.pict.AppData.ComprehensionLoader.LastReport = null;

		let tmpSelf = this;
		this.pict.providers.ComprehensionLoader.api('POST', '/comprehension_load/load/start')
			.then(function(pData)
			{
				if (pData.Success)
				{
					let tmpMsg = 'Load started for ' + pData.Entities.length + ' entities (' + tmpSelf.pict.providers.ComprehensionLoader.formatNumber(pData.TotalRecords) + ' records).';
					tmpSelf.pict.providers.ComprehensionLoader.setStatus('loadStatus', tmpMsg, 'ok');
					tmpSelf.startPolling();
				}
				else
				{
					tmpSelf.pict.providers.ComprehensionLoader.setStatus('loadStatus', 'Load start failed: ' + (pData.Error || 'Unknown error'), 'error');
					tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(4, 'error');
				}
			})
			.catch(function(pError)
			{
				tmpSelf.pict.providers.ComprehensionLoader.setStatus('loadStatus', 'Request failed: ' + pError.message, 'error');
				tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(4, 'error');
			});
	}

	stopLoad()
	{
		let tmpSelf = this;
		this.pict.providers.ComprehensionLoader.api('POST', '/comprehension_load/load/stop')
			.then(function(pData)
			{
				tmpSelf.pict.providers.ComprehensionLoader.setStatus('loadStatus', 'Load stop requested.', 'warn');
			})
			.catch(function(pError)
			{
				tmpSelf.pict.providers.ComprehensionLoader.setStatus('loadStatus', 'Request failed: ' + pError.message, 'error');
			});
	}

	startPolling()
	{
		if (this.pict.AppData.ComprehensionLoader.LoadPollTimer) clearInterval(this.pict.AppData.ComprehensionLoader.LoadPollTimer);
		let tmpSelf = this;
		this.pict.AppData.ComprehensionLoader.LoadPollTimer = setInterval(function() { tmpSelf.pollLoadStatus(); }, 2000);
		this.pollLoadStatus();
	}

	stopPolling()
	{
		if (this.pict.AppData.ComprehensionLoader.LoadPollTimer)
		{
			clearInterval(this.pict.AppData.ComprehensionLoader.LoadPollTimer);
			this.pict.AppData.ComprehensionLoader.LoadPollTimer = null;
		}
	}

	pollLoadStatus()
	{
		let tmpSelf = this;
		this.pict.providers.ComprehensionLoader.api('GET', '/comprehension_load/load/status')
			.then(function(pData)
			{
				tmpSelf.renderLoadProgress(pData);

				if (!pData.Running)
				{
					tmpSelf.stopPolling();
					let tmpEntities = pData.Entities || {};
					let tmpNames = Object.keys(tmpEntities);
					if (tmpNames.length > 0)
					{
						let tmpHasErrors = false;
						for (let i = 0; i < tmpNames.length; i++)
						{
							if (tmpEntities[tmpNames[i]].Status === 'Error') tmpHasErrors = true;
						}

						if (tmpHasErrors)
						{
							tmpSelf.pict.providers.ComprehensionLoader.setStatus('loadStatus', 'Load finished with errors.', 'error');
							tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(4, 'error');
						}
						else
						{
							tmpSelf.pict.providers.ComprehensionLoader.setStatus('loadStatus', 'Load complete.', 'ok');
							tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(4, 'ok');
						}

						// Fetch the structured report
						tmpSelf.fetchLoadReport();
					}
				}
			})
			.catch(function(pError)
			{
				// Silently ignore poll errors
			});
	}

	fetchLoadReport()
	{
		let tmpSelf = this;
		this.pict.providers.ComprehensionLoader.api('GET', '/comprehension_load/load/report')
			.then(function(pData)
			{
				if (pData && pData.ReportVersion)
				{
					tmpSelf.pict.AppData.ComprehensionLoader.LastReport = pData;
					tmpSelf.renderLoadReport(pData);
				}
			})
			.catch(function(pError)
			{
				// Ignore report fetch errors
			});
	}

	renderLoadReport(pReport)
	{
		let tmpSection = document.getElementById('loadReportSection');
		if (!tmpSection) return;
		tmpSection.style.display = '';

		let tmpCardsContainer = document.getElementById('reportSummaryCards');
		let tmpOutcomeClass = 'outcome-' + pReport.Outcome.toLowerCase();
		let tmpOutcomeColor = { Success: '#28a745', Partial: '#ffc107', Error: '#dc3545', Stopped: '#6c757d' }[pReport.Outcome] || '#666';

		let tmpDurationSec = pReport.RunTimestamps.DurationSeconds || 0;
		let tmpDurationStr = tmpDurationSec < 60 ? tmpDurationSec + 's' : Math.floor(tmpDurationSec / 60) + 'm ' + (tmpDurationSec % 60) + 's';

		let tmpTotalPushed = this.pict.providers.ComprehensionLoader.formatNumber(pReport.Summary.TotalPushed);
		let tmpTotalRecords = this.pict.providers.ComprehensionLoader.formatNumber(pReport.Summary.TotalRecords);

		tmpCardsContainer.innerHTML = ''
			+ '<div class="report-card ' + tmpOutcomeClass + '">'
			+ '  <div class="card-label">Outcome</div>'
			+ '  <div class="card-value" style="color:' + tmpOutcomeColor + '">' + pReport.Outcome + '</div>'
			+ '</div>'
			+ '<div class="report-card">'
			+ '  <div class="card-label">Duration</div>'
			+ '  <div class="card-value">' + tmpDurationStr + '</div>'
			+ '</div>'
			+ '<div class="report-card">'
			+ '  <div class="card-label">Entities</div>'
			+ '  <div class="card-value">' + pReport.Summary.Complete + ' / ' + pReport.Summary.TotalEntities + '</div>'
			+ '</div>'
			+ '<div class="report-card">'
			+ '  <div class="card-label">Records Pushed</div>'
			+ '  <div class="card-value">' + tmpTotalPushed + '</div>'
			+ '  <div style="font-size:0.75em; color:#888">of ' + tmpTotalRecords + '</div>'
			+ '</div>';

		// Anomalies
		let tmpAnomalyContainer = document.getElementById('reportAnomalies');
		if (pReport.Anomalies.length === 0)
		{
			tmpAnomalyContainer.innerHTML = '<div style="color:#28a745; font-weight:600; font-size:0.9em">No anomalies detected.</div>';
		}
		else
		{
			let tmpHtml = '<h4 style="margin:0 0 8px; color:#dc3545; font-size:0.95em">Anomalies (' + pReport.Anomalies.length + ')</h4>';
			tmpHtml += '<table class="progress-table">';
			tmpHtml += '<tr><th>Entity</th><th>Type</th><th>Message</th></tr>';
			for (let i = 0; i < pReport.Anomalies.length; i++)
			{
				let tmpAnomaly = pReport.Anomalies[i];
				let tmpTypeColor = tmpAnomaly.Type === 'Error' ? '#dc3545' : '#6c757d';
				tmpHtml += '<tr>';
				tmpHtml += '<td><strong>' + this.pict.providers.ComprehensionLoader.escapeHtml(tmpAnomaly.Entity) + '</strong></td>';
				tmpHtml += '<td style="color:' + tmpTypeColor + '">' + tmpAnomaly.Type + '</td>';
				tmpHtml += '<td>' + this.pict.providers.ComprehensionLoader.escapeHtml(tmpAnomaly.Message) + '</td>';
				tmpHtml += '</tr>';
			}
			tmpHtml += '</table>';
			tmpAnomalyContainer.innerHTML = tmpHtml;
		}

		// Entity details
		let tmpEntityContainer = document.getElementById('reportEntityDetails');
		if (pReport.Entities && pReport.Entities.length > 0)
		{
			let tmpHtml = '<h4 style="margin:0 0 8px; font-size:0.95em; color:#444">Entity Details</h4>';
			tmpHtml += '<table class="progress-table">';
			tmpHtml += '<tr><th>Entity</th><th>Duration</th><th>Records</th><th>Status</th></tr>';
			for (let i = 0; i < pReport.Entities.length; i++)
			{
				let tmpEntity = pReport.Entities[i];
				let tmpDur = tmpEntity.DurationSeconds < 60 ? tmpEntity.DurationSeconds + 's' : Math.floor(tmpEntity.DurationSeconds / 60) + 'm ' + (tmpEntity.DurationSeconds % 60) + 's';
				let tmpRecs = this.pict.providers.ComprehensionLoader.formatNumber(tmpEntity.Pushed);
				let tmpStatusColor = { Complete: '#28a745', Error: '#dc3545' }[tmpEntity.Status] || '#666';
				tmpHtml += '<tr>';
				tmpHtml += '<td><strong>' + this.pict.providers.ComprehensionLoader.escapeHtml(tmpEntity.Name) + '</strong></td>';
				tmpHtml += '<td>' + tmpDur + '</td>';
				tmpHtml += '<td>' + tmpRecs + '</td>';
				tmpHtml += '<td style="color:' + tmpStatusColor + '">' + tmpEntity.Status + '</td>';
				tmpHtml += '</tr>';
			}
			tmpHtml += '</table>';
			tmpEntityContainer.innerHTML = tmpHtml;
		}
	}

	downloadReport()
	{
		if (!this.pict.AppData.ComprehensionLoader.LastReport)
		{
			this.pict.providers.ComprehensionLoader.setStatus('reportStatus', 'No report available.', 'warn');
			return;
		}
		let tmpJson = JSON.stringify(this.pict.AppData.ComprehensionLoader.LastReport, null, '\t');
		let tmpBlob = new Blob([tmpJson], { type: 'application/json' });
		let tmpAnchor = document.createElement('a');
		tmpAnchor.href = URL.createObjectURL(tmpBlob);
		let tmpTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		tmpAnchor.download = 'ComprehensionLoader-Report-' + tmpTimestamp + '.json';
		tmpAnchor.click();
		URL.revokeObjectURL(tmpAnchor.href);
		this.pict.providers.ComprehensionLoader.setStatus('reportStatus', 'Report downloaded.', 'ok');
	}

	copyReport()
	{
		if (!this.pict.AppData.ComprehensionLoader.LastReport)
		{
			this.pict.providers.ComprehensionLoader.setStatus('reportStatus', 'No report available.', 'warn');
			return;
		}
		let tmpJson = JSON.stringify(this.pict.AppData.ComprehensionLoader.LastReport, null, '\t');
		let tmpSelf = this;
		navigator.clipboard.writeText(tmpJson).then(function()
		{
			tmpSelf.pict.providers.ComprehensionLoader.setStatus('reportStatus', 'Report copied to clipboard.', 'ok');
		});
	}

	renderLoadProgress(pData)
	{
		let tmpContainer = document.getElementById('loadProgress');
		let tmpEntities = pData.Entities || {};
		let tmpEntityNames = Object.keys(tmpEntities);

		if (tmpEntityNames.length === 0)
		{
			tmpContainer.innerHTML = '';
			return;
		}

		let tmpPushing = [];
		let tmpPending = [];
		let tmpCompleted = [];
		let tmpErrors = [];

		for (let i = 0; i < tmpEntityNames.length; i++)
		{
			let tmpName = tmpEntityNames[i];
			let tmpEntity = tmpEntities[tmpName];

			if (tmpEntity.Status === 'Pushing')
			{
				tmpPushing.push({ Name: tmpName, Data: tmpEntity });
			}
			else if (tmpEntity.Status === 'Pending')
			{
				tmpPending.push({ Name: tmpName, Data: tmpEntity });
			}
			else if (tmpEntity.Status === 'Complete')
			{
				tmpCompleted.push({ Name: tmpName, Data: tmpEntity });
			}
			else
			{
				tmpErrors.push({ Name: tmpName, Data: tmpEntity });
			}
		}

		let tmpHtml = '';
		let tmpSelf = this;

		let fRenderRow = function(pName, pEntity)
		{
			let tmpPct = 0;
			if (pEntity.Total === 0 && pEntity.Status === 'Complete')
			{
				tmpPct = 100;
			}
			else if (pEntity.Total > 0)
			{
				tmpPct = Math.round((pEntity.Pushed / pEntity.Total) * 100);
			}

			let tmpBarColor = '#28a745';
			if (pEntity.Status === 'Error') tmpBarColor = '#dc3545';
			else if (pEntity.Status === 'Pushing') tmpBarColor = '#4a90d9';
			else if (pEntity.Status === 'Pending') tmpBarColor = '#adb5bd';

			let tmpRow = '<tr>';
			tmpRow += '<td><strong>' + pName + '</strong></td>';
			tmpRow += '<td>' + pEntity.Status + '</td>';
			tmpRow += '<td>';
			tmpRow += '<div class="progress-bar-container"><div class="progress-bar-fill" style="width:' + tmpPct + '%; background:' + tmpBarColor + '"></div></div>';
			tmpRow += ' ' + tmpPct + '%';
			tmpRow += '</td>';
			tmpRow += '<td>' + (pEntity.Pushed || 0) + ' / ' + (pEntity.Total || 0) + '</td>';
			tmpRow += '</tr>';
			return tmpRow;
		};

		if (tmpPushing.length > 0)
		{
			tmpHtml += '<div class="sync-section-header">Pushing</div>';
			tmpHtml += '<table class="progress-table">';
			tmpHtml += '<tr><th>Entity</th><th>Status</th><th>Progress</th><th>Pushed</th></tr>';
			for (let i = 0; i < tmpPushing.length; i++)
			{
				tmpHtml += fRenderRow(tmpPushing[i].Name, tmpPushing[i].Data);
			}
			tmpHtml += '</table>';
		}

		if (tmpPending.length > 0)
		{
			tmpHtml += '<div class="sync-section-header">Next Up <span class="sync-section-count">' + tmpPending.length + '</span></div>';
			let tmpShowCount = Math.min(8, tmpPending.length);
			tmpHtml += '<table class="progress-table progress-table-muted">';
			for (let i = 0; i < tmpShowCount; i++)
			{
				tmpHtml += '<tr><td>' + tmpPending[i].Name + '</td>';
				if (tmpPending[i].Data.Total > 0)
				{
					tmpHtml += '<td class="sync-pending-count">' + tmpSelf.pict.providers.ComprehensionLoader.formatNumber(tmpPending[i].Data.Total) + ' records</td>';
				}
				else
				{
					tmpHtml += '<td class="sync-pending-count">\u2014</td>';
				}
				tmpHtml += '</tr>';
			}
			tmpHtml += '</table>';
			if (tmpPending.length > tmpShowCount)
			{
				tmpHtml += '<div class="sync-section-overflow">+ ' + (tmpPending.length - tmpShowCount) + ' more</div>';
			}
		}

		if (tmpErrors.length > 0)
		{
			tmpHtml += '<div class="sync-section-header sync-section-header-error">Errors <span class="sync-section-count">' + tmpErrors.length + '</span></div>';
			tmpHtml += '<table class="progress-table">';
			tmpHtml += '<tr><th>Entity</th><th>Status</th><th>Progress</th><th>Pushed</th></tr>';
			for (let i = 0; i < tmpErrors.length; i++)
			{
				tmpHtml += fRenderRow(tmpErrors[i].Name, tmpErrors[i].Data);
			}
			tmpHtml += '</table>';
		}

		if (tmpCompleted.length > 0)
		{
			tmpHtml += '<div class="sync-section-header sync-section-header-ok">Completed <span class="sync-section-count">' + tmpCompleted.length + '</span></div>';
			tmpHtml += '<table class="progress-table">';
			tmpHtml += '<tr><th>Entity</th><th>Status</th><th>Progress</th><th>Pushed</th></tr>';
			for (let i = 0; i < tmpCompleted.length; i++)
			{
				tmpHtml += fRenderRow(tmpCompleted[i].Name, tmpCompleted[i].Data);
			}
			tmpHtml += '</table>';
		}

		tmpContainer.innerHTML = tmpHtml;
	}
}

module.exports = ComprehensionLoaderLoadView;

module.exports.default_configuration =
{
	ViewIdentifier: 'ComprehensionLoader-Load',
	DefaultRenderable: 'ComprehensionLoader-Load',
	DefaultDestinationAddress: '#ComprehensionLoader-Section-Load',
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
			Hash: 'ComprehensionLoader-Load',
			Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">4</div>
	<div class="accordion-card" id="section4" data-section="4">
		<div class="accordion-header" onclick="pict.views['ComprehensionLoader-Layout'].toggleSection('section4')">
			<div class="accordion-title">Load</div>
			<span class="accordion-phase" id="phase4"></span>
			<div class="accordion-preview" id="preview4">Push comprehension data to the remote server</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['ComprehensionLoader-Load'].startLoad()">go</span>
				<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto4"> <span class="auto-label">auto</span></label>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<div style="display:flex; gap:8px; margin-bottom:10px">
				<button class="success" style="margin:0" onclick="pict.views['ComprehensionLoader-Load'].startLoad()">Start Load</button>
				<button class="danger" style="margin:0" onclick="pict.views['ComprehensionLoader-Load'].stopLoad()">Stop Load</button>
			</div>

			<div id="loadStatus"></div>
			<div id="loadProgress"></div>

			<!-- Load Report (appears after load completes) -->
			<div id="loadReportSection" style="display:none; margin-top:16px; padding-top:16px; border-top:2px solid #ddd">
				<h3 style="margin:0 0 12px; font-size:1.1em">Load Report</h3>

				<div id="reportSummaryCards" style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px"></div>
				<div id="reportAnomalies" style="margin-bottom:16px"></div>
				<div id="reportEntityDetails" style="margin-bottom:16px"></div>

				<div style="display:flex; gap:8px">
					<button class="secondary" onclick="pict.views['ComprehensionLoader-Load'].downloadReport()">Download Report JSON</button>
					<button class="secondary" onclick="pict.views['ComprehensionLoader-Load'].copyReport()">Copy Report</button>
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
			RenderableHash: 'ComprehensionLoader-Load',
			TemplateHash: 'ComprehensionLoader-Load',
			DestinationAddress: '#ComprehensionLoader-Section-Load'
		}
	]
};
