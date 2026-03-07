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
					tmpSelf.pict.providers.DataCloner.setStatus('deployStatus', pData.Message, 'ok');
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
			<button class="danger" onclick="pict.views['DataCloner-Deploy'].resetDatabase()">Reset Database</button>
			<div id="deployStatus"></div>
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
