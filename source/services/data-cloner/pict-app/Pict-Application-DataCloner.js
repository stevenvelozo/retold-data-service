const libPictApplication = require('pict-application');

const libProvider = require('./providers/Pict-Provider-DataCloner.js');

const libViewLayout     = require('./views/PictView-DataCloner-Layout.js');
const libViewConnection = require('./views/PictView-DataCloner-Connection.js');
const libViewSession    = require('./views/PictView-DataCloner-Session.js');
const libViewSchema     = require('./views/PictView-DataCloner-Schema.js');
const libViewDeploy     = require('./views/PictView-DataCloner-Deploy.js');
const libViewSync       = require('./views/PictView-DataCloner-Sync.js');
const libViewExport     = require('./views/PictView-DataCloner-Export.js');
const libViewViewData   = require('./views/PictView-DataCloner-ViewData.js');
const libViewHistogram  = require('pict-section-histogram');
const libViewConnectionForm = require('pict-section-connection-form');

const libPictSectionModal = require('pict-section-modal');
const libPictSectionTheme = require('pict-section-theme');
const libBrand            = require('../../RetoldDataService-Brand.js');

const libViewShell        = require('./views/PictView-DataCloner-Shell.js');
const libViewTopBarNav    = require('./views/PictView-DataCloner-TopBar-Nav.js');
const libViewTopBarUser   = require('./views/PictView-DataCloner-TopBar-User.js');
const libViewStatusBar    = require('./views/PictView-DataCloner-StatusBar.js');
const libViewStatusDetail = require('./views/PictView-DataCloner-StatusDetail.js');
const libViewSettings     = require('./views/PictView-DataCloner-SettingsPanel.js');

class DataClonerApplication extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		// 1. Modal section (provides shell + panels + modal API).
		this.pict.addView('Pict-Section-Modal',
			libPictSectionModal.default_configuration, libPictSectionModal);

		// 2. Provider + existing section views.
		this.pict.addProvider('DataCloner', libProvider.default_configuration, libProvider);
		this.pict.addView('DataCloner-Layout',     libViewLayout.default_configuration,     libViewLayout);
		this.pict.addView('DataCloner-Connection', libViewConnection.default_configuration, libViewConnection);
		this.pict.addView('DataCloner-Session',    libViewSession.default_configuration,    libViewSession);
		this.pict.addView('DataCloner-Schema',     libViewSchema.default_configuration,     libViewSchema);
		this.pict.addView('DataCloner-Deploy',     libViewDeploy.default_configuration,     libViewDeploy);
		this.pict.addView('DataCloner-Sync',       libViewSync.default_configuration,       libViewSync);
		this.pict.addView('DataCloner-Export',     libViewExport.default_configuration,     libViewExport);
		this.pict.addView('DataCloner-ViewData',   libViewViewData.default_configuration,   libViewViewData);
		this.pict.addView('DataCloner-StatusHistogram',
			{
				ViewIdentifier: 'DataCloner-StatusHistogram',
				TargetElementAddress: '#DataCloner-Throughput-Histogram',
				DefaultDestinationAddress: '#DataCloner-Throughput-Histogram',
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

		// Shared schema-driven connection form (renders into the
		// DataCloner-Connection accordion shell's slot).
		this.pict.addView('PictSection-ConnectionForm',
			Object.assign({}, libViewConnectionForm.default_configuration,
				{
					ContainerSelector:         '#DataCloner-Connection-FormSlot',
					DefaultDestinationAddress: '#DataCloner-Connection-FormSlot',
					SchemasAddress:            'AppData.DataCloner.Connection.Schemas',
					ActiveAddress:             'AppData.DataCloner.Connection.ActiveProvider',
					FieldIDPrefix:             'datacloner-conn'
				}), libViewConnectionForm);

		// 3. Shell host + slot views + status bar / detail + settings panel.
		this.pict.addView('DataCloner-Shell',
			libViewShell.default_configuration, libViewShell);
		this.pict.addView('DataCloner-TopBar-Nav',
			libViewTopBarNav.default_configuration, libViewTopBarNav);
		this.pict.addView('DataCloner-TopBar-User',
			libViewTopBarUser.default_configuration, libViewTopBarUser);
		this.pict.addView('DataCloner-StatusBar',
			libViewStatusBar.default_configuration, libViewStatusBar);
		this.pict.addView('DataCloner-StatusDetail',
			libViewStatusDetail.default_configuration, libViewStatusDetail);
		this.pict.addView('DataCloner-SettingsPanel',
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
					TopBar:    { NavView:    'DataCloner-TopBar-Nav', UserView: 'DataCloner-TopBar-User', Height: 56 },
					BottomBar: { StatusView: 'DataCloner-StatusBar', Height: 36 }
				}
			}, libPictSectionTheme);
	}

	onAfterInitializeAsync(fCallback)
	{
		this.pict.AppData.DataCloner =
		{
			FetchedTables: [],
			DeployedTables: [],
			LastReport: null,
			ServerBusyAtLoad: false,
			SyncPollTimer: null,
			LiveStatusTimer: null,
			StatusDetailExpanded: false,
			StatusDetailAutoExpanded: false,
			StatusDetailTimer: null,
			StatusDetailData: null,
			LastLiveStatus: null,
			PersistFields: [
				'serverURL', 'authMethod', 'authURI', 'checkURI',
				'cookieName', 'cookieValueAddr', 'cookieValueTemplate', 'loginMarker',
				'userName', 'password', 'schemaURL', 'pageSize', 'dateTimePrecisionMS',
				'syncMaxRecords'
			],
			Connection:
			{
				Schemas:         [],
				ActiveProvider:  '',
				ProviderOptions: [],
				ProviderForms:   [],
				NoSchemasSlot:   [{}],
				PreviewText:     'Loading providers…'
			}
		};

		window.pict = this.pict;

		// Render the shell first — creates panel destination divs.
		this.pict.views['DataCloner-Shell'].render();

		// Render the layout (chains child renders) into #DataCloner-Workspace.
		this.pict.views['DataCloner-Layout'].render();

		// Render the StatusBar into the BottomBar slot.
		this.pict.views['DataCloner-StatusBar'].render();

		this.pict.providers.DataCloner.initPersistence();
		this.pict.providers.DataCloner.restoreDeployedTables();
		this.pict.providers.DataCloner.startLiveStatusPolling();
		this.pict.providers.DataCloner.initAccordionPreviews();
		this.pict.providers.DataCloner.updateAllPreviews();
		this.pict.views['DataCloner-Layout'].collapseAllSections();
		this.pict.providers.DataCloner.initAutoProcess();

		this.pict.providers.DataCloner.bootstrapConnectionSchemas(function () { /* fire-and-forget */ });

		return fCallback();
	}
}

module.exports = DataClonerApplication;

module.exports.default_configuration = require('./Pict-Application-DataCloner-Configuration.json');
