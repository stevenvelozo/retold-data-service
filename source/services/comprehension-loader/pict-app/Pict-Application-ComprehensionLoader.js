const libPictApplication = require('pict-application');

const libProvider = require('./providers/Pict-Provider-ComprehensionLoader.js');

const libViewLayout = require('./views/PictView-ComprehensionLoader-Layout.js');
const libViewSession = require('./views/PictView-ComprehensionLoader-Session.js');
const libViewSchema = require('./views/PictView-ComprehensionLoader-Schema.js');
const libViewSource = require('./views/PictView-ComprehensionLoader-Source.js');
const libViewLoad = require('./views/PictView-ComprehensionLoader-Load.js');
const libViewHistogram = require('pict-section-histogram');

class ComprehensionLoaderApplication extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		// Register provider
		this.pict.addProvider('ComprehensionLoader', libProvider.default_configuration, libProvider);

		// Register views
		this.pict.addView('ComprehensionLoader-Layout', libViewLayout.default_configuration, libViewLayout);
		this.pict.addView('ComprehensionLoader-Session', libViewSession.default_configuration, libViewSession);
		this.pict.addView('ComprehensionLoader-Schema', libViewSchema.default_configuration, libViewSchema);
		this.pict.addView('ComprehensionLoader-Source', libViewSource.default_configuration, libViewSource);
		this.pict.addView('ComprehensionLoader-Load', libViewLoad.default_configuration, libViewLoad);
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
				BarColor: '#4a90d9',
				Bins: []
			}, libViewHistogram);
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

		// Render layout (which chains child view renders via onAfterRender)
		this.pict.views['ComprehensionLoader-Layout'].render();

		// Post-render initialization
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
