const libPictApplication = require('pict-application');

const libProvider = require('./providers/Pict-Provider-ComprehensionLoader.js');

const libViewLayout    = require('./views/PictView-ComprehensionLoader-Layout.js');
const libViewSession   = require('./views/PictView-ComprehensionLoader-Session.js');
const libViewSchema    = require('./views/PictView-ComprehensionLoader-Schema.js');
const libViewSource    = require('./views/PictView-ComprehensionLoader-Source.js');
const libViewLoad      = require('./views/PictView-ComprehensionLoader-Load.js');
const libViewHistogram = require('pict-section-histogram');

const libPictSectionModal = require('pict-section-modal');
const libPictSectionTheme = require('pict-section-theme');
const libBrand            = require('../../RetoldDataService-Brand.js');

const libViewShell        = require('./views/PictView-ComprehensionLoader-Shell.js');
const libViewTopBarNav    = require('./views/PictView-ComprehensionLoader-TopBar-Nav.js');
const libViewTopBarUser   = require('./views/PictView-ComprehensionLoader-TopBar-User.js');
const libViewStatusBar    = require('./views/PictView-ComprehensionLoader-StatusBar.js');
const libViewStatusDetail = require('./views/PictView-ComprehensionLoader-StatusDetail.js');
const libViewSettings     = require('./views/PictView-ComprehensionLoader-SettingsPanel.js');

class ComprehensionLoaderApplication extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		// 1. Modal section (provides shell + panels + modal API).
		this.pict.addView('Pict-Section-Modal',
			libPictSectionModal.default_configuration, libPictSectionModal);

		// 2. Provider + existing section views.
		this.pict.addProvider('ComprehensionLoader', libProvider.default_configuration, libProvider);
		this.pict.addView('ComprehensionLoader-Layout',  libViewLayout.default_configuration,  libViewLayout);
		this.pict.addView('ComprehensionLoader-Session', libViewSession.default_configuration, libViewSession);
		this.pict.addView('ComprehensionLoader-Schema',  libViewSchema.default_configuration,  libViewSchema);
		this.pict.addView('ComprehensionLoader-Source',  libViewSource.default_configuration,  libViewSource);
		this.pict.addView('ComprehensionLoader-Load',    libViewLoad.default_configuration,    libViewLoad);
		this.pict.addView('ComprehensionLoader-StatusHistogram',
			{
				ViewIdentifier: 'ComprehensionLoader-StatusHistogram',
				TargetElementAddress: '#ComprehensionLoader-Throughput-Histogram',
				DefaultDestinationAddress: '#ComprehensionLoader-Throughput-Histogram',
				RenderOnLoad: false,
				Selectable: false,
				Orientation: 'vertical',
				FillContainer: true,
				ShowValues: false,
				ShowLabels: true,
				MaxBarSize: 80,
				BarColor: 'var(--theme-color-brand-primary, #4a90d9)',
				Bins: []
			}, libViewHistogram);

		// 3. Shell host + slot views + status bar / detail + settings panel.
		this.pict.addView('ComprehensionLoader-Shell',
			libViewShell.default_configuration, libViewShell);
		this.pict.addView('ComprehensionLoader-TopBar-Nav',
			libViewTopBarNav.default_configuration, libViewTopBarNav);
		this.pict.addView('ComprehensionLoader-TopBar-User',
			libViewTopBarUser.default_configuration, libViewTopBarUser);
		this.pict.addView('ComprehensionLoader-StatusBar',
			libViewStatusBar.default_configuration, libViewStatusBar);
		this.pict.addView('ComprehensionLoader-StatusDetail',
			libViewStatusDetail.default_configuration, libViewStatusDetail);
		this.pict.addView('ComprehensionLoader-SettingsPanel',
			libViewSettings.default_configuration, libViewSettings);

		// 4. Theme-Section provider — registered LAST so it can find the slot views.
		this.pict.addProvider('Theme-Section',
			{
				ApplyDefault: 'pict-default',
				DefaultMode:  'system',
				DefaultScale: 1.0,
				Brand:        libBrand,
				Views: ['Picker', 'ModeToggle', 'ScaleSelect', 'BrandMark', 'TopBar', 'BottomBar'],
				ViewOptions:
				{
					TopBar:    { NavView:    'ComprehensionLoader-TopBar-Nav', UserView: 'ComprehensionLoader-TopBar-User', Height: 56 },
					BottomBar: { StatusView: 'ComprehensionLoader-StatusBar', Height: 36 }
				}
			}, libPictSectionTheme);
	}

	onAfterInitializeAsync(fCallback)
	{
		// Centralized state
		this.pict.AppData.ComprehensionLoader =
		{
			FetchedEntities: [],
			LastReport: null,
			ServerBusyAtLoad: false,
			LoadPollTimer: null,
			LiveStatusTimer: null,
			StatusDetailExpanded: false,
			StatusDetailTimer: null,
			StatusDetailData: null,
			LastLiveStatus: null,
			PersistFields: [
				'serverURL', 'authMethod', 'authURI', 'checkURI',
				'cookieName', 'cookieValueAddr', 'cookieValueTemplate', 'loginMarker',
				'userName', 'password', 'schemaURL',
				'comprehensionSourceMode', 'comprehensionURL'
			]
		};

		// Make pict available for inline onclick handlers
		window.pict = this.pict;

		// Render the shell first — creates panel destination divs.
		this.pict.views['ComprehensionLoader-Shell'].render();

		// Render the layout (which chains child view renders via onAfterRender)
		// into the shell's #ComprehensionLoader-Workspace destination.
		this.pict.views['ComprehensionLoader-Layout'].render();

		// Render the StatusBar into the BottomBar slot — provider's polling
		// updates this by id in-place, so we only need the initial paint.
		this.pict.views['ComprehensionLoader-StatusBar'].render();

		// Post-render initialization (unchanged)
		this.pict.providers.ComprehensionLoader.initPersistence();
		this.pict.providers.ComprehensionLoader.startLiveStatusPolling();
		this.pict.providers.ComprehensionLoader.initAccordionPreviews();
		this.pict.providers.ComprehensionLoader.updateAllPreviews();
		this.pict.views['ComprehensionLoader-Layout'].collapseAllSections();
		this.pict.providers.ComprehensionLoader.initAutoProcess();

		return fCallback();
	}
}

module.exports = ComprehensionLoaderApplication;

module.exports.default_configuration = require('./Pict-Application-ComprehensionLoader-Configuration.json');
