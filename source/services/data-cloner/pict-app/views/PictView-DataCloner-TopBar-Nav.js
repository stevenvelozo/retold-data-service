'use strict';

const libPictView = require('pict-view');

class DataClonerTopBarNavView extends libPictView
{
	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		if (this.pict.CSSMap) { this.pict.CSSMap.injectCSS(); }
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = DataClonerTopBarNavView;

module.exports.default_configuration =
{
	ViewIdentifier:            'DataCloner-TopBar-Nav',
	DefaultRenderable:         'DataCloner-TopBar-Nav',
	DefaultDestinationAddress: '#Theme-TopBar-Nav',
	AutoRender:                false,
	CSS: /*css*/`
		.rds-nav {
			display: flex; align-items: center; height: 100%;
			padding: 0 12px; gap: 8px;
			color: var(--theme-color-text-on-brand,
				   var(--theme-color-text-primary, #1a1a1a));
			font-weight: 500;
		}
		.rds-nav-sep { opacity: 0.5; font-weight: 400; margin: 0 2px; }
		.rds-nav-app { font-weight: 600; opacity: 0.95; }
	`,
	Templates: [{
		Hash: 'DataCloner-TopBar-Nav',
		Template: /*html*/`<div class="rds-nav"><span class="rds-nav-sep">·</span><span class="rds-nav-app">Data Cloner</span></div>`
	}],
	Renderables: [{
		RenderableHash:     'DataCloner-TopBar-Nav',
		TemplateHash:       'DataCloner-TopBar-Nav',
		DestinationAddress: '#Theme-TopBar-Nav'
	}]
};
