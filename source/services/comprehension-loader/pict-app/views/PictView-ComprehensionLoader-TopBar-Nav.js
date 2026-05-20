'use strict';

const libPictView = require('pict-view');

class ComprehensionLoaderTopBarNavView extends libPictView
{
	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		if (this.pict.CSSMap) { this.pict.CSSMap.injectCSS(); }
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ComprehensionLoaderTopBarNavView;

module.exports.default_configuration =
{
	ViewIdentifier:            'ComprehensionLoader-TopBar-Nav',
	DefaultRenderable:         'ComprehensionLoader-TopBar-Nav',
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
		Hash: 'ComprehensionLoader-TopBar-Nav',
		Template: /*html*/`<div class="rds-nav"><span class="rds-nav-sep">·</span><span class="rds-nav-app">Comprehension Loader</span></div>`
	}],
	Renderables: [{
		RenderableHash:     'ComprehensionLoader-TopBar-Nav',
		TemplateHash:       'ComprehensionLoader-TopBar-Nav',
		DestinationAddress: '#Theme-TopBar-Nav'
	}]
};
