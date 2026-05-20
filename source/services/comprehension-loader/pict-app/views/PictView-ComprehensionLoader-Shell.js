'use strict';

const libPictView = require('pict-view');

class ComprehensionLoaderShellView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._shellPanelsBuilt = false;
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		if (this.pict.CSSMap) { this.pict.CSSMap.injectCSS(); }
		if (!this._shellPanelsBuilt)
		{
			this._buildShell();
			this._shellPanelsBuilt = true;
		}
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	_buildShell()
	{
		let tmpModal = this.pict.views['Pict-Section-Modal'];
		let tmpMount = document.getElementById('ComprehensionLoader-Shell-Mount');
		if (!tmpModal || typeof tmpModal.shell !== 'function' || !tmpMount)
		{
			this.log.warn('ComprehensionLoader-Shell: Pict-Section-Modal or mount not available; shell not built.');
			return;
		}

		this._shell = tmpModal.shell(tmpMount, { PersistenceKey: 'comprehension-loader-shell' });

		// Top — Theme-TopBar (BrandMark + Nav + User slots)
		this._shell.addPanel({
			Hash: 'topbar', Side: 'top', Mode: 'fixed', Size: 56,
			ContentDestinationId: 'Theme-TopBar', ContentView: 'Theme-TopBar'
		});

		// Bottom — Theme-BottomBar (StatusView slot)
		this._shell.addPanel({
			Hash: 'bottombar', Side: 'bottom', Mode: 'fixed', Size: 36,
			ContentDestinationId: 'Theme-BottomBar', ContentView: 'Theme-BottomBar'
		});

		// Bottom (hidden overlay) — status detail expansion
		this._shell.addPanel({
			Hash: 'status-detail', Side: 'bottom', Mode: 'resizable', Position: 'overlay',
			Size: 320, MinSize: 200, MaxSize: 480,
			Hidden: true, Collapsed: true, Title: 'Status Detail',
			ContentDestinationId: 'ComprehensionLoader-StatusDetail-Panel',
			ContentView: 'ComprehensionLoader-StatusDetail'
		});

		// Right (hidden overlay) — settings
		this._shell.addPanel({
			Hash: 'settings', Side: 'right', Mode: 'resizable', Position: 'overlay',
			Size: 360, MinSize: 280, MaxSize: 540,
			Hidden: true, Collapsed: true, Title: 'Settings',
			ContentDestinationId: 'ComprehensionLoader-Settings-Panel',
			ContentView: 'ComprehensionLoader-SettingsPanel'
		});

		// Center — the workspace (existing Layout renders here)
		this._shell.center({ ContentDestinationId: 'ComprehensionLoader-Workspace' });
	}

	getSettingsPanel()     { return this._shell ? this._shell.getPanel('settings')      : null; }
	getStatusDetailPanel() { return this._shell ? this._shell.getPanel('status-detail') : null; }

	toggleSettingsPanel()
	{
		let tmpPanel = this.getSettingsPanel();
		if (tmpPanel) { tmpPanel.toggle(); }
	}

	toggleStatusDetail()
	{
		let tmpPanel = this.getStatusDetailPanel();
		if (!tmpPanel) { return; }
		tmpPanel.toggle();

		// Notify the provider so it can start/stop the higher-frequency detail poll.
		let tmpProvider = this.pict.providers.ComprehensionLoader;
		let tmpOpen = !tmpPanel.Collapsed;
		if (tmpProvider && tmpOpen && typeof tmpProvider.onStatusDetailExpanded === 'function')
		{
			tmpProvider.onStatusDetailExpanded();
		}
		else if (tmpProvider && !tmpOpen && typeof tmpProvider.onStatusDetailCollapsed === 'function')
		{
			tmpProvider.onStatusDetailCollapsed();
		}
	}

	renderTopBar()
	{
		let tmpNav  = this.pict.views['ComprehensionLoader-TopBar-Nav'];
		let tmpUser = this.pict.views['ComprehensionLoader-TopBar-User'];
		if (tmpNav)  { tmpNav.render();  }
		if (tmpUser) { tmpUser.render(); }
	}
}

module.exports = ComprehensionLoaderShellView;

module.exports.default_configuration =
{
	ViewIdentifier:            'ComprehensionLoader-Shell',
	DefaultRenderable:         'ComprehensionLoader-Shell',
	DefaultDestinationAddress: '#ComprehensionLoader-Application-Container',
	AutoRender:                false,
	CSS: /*css*/`
		html, body { height: 100%; margin: 0; padding: 0; }
		body {
			background:  var(--theme-color-background-primary,   #f5f5f5);
			color:       var(--theme-color-text-primary,         #333333);
			font-family: var(--theme-typography-family-sans,
				-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
		}
		#ComprehensionLoader-Application-Container { height: 100%; min-height: 0; overflow: hidden; }
		.pict-modal-shell-host    { height: 100%; }
		.pict-modal-shell         { background: var(--theme-color-background-primary, #f5f5f5); }
		.pict-modal-shell-panel   { background: var(--theme-color-background-panel,   #ffffff); }
		.pict-modal-shell-center  {
			background: var(--theme-color-background-primary, #f5f5f5);
			overflow: auto;
			padding: 20px;
		}
	`,
	Templates: [{
		Hash: 'ComprehensionLoader-Shell',
		Template: /*html*/`<div id="ComprehensionLoader-Shell-Mount" style="height:100%"></div>`
	}],
	Renderables: [{
		RenderableHash:     'ComprehensionLoader-Shell',
		TemplateHash:       'ComprehensionLoader-Shell',
		DestinationAddress: '#ComprehensionLoader-Application-Container'
	}]
};
