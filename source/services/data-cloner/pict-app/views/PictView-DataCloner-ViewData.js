const libPictView = require('pict-view');

class DataClonerViewDataView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	populateViewTableDropdown()
	{
		let tmpSelect = document.getElementById('viewTable');
		if (!tmpSelect) return;
		let tmpCurrentValue = tmpSelect.value;

		tmpSelect.innerHTML = '';

		let tmpDeployedTables = this.pict.AppData.DataCloner.DeployedTables;

		if (!tmpDeployedTables || tmpDeployedTables.length === 0)
		{
			let tmpOpt = document.createElement('option');
			tmpOpt.value = '';
			tmpOpt.textContent = '\u2014 deploy tables first \u2014';
			tmpSelect.appendChild(tmpOpt);
			return;
		}

		for (let i = 0; i < tmpDeployedTables.length; i++)
		{
			let tmpOpt = document.createElement('option');
			tmpOpt.value = tmpDeployedTables[i];
			tmpOpt.textContent = tmpDeployedTables[i];
			tmpSelect.appendChild(tmpOpt);
		}

		// Restore previous selection if it exists
		if (tmpCurrentValue)
		{
			tmpSelect.value = tmpCurrentValue;
		}
	}

	loadTableData()
	{
		let tmpTable = document.getElementById('viewTable').value;
		let tmpLimit = parseInt(document.getElementById('viewLimit').value, 10) || 100;

		if (!tmpTable)
		{
			this.pict.providers.DataCloner.setStatus('viewStatus', 'Select a table first.', 'error');
			return;
		}

		this.pict.providers.DataCloner.setStatus('viewStatus', 'Loading ' + tmpTable + '...', 'info');
		document.getElementById('viewDataContainer').innerHTML = '';

		let tmpSelf = this;
		// Use the standard Meadow CRUD list endpoint: /1.0/{Entity}s/0/{Cap}
		this.pict.providers.DataCloner.api('GET', '/1.0/' + tmpTable + 's/0/' + tmpLimit)
			.then(function(pData)
			{
				if (!Array.isArray(pData))
				{
					tmpSelf.pict.providers.DataCloner.setStatus('viewStatus', 'Unexpected response (not an array). The table may not be deployed yet.', 'error');
					return;
				}

				tmpSelf.pict.providers.DataCloner.setStatus('viewStatus', pData.length + ' row(s) returned' + (pData.length >= tmpLimit ? ' (limit reached \u2014 increase Max Rows to see more)' : '') + '.', 'ok');
				tmpSelf.renderDataTable(pData);
			})
			.catch(function(pError)
			{
				tmpSelf.pict.providers.DataCloner.setStatus('viewStatus', 'Request failed: ' + pError.message, 'error');
			});
	}

	renderDataTable(pRows)
	{
		let tmpContainer = document.getElementById('viewDataContainer');

		if (!pRows || pRows.length === 0)
		{
			tmpContainer.innerHTML = '<p style="color:#666; font-size:0.9em; padding:8px">No rows.</p>';
			return;
		}

		// Collect all column names from the first row
		let tmpColumns = Object.keys(pRows[0]);

		let tmpHtml = '<table class="data-table">';
		tmpHtml += '<thead><tr>';
		for (let c = 0; c < tmpColumns.length; c++)
		{
			tmpHtml += '<th>' + this.pict.providers.DataCloner.escapeHtml(tmpColumns[c]) + '</th>';
		}
		tmpHtml += '</tr></thead>';

		tmpHtml += '<tbody>';
		for (let r = 0; r < pRows.length; r++)
		{
			tmpHtml += '<tr>';
			for (let c = 0; c < tmpColumns.length; c++)
			{
				let tmpVal = pRows[r][tmpColumns[c]];
				let tmpDisplay = (tmpVal === null || tmpVal === undefined) ? '' : String(tmpVal);
				tmpHtml += '<td title="' + this.pict.providers.DataCloner.escapeHtml(tmpDisplay) + '">' + this.pict.providers.DataCloner.escapeHtml(tmpDisplay) + '</td>';
			}
			tmpHtml += '</tr>';
		}
		tmpHtml += '</tbody></table>';

		tmpContainer.innerHTML = tmpHtml;
	}
}

module.exports = DataClonerViewDataView;

module.exports.default_configuration =
{
	ViewIdentifier: 'DataCloner-ViewData',
	DefaultRenderable: 'DataCloner-ViewData',
	DefaultDestinationAddress: '#DataCloner-Section-ViewData',
	CSS: /*css*/`
.data-table { width: 100%; border-collapse: collapse; font-size: 0.8em; font-family: monospace; }
.data-table th { background: #f8f9fa; font-weight: 600; text-align: left; padding: 4px 8px; border: 1px solid #ddd; white-space: nowrap; position: sticky; top: 0; }
.data-table td { padding: 4px 8px; border: 1px solid #eee; white-space: nowrap; max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
.data-table tr:nth-child(even) { background: #fafafa; }
.data-table tr:hover { background: #f0f7ff; }
`,
	Templates:
	[
		{
			Hash: 'DataCloner-ViewData',
			Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">7</div>
	<div class="accordion-card" id="section7" data-section="7">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section7')">
			<div class="accordion-title">View Data</div>
			<div class="accordion-preview" id="preview7">Browse synced table data</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<div class="inline-group">
				<div style="flex:1">
					<label for="viewTable">Table</label>
					<select id="viewTable">
						<option value="">\u2014 deploy tables first \u2014</option>
					</select>
				</div>
				<div style="flex:0 0 120px">
					<label for="viewLimit">Max Rows</label>
					<input type="number" id="viewLimit" value="100" min="1" max="10000">
				</div>
				<div style="flex:0 0 auto; display:flex; align-items:flex-end">
					<button class="primary" onclick="pict.views['DataCloner-ViewData'].loadTableData()">Load</button>
				</div>
			</div>
			<div id="viewStatus"></div>
			<div id="viewDataContainer" style="overflow-x:auto; margin-top:10px"></div>
		</div>
	</div>
</div>
`
		}
	],
	Renderables:
	[
		{
			RenderableHash: 'DataCloner-ViewData',
			TemplateHash: 'DataCloner-ViewData',
			DestinationAddress: '#DataCloner-Section-ViewData'
		}
	]
};
