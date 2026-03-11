const libPictApplication = require('pict-application');

const libProvider = require('./providers/Pict-Provider-DataCloner.js');

const libViewLayout = require('./views/PictView-DataCloner-Layout.js');
const libViewConnection = require('./views/PictView-DataCloner-Connection.js');
const libViewSession = require('./views/PictView-DataCloner-Session.js');
const libViewSchema = require('./views/PictView-DataCloner-Schema.js');
const libViewDeploy = require('./views/PictView-DataCloner-Deploy.js');
const libViewSync = require('./views/PictView-DataCloner-Sync.js');
const libViewExport = require('./views/PictView-DataCloner-Export.js');
const libViewViewData = require('./views/PictView-DataCloner-ViewData.js');
const libViewHistogram = require('pict-section-histogram');

class DataClonerApplication extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		// Register provider
		this.pict.addProvider('DataCloner', libProvider.default_configuration, libProvider);

		// Register views
		this.pict.addView('DataCloner-Layout', libViewLayout.default_configuration, libViewLayout);
		this.pict.addView('DataCloner-Connection', libViewConnection.default_configuration, libViewConnection);
		this.pict.addView('DataCloner-Session', libViewSession.default_configuration, libViewSession);
		this.pict.addView('DataCloner-Schema', libViewSchema.default_configuration, libViewSchema);
		this.pict.addView('DataCloner-Deploy', libViewDeploy.default_configuration, libViewDeploy);
		this.pict.addView('DataCloner-Sync', libViewSync.default_configuration, libViewSync);
		this.pict.addView('DataCloner-Export', libViewExport.default_configuration, libViewExport);
		this.pict.addView('DataCloner-ViewData', libViewViewData.default_configuration, libViewViewData);
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
				BarColor: '#4a90d9',
				Bins: []
			}, libViewHistogram);
	}

	onAfterInitializeAsync(fCallback)
	{
		// Centralized state (replaces global variables)
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
				'connProvider', 'sqliteFilePath',
				'mysqlServer', 'mysqlPort', 'mysqlUser', 'mysqlPassword', 'mysqlDatabase', 'mysqlConnectionLimit',
				'mssqlServer', 'mssqlPort', 'mssqlUser', 'mssqlPassword', 'mssqlDatabase', 'mssqlConnectionLimit',
				'postgresqlHost', 'postgresqlPort', 'postgresqlUser', 'postgresqlPassword', 'postgresqlDatabase', 'postgresqlConnectionLimit',
				'solrHost', 'solrPort', 'solrCore', 'solrPath',
				'mongodbHost', 'mongodbPort', 'mongodbUser', 'mongodbPassword', 'mongodbDatabase', 'mongodbConnectionLimit',
				'rocksdbFolder',
				'bibliographFolder',
				'syncMaxRecords'
			]
		};

		// Make pict available for inline onclick handlers
		window.pict = this.pict;

		// Render layout (which chains child view renders via onAfterRender)
		this.pict.views['DataCloner-Layout'].render();

		// Post-render initialization
		this.pict.providers.DataCloner.initPersistence();
		this.pict.views['DataCloner-Connection'].onProviderChange();
		this.pict.providers.DataCloner.restoreDeployedTables();
		this.pict.providers.DataCloner.startLiveStatusPolling();
		this.pict.providers.DataCloner.initAccordionPreviews();
		this.pict.providers.DataCloner.updateAllPreviews();
		this.pict.views['DataCloner-Layout'].collapseAllSections();
		this.pict.providers.DataCloner.initAutoProcess();

		return fCallback();
	}
}

module.exports = DataClonerApplication;

module.exports.default_configuration = require('./Pict-Application-DataCloner-Configuration.json');
