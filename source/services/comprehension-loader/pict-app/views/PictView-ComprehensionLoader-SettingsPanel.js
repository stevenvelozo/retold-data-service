'use strict';

const libPictView = require('pict-view');

class ComprehensionLoaderSettingsPanelView extends libPictView
{
	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		if (this.pict.CSSMap) { this.pict.CSSMap.injectCSS(); }

		// Re-mount theme controls on every render — the template wipes the destination div.
		let tmpTheme = this.pict.providers && this.pict.providers['Theme-Section'];
		if (tmpTheme && typeof tmpTheme.mount === 'function')
		{
			tmpTheme.mount({
				Container: '#ComprehensionLoader-Settings-Theme',
				Views: ['Picker', 'ModeToggle', 'ScaleSelect']
			});
		}
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ComprehensionLoaderSettingsPanelView;

module.exports.default_configuration =
{
	ViewIdentifier:            'ComprehensionLoader-SettingsPanel',
	DefaultRenderable:         'ComprehensionLoader-SettingsPanel',
	DefaultDestinationAddress: '#ComprehensionLoader-Settings-Panel',
	AutoRender:                false,
	CSS: /*css*/`
		.rds-settings-body {
			padding: 12px;
			display: flex; flex-direction: column; gap: 16px;
			color: var(--theme-color-text-primary, #333333);
		}
		.rds-settings-section { display: flex; flex-direction: column; gap: 6px; }
		.rds-settings-label {
			font-size: 0.85em;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: var(--theme-color-text-secondary, #555555);
		}
	`,
	Templates: [{
		Hash: 'ComprehensionLoader-SettingsPanel',
		Template: /*html*/`
<div class="rds-settings-body">
	<div class="rds-settings-section">
		<div class="rds-settings-label">Appearance</div>
		<div id="ComprehensionLoader-Settings-Theme"></div>
	</div>
</div>`
	}],
	Renderables: [{
		RenderableHash:     'ComprehensionLoader-SettingsPanel',
		TemplateHash:       'ComprehensionLoader-SettingsPanel',
		DestinationAddress: '#ComprehensionLoader-Settings-Panel'
	}]
};
