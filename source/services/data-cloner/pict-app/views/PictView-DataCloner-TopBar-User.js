'use strict';

const libPictView = require('pict-view');

class DataClonerTopBarUserView extends libPictView
{
	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		if (this.pict.CSSMap) { this.pict.CSSMap.injectCSS(); }
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = DataClonerTopBarUserView;

module.exports.default_configuration =
{
	ViewIdentifier:            'DataCloner-TopBar-User',
	DefaultRenderable:         'DataCloner-TopBar-User',
	DefaultDestinationAddress: '#Theme-TopBar-User',
	AutoRender:                false,
	CSS: /*css*/`
		.rds-user { display: flex; align-items: center; height: 100%; gap: 8px; padding: 0 12px; }
		.rds-user-btn {
			padding: 4px 8px;
			border: 1px solid var(--theme-color-border-default, #5E5549);
			background: transparent;
			color: var(--theme-color-text-on-brand,
				   var(--theme-color-text-secondary, #1a1a1a));
			border-radius: 4px;
			cursor: pointer;
			display: inline-flex; align-items: center; justify-content: center;
			font-size: 1em; line-height: 1;
		}
		.rds-user-btn:hover {
			background: var(--theme-color-background-hover, rgba(255,255,255,0.08));
		}
	`,
	Templates: [{
		Hash: 'DataCloner-TopBar-User',
		Template: /*html*/`<div class="rds-user"><button class="rds-user-btn" onclick="_Pict.views['DataCloner-Shell'].toggleSettingsPanel()" title="Settings" aria-label="Settings">{~I:Settings~}</button></div>`
	}],
	Renderables: [{
		RenderableHash:     'DataCloner-TopBar-User',
		TemplateHash:       'DataCloner-TopBar-User',
		DestinationAddress: '#Theme-TopBar-User'
	}]
};
