'use strict';

const libPictView = require('pict-view');

class DataClonerShellView extends libPictView
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
		let tmpMount = document.getElementById('DataCloner-Shell-Mount');
		if (!tmpModal || typeof tmpModal.shell !== 'function' || !tmpMount)
		{
			this.log.warn('DataCloner-Shell: Pict-Section-Modal or mount not available; shell not built.');
			return;
		}

		this._shell = tmpModal.shell(tmpMount, { PersistenceKey: 'data-cloner-shell' });

		this._shell.addPanel({
			Hash: 'topbar', Side: 'top', Mode: 'fixed', Size: 56,
			ContentDestinationId: 'Theme-TopBar', ContentView: 'Theme-TopBar'
		});

		this._shell.addPanel({
			Hash: 'bottombar', Side: 'bottom', Mode: 'fixed', Size: 36,
			ContentDestinationId: 'Theme-BottomBar', ContentView: 'Theme-BottomBar'
		});

		this._shell.addPanel({
			Hash: 'status-detail', Side: 'bottom', Mode: 'resizable', Position: 'overlay',
			Size: 320, MinSize: 200, MaxSize: 480,
			Hidden: true, Collapsed: true, Title: 'Status Detail',
			ContentDestinationId: 'DataCloner-StatusDetail-Panel',
			ContentView: 'DataCloner-StatusDetail'
		});

		this._shell.addPanel({
			Hash: 'settings', Side: 'right', Mode: 'resizable', Position: 'overlay',
			Size: 360, MinSize: 280, MaxSize: 540,
			Hidden: true, Collapsed: true, Title: 'Settings',
			ContentDestinationId: 'DataCloner-Settings-Panel',
			ContentView: 'DataCloner-SettingsPanel'
		});

		this._shell.center({ ContentDestinationId: 'DataCloner-Workspace' });
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

		let tmpProvider = this.pict.providers.DataCloner;
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
		let tmpNav  = this.pict.views['DataCloner-TopBar-Nav'];
		let tmpUser = this.pict.views['DataCloner-TopBar-User'];
		if (tmpNav)  { tmpNav.render();  }
		if (tmpUser) { tmpUser.render(); }
	}
}

module.exports = DataClonerShellView;

module.exports.default_configuration =
{
	ViewIdentifier:            'DataCloner-Shell',
	DefaultRenderable:         'DataCloner-Shell',
	DefaultDestinationAddress: '#DataCloner-Application-Container',
	AutoRender:                false,
	CSS: /*css*/`
		html, body { height: 100%; margin: 0; padding: 0; }
		body {
			background:  var(--theme-color-background-primary,   #f5f5f5);
			color:       var(--theme-color-text-primary,         #333333);
			font-family: var(--theme-typography-family-sans,
				-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
		}
		#DataCloner-Application-Container { height: 100%; min-height: 0; overflow: hidden; }
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
		Hash: 'DataCloner-Shell',
		Template: /*html*/`<div id="DataCloner-Shell-Mount" style="height:100%"></div>`
	}],
	Renderables: [{
		RenderableHash:     'DataCloner-Shell',
		TemplateHash:       'DataCloner-Shell',
		DestinationAddress: '#DataCloner-Application-Container'
	}]
};
