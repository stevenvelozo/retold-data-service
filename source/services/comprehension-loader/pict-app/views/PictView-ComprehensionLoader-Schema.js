const libPictView = require('pict-view');

class ComprehensionLoaderSchemaView extends libPictView
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

		this.pict.providers.ComprehensionLoader.setSectionPhase(2, 'busy');
		this.pict.providers.ComprehensionLoader.setStatus('schemaStatus', 'Fetching schema...', 'info');

		this.pict.providers.ComprehensionLoader.api('POST', '/comprehension_load/schema/fetch', tmpBody)
			.then(
				(pData) =>
				{
					if (pData.Success)
					{
						this.pict.AppData.ComprehensionLoader.FetchedEntities = pData.Entities || [];
						this.pict.providers.ComprehensionLoader.setStatus('schemaStatus', 'Fetched schema with ' + pData.EntityCount + ' entities from ' + pData.SchemaURL, 'ok');
						this.pict.providers.ComprehensionLoader.setSectionPhase(2, 'ok');
						this.renderEntityList();
						this.pict.providers.ComprehensionLoader.updateAllPreviews();
					}
					else
					{
						this.pict.providers.ComprehensionLoader.setStatus('schemaStatus', 'Fetch failed: ' + (pData.Error || 'Unknown error'), 'error');
						this.pict.providers.ComprehensionLoader.setSectionPhase(2, 'error');
					}
				})
			.catch(
				(pError) =>
				{
					this.pict.providers.ComprehensionLoader.setStatus('schemaStatus', 'Request failed: ' + pError.message, 'error');
					this.pict.providers.ComprehensionLoader.setSectionPhase(2, 'error');
				});
	}

	renderEntityList()
	{
		let tmpEntities = this.pict.AppData.ComprehensionLoader.FetchedEntities || [];
		let tmpContainer = document.getElementById('entityList');
		if (!tmpContainer) return;

		if (tmpEntities.length === 0)
		{
			tmpContainer.innerHTML = '<div style="color:#888; font-size:0.9em">No entities found.</div>';
			return;
		}

		let tmpHtml = '<div style="font-size:0.9em; color:#555">';
		for (let i = 0; i < tmpEntities.length; i++)
		{
			tmpHtml += '<span style="display:inline-block; background:#f0f0f0; border-radius:4px; padding:2px 8px; margin:2px 4px 2px 0; font-size:0.9em">';
			tmpHtml += this.pict.providers.ComprehensionLoader.escapeHtml(tmpEntities[i]);
			tmpHtml += '</span>';
		}
		tmpHtml += '</div>';
		tmpContainer.innerHTML = tmpHtml;
	}
}

module.exports = ComprehensionLoaderSchemaView;

module.exports.default_configuration =
{
	ViewIdentifier: 'ComprehensionLoader-Schema',
	DefaultRenderable: 'ComprehensionLoader-Schema',
	DefaultDestinationAddress: '#ComprehensionLoader-Section-Schema',
	Templates:
	[
		{
			Hash: 'ComprehensionLoader-Schema',
			Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">2</div>
	<div class="accordion-card" id="section2" data-section="2">
		<div class="accordion-header" onclick="pict.views['ComprehensionLoader-Layout'].toggleSection('section2')">
			<div class="accordion-title">Remote Schema</div>
			<span class="accordion-phase" id="phase2"></span>
			<div class="accordion-preview" id="preview2">Fetch entity schema from the remote server</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['ComprehensionLoader-Schema'].fetchSchema()">go</span>
				<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto2"> <span class="auto-label">auto</span></label>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<label for="schemaURL">Schema URL (leave blank for default: ServerURL + Retold/Models)</label>
			<input type="text" id="schemaURL" placeholder="http://remote-server:8086/1.0/Retold/Models">

			<button class="primary" onclick="pict.views['ComprehensionLoader-Schema'].fetchSchema()">Fetch Schema</button>
			<div id="schemaStatus"></div>

			<div id="entityList" style="margin-top:12px"></div>
		</div>
	</div>
</div>
`
		}
	],
	Renderables:
	[
		{
			RenderableHash: 'ComprehensionLoader-Schema',
			TemplateHash: 'ComprehensionLoader-Schema',
			DestinationAddress: '#ComprehensionLoader-Section-Schema'
		}
	]
};
