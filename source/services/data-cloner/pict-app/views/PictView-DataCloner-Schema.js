const libPictView = require('pict-view');

class DataClonerSchemaView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	fetchSchema()
	{
		let tmpSchemaURL = document.getElementById('schemaURL').value.trim();
		let tmpBody = {};
		if (tmpSchemaURL)
		{
			tmpBody.SchemaURL = tmpSchemaURL;
		}

		this.pict.providers.DataCloner.setSectionPhase(3, 'busy');
		this.pict.providers.DataCloner.setStatus('schemaStatus', 'Fetching schema...', 'info');

		this.pict.providers.DataCloner.api('POST', '/clone/schema/fetch', tmpBody)
			.then(
				(pData) =>
				{
					if (pData.Success)
					{
						this.pict.AppData.DataCloner.FetchedTables = pData.Tables || [];
						this.pict.providers.DataCloner.setStatus('schemaStatus', 'Fetched ' + pData.TableCount + ' tables from ' + pData.SchemaURL, 'ok');
						this.pict.providers.DataCloner.setSectionPhase(3, 'ok');
						this.renderTableList();
					}
					else
					{
						this.pict.providers.DataCloner.setStatus('schemaStatus', 'Fetch failed: ' + (pData.Error || 'Unknown error'), 'error');
						this.pict.providers.DataCloner.setSectionPhase(3, 'error');
					}
				})
			.catch(
				(pError) =>
				{
					this.pict.providers.DataCloner.setStatus('schemaStatus', 'Request failed: ' + pError.message, 'error');
					this.pict.providers.DataCloner.setSectionPhase(3, 'error');
				});
	}

	loadSavedSelections()
	{
		try
		{
			let tmpRaw = localStorage.getItem('dataCloner_selectedTables');
			if (tmpRaw)
			{
				return JSON.parse(tmpRaw);
			}
		}
		catch (pError)
		{
			/* ignore */
		}
		return null;
	}

	saveSelections()
	{
		let tmpSelected = this.getSelectedTables();
		localStorage.setItem('dataCloner_selectedTables', JSON.stringify(tmpSelected));
		this.updateSelectionCount();
		this.pict.providers.DataCloner.updateAllPreviews();
	}

	updateSelectionCount()
	{
		let tmpFetchedTables = this.pict.AppData.DataCloner.FetchedTables || [];
		let tmpCount = this.getSelectedTables().length;
		let tmpEl = document.getElementById('tableSelectionCount');
		if (tmpEl)
		{
			tmpEl.textContent = tmpCount + ' / ' + tmpFetchedTables.length + ' selected';
		}
	}

	renderTableList()
	{
		let tmpFetchedTables = this.pict.AppData.DataCloner.FetchedTables || [];
		let tmpContainer = document.getElementById('tableList');
		tmpContainer.innerHTML = '';

		// Load previously saved selections; if none, default to none checked
		let tmpSaved = this.loadSavedSelections();
		let tmpSavedSet = null;
		if (tmpSaved)
		{
			tmpSavedSet = {};
			for (let i = 0; i < tmpSaved.length; i++)
			{
				tmpSavedSet[tmpSaved[i]] = true;
			}
		}

		for (let i = 0; i < tmpFetchedTables.length; i++)
		{
			let tmpName = tmpFetchedTables[i];
			let tmpDiv = document.createElement('div');
			tmpDiv.className = 'table-item';
			tmpDiv.setAttribute('data-table', tmpName.toLowerCase());

			let tmpCheckbox = document.createElement('input');
			tmpCheckbox.type = 'checkbox';
			tmpCheckbox.id = 'tbl_' + tmpName;
			tmpCheckbox.value = tmpName;
			// If we have saved selections, restore them; otherwise default unchecked
			tmpCheckbox.checked = tmpSavedSet ? (tmpSavedSet[tmpName] === true) : false;
			tmpCheckbox.addEventListener('change', () => { this.saveSelections(); });

			let tmpLabel = document.createElement('label');
			tmpLabel.htmlFor = 'tbl_' + tmpName;
			tmpLabel.textContent = tmpName;

			tmpDiv.appendChild(tmpCheckbox);
			tmpDiv.appendChild(tmpLabel);
			tmpContainer.appendChild(tmpDiv);
		}

		document.getElementById('tableSelection').style.display = tmpFetchedTables.length > 0 ? 'block' : 'none';
		document.getElementById('tableFilter').value = '';
		this.updateSelectionCount();
	}

	filterTableList()
	{
		let tmpFilter = document.getElementById('tableFilter').value.toLowerCase().trim();
		let tmpItems = document.getElementById('tableList').children;
		for (let i = 0; i < tmpItems.length; i++)
		{
			let tmpName = tmpItems[i].getAttribute('data-table') || '';
			tmpItems[i].style.display = (!tmpFilter || tmpName.indexOf(tmpFilter) >= 0) ? '' : 'none';
		}
	}

	selectAllTables(pChecked)
	{
		let tmpFetchedTables = this.pict.AppData.DataCloner.FetchedTables || [];
		// Only affect visible (non-filtered) items
		let tmpFilter = document.getElementById('tableFilter').value.toLowerCase().trim();
		for (let i = 0; i < tmpFetchedTables.length; i++)
		{
			let tmpName = tmpFetchedTables[i];
			if (tmpFilter && tmpName.toLowerCase().indexOf(tmpFilter) < 0)
			{
				continue;
			}
			let tmpCheckbox = document.getElementById('tbl_' + tmpName);
			if (tmpCheckbox)
			{
				tmpCheckbox.checked = pChecked;
			}
		}
		this.saveSelections();
	}

	getSelectedTables()
	{
		let tmpFetchedTables = this.pict.AppData.DataCloner.FetchedTables || [];
		let tmpSelected = [];
		for (let i = 0; i < tmpFetchedTables.length; i++)
		{
			let tmpCheckbox = document.getElementById('tbl_' + tmpFetchedTables[i]);
			if (tmpCheckbox && tmpCheckbox.checked)
			{
				tmpSelected.push(tmpFetchedTables[i]);
			}
		}
		return tmpSelected;
	}
}

module.exports = DataClonerSchemaView;

module.exports.default_configuration =
{
	ViewIdentifier: 'DataCloner-Schema',
	DefaultRenderable: 'DataCloner-Schema',
	DefaultDestinationAddress: '#DataCloner-Section-Schema',
	CSS: /*css*/`
.table-list { max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin: 10px 0; }
.table-item { padding: 4px 8px; display: flex; align-items: center; }
.table-item:hover { background: #f0f0f0; }
.table-item input[type="checkbox"] { margin-right: 8px; width: auto; }
.table-item label { display: inline; font-weight: normal; margin-bottom: 0; cursor: pointer; }
`,
	Templates:
	[
		{
			Hash: 'DataCloner-Schema',
			Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">3</div>
	<div class="accordion-card" id="section3" data-section="3">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section3')">
			<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto3"> <span class="auto-label">auto</span></label>
			<div class="accordion-title">Remote Schema</div>
			<span class="accordion-phase" id="phase3"></span>
			<div class="accordion-preview" id="preview3">Fetch and select tables from the remote server</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['DataCloner-Schema'].fetchSchema()">go</span>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<label for="schemaURL">Schema URL (leave blank for default: /1.0/Retold/Models)</label>
			<input type="text" id="schemaURL" placeholder="http://remote-server:8086/1.0/Retold/Models">

			<button class="primary" onclick="pict.views['DataCloner-Schema'].fetchSchema()">Fetch Schema</button>
			<div id="schemaStatus"></div>

			<div id="tableSelection" style="display:none">
				<h3 style="margin:12px 0 8px; font-size:1em;">Select Tables</h3>
				<div style="display:flex; gap:8px; align-items:center; margin-bottom:8px">
					<input type="text" id="tableFilter" placeholder="Filter tables..." style="flex:1; margin-bottom:0" oninput="pict.views['DataCloner-Schema'].filterTableList()">
					<button class="secondary" onclick="pict.views['DataCloner-Schema'].selectAllTables(true)" style="font-size:0.8em">Select All</button>
					<button class="secondary" onclick="pict.views['DataCloner-Schema'].selectAllTables(false)" style="font-size:0.8em">Deselect All</button>
					<span id="tableSelectionCount" style="font-size:0.85em; color:#666; white-space:nowrap"></span>
				</div>
				<div id="tableList" class="table-list"></div>
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
			RenderableHash: 'DataCloner-Schema',
			TemplateHash: 'DataCloner-Schema',
			DestinationAddress: '#DataCloner-Section-Schema'
		}
	]
};
