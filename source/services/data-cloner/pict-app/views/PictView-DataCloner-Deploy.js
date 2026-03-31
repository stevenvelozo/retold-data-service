const libPictView = require('pict-view');

class DataClonerDeployView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	deploySchema()
	{
		let tmpSelectedTables = this.pict.views['DataCloner-Schema'].getSelectedTables();

		if (tmpSelectedTables.length === 0)
		{
			this.pict.providers.DataCloner.setStatus('deployStatus', 'No tables selected. Fetch a schema and select tables first.', 'error');
			this.pict.providers.DataCloner.setSectionPhase(4, 'error');
			return;
		}

		this.pict.providers.DataCloner.setSectionPhase(4, 'busy');
		this.pict.providers.DataCloner.setStatus('deployStatus', 'Deploying ' + tmpSelectedTables.length + ' tables...', 'info');

		let tmpSelf = this;
		this.pict.providers.DataCloner.api('POST', '/clone/schema/deploy', { Tables: tmpSelectedTables })
			.then(function(pData)
			{
				if (pData.Success)
				{
					let tmpStatusMsg = pData.Message;

					// Append migration details if schema deltas were applied
					if (Array.isArray(pData.MigrationsApplied) && pData.MigrationsApplied.length > 0)
					{
						let tmpDetails = pData.MigrationsApplied.map(function(pM)
						{
							return pM.Table + ': +' + pM.ColumnsAdded.join(', +');
						});
						tmpStatusMsg += '\nMigrations: ' + tmpDetails.join('; ');
					}

					tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', tmpStatusMsg, 'ok');
					tmpSelf.pict.providers.DataCloner.setSectionPhase(4, 'ok');
					tmpSelf.pict.AppData.DataCloner.DeployedTables = pData.TablesDeployed || tmpSelectedTables;
					tmpSelf.pict.providers.DataCloner.saveDeployedTables();
					tmpSelf.pict.views['DataCloner-ViewData'].populateViewTableDropdown();
					tmpSelf.pict.providers.DataCloner.updateAllPreviews();
				}
				else
				{
					tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', 'Deploy failed: ' + (pData.Error || 'Unknown error'), 'error');
					tmpSelf.pict.providers.DataCloner.setSectionPhase(4, 'error');
				}
			})
			.catch(function(pError)
			{
				tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', 'Request failed: ' + pError.message, 'error');
				tmpSelf.pict.providers.DataCloner.setSectionPhase(4, 'error');
			});
	}

	auditGUIDIndices()
	{
		let tmpReportEl = document.getElementById('guidIndexReport');
		if (tmpReportEl) tmpReportEl.innerHTML = '<span style="color:#888">Checking GUID indices...</span>';

		let tmpSelf = this;
		this.pict.providers.DataCloner.api('GET', '/clone/schema/guid-index-audit')
			.then(function(pData)
			{
				if (!tmpReportEl) return;

				if (!pData.Success)
				{
					tmpReportEl.innerHTML = '<span style="color:red">' + (pData.Error || 'Audit failed') + '</span>';
					return;
				}

				if (pData.MissingCount === 0)
				{
					tmpReportEl.innerHTML = '<span style="color:green">All GUID columns have indices.</span>';
					return;
				}

				let tmpHTML = '<div style="margin-top:6px"><strong>' + pData.Message + '</strong></div>';
				tmpHTML += '<table style="font-size:0.85em; margin:6px 0; border-collapse:collapse; width:100%">';
				tmpHTML += '<tr style="text-align:left; border-bottom:1px solid #ccc"><th style="padding:3px 8px">Table</th><th style="padding:3px 8px">GUID Column</th><th style="padding:3px 8px">Index</th></tr>';

				for (let t = 0; t < pData.Tables.length; t++)
				{
					let tmpTable = pData.Tables[t];
					for (let c = 0; c < tmpTable.GUIDColumns.length; c++)
					{
						let tmpCol = tmpTable.GUIDColumns[c];
						let tmpStatus = tmpCol.HasIndex
							? '<span style="color:green">' + tmpCol.IndexName + '</span>'
							: '<span style="color:red">MISSING</span>';
						tmpHTML += '<tr style="border-bottom:1px solid #eee"><td style="padding:3px 8px">' + tmpTable.Table + '</td><td style="padding:3px 8px">' + tmpCol.Column + '</td><td style="padding:3px 8px">' + tmpStatus + '</td></tr>';
					}
				}
				tmpHTML += '</table>';
				tmpHTML += '<button class="primary" style="margin-top:4px" onclick="pict.views[\'DataCloner-Deploy\'].createMissingGUIDIndices()">Create Missing Indices</button>';

				tmpReportEl.innerHTML = tmpHTML;
			})
			.catch(function(pError)
			{
				if (tmpReportEl) tmpReportEl.innerHTML = '<span style="color:red">Request failed: ' + pError.message + '</span>';
			});
	}

	createMissingGUIDIndices()
	{
		let tmpReportEl = document.getElementById('guidIndexReport');
		if (tmpReportEl) tmpReportEl.innerHTML = '<span style="color:#888">Creating GUID indices...</span>';

		let tmpSelf = this;
		this.pict.providers.DataCloner.api('POST', '/clone/schema/guid-index-create')
			.then(function(pData)
			{
				if (!tmpReportEl) return;

				if (!pData.Success)
				{
					tmpReportEl.innerHTML = '<span style="color:red">' + (pData.Error || 'Index creation failed') + '</span>';
					return;
				}

				let tmpHTML = '<div style="margin-top:6px; color:green"><strong>' + pData.Message + '</strong></div>';

				if (pData.IndicesCreated && pData.IndicesCreated.length > 0)
				{
					tmpHTML += '<ul style="font-size:0.85em; margin:4px 0">';
					for (let i = 0; i < pData.IndicesCreated.length; i++)
					{
						let tmpIdx = pData.IndicesCreated[i];
						tmpHTML += '<li>' + tmpIdx.Table + ': ' + tmpIdx.IndexName + '</li>';
					}
					tmpHTML += '</ul>';
				}

				tmpHTML += '<button style="margin-top:4px" onclick="pict.views[\'DataCloner-Deploy\'].auditGUIDIndices()">Re-check</button>';
				tmpReportEl.innerHTML = tmpHTML;
			})
			.catch(function(pError)
			{
				if (tmpReportEl) tmpReportEl.innerHTML = '<span style="color:red">Request failed: ' + pError.message + '</span>';
			});
	}

	resetDatabase()
	{
		if (!confirm('This will delete ALL data in the local SQLite database. Continue?'))
		{
			return;
		}

		this.pict.providers.DataCloner.setStatus('deployStatus', 'Resetting database...', 'info');

		let tmpSelf = this;
		this.pict.providers.DataCloner.api('POST', '/clone/reset')
			.then(function(pData)
			{
				if (pData.Success)
				{
					tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', pData.Message, 'ok');
					// Clear the sync progress display
					let tmpSyncProgress = document.getElementById('syncProgress');
					if (tmpSyncProgress) tmpSyncProgress.innerHTML = '';
				}
				else
				{
					tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', 'Reset failed: ' + (pData.Error || 'Unknown error'), 'error');
				}
			})
			.catch(function(pError)
			{
				tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', 'Request failed: ' + pError.message, 'error');
			});
	}
}

module.exports = DataClonerDeployView;

module.exports.default_configuration =
{
	ViewIdentifier: 'DataCloner-Deploy',
	DefaultRenderable: 'DataCloner-Deploy',
	DefaultDestinationAddress: '#DataCloner-Section-Deploy',
	Templates:
	[
		{
			Hash: 'DataCloner-Deploy',
			Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">4</div>
	<div class="accordion-card" id="section4" data-section="4">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section4')">
			<div class="accordion-title">Deploy Schema</div>
			<span class="accordion-phase" id="phase4"></span>
			<div class="accordion-preview" id="preview4">Create selected tables in the local database</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['DataCloner-Deploy'].deploySchema()">go</span>
				<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto4"> <span class="auto-label">auto</span></label>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<p style="font-size:0.9em; color:#666; margin-bottom:10px">Creates the selected tables in the local database and sets up CRUD endpoints (e.g. GET /1.0/Documents).</p>
			<button class="primary" onclick="pict.views['DataCloner-Deploy'].deploySchema()">Deploy Selected Tables</button>
			<button onclick="pict.views['DataCloner-Deploy'].auditGUIDIndices()">Check GUID Indices</button>
			<button class="danger" onclick="pict.views['DataCloner-Deploy'].resetDatabase()">Reset Database</button>
			<div id="deployStatus"></div>
			<div id="guidIndexReport"></div>
		</div>
	</div>
</div>
`
		}
	],
	Renderables:
	[
		{
			RenderableHash: 'DataCloner-Deploy',
			TemplateHash: 'DataCloner-Deploy',
			DestinationAddress: '#DataCloner-Section-Deploy'
		}
	]
};
