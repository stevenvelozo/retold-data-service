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
const libViewConnectionForm = require('pict-section-connection-form');

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

		// Shared schema-driven connection form.  Renders into the slot
		// the DataCloner-Connection accordion shell exposes; the
		// provider's bootstrapConnectionSchemas() pumps the schemas in
		// once the host's /clone/connection/schemas endpoint responds.
		this.pict.addView('PictSection-ConnectionForm',
			Object.assign({}, libViewConnectionForm.default_configuration,
				{
					ContainerSelector:         '#DataCloner-Connection-FormSlot',
					DefaultDestinationAddress: '#DataCloner-Connection-FormSlot',
					SchemasAddress:            'AppData.DataCloner.Connection.Schemas',
					ActiveAddress:             'AppData.DataCloner.Connection.ActiveProvider',
					FieldIDPrefix:             'datacloner-conn'
				}), libViewConnectionForm);
	}

	onAfterInitializeAsync(fCallback)
	{
		// Centralized state (replaces global variables).
		//
		// PersistFields covers the static, non-connection inputs only.
		// Connection-section fields (provider picker + per-provider
		// inputs) are schema-driven now: their DOM ids and
		// localStorage keys are derived at runtime from the host's
		// /clone/connection/schemas response and persistence is hooked
		// up by Pict-Provider-DataCloner#bootstrapConnectionSchemas
		// after the schema-driven Connection view re-renders.  See
		// PictView-DataCloner-Connection.js for the field-id
		// convention.
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
			// Connection state — populated by bootstrapConnectionSchemas().
			// Initialized empty here so the Connection view's first
			// onBeforeRender finds a valid (if empty) shape.
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

		// Make pict available for inline onclick handlers
		window.pict = this.pict;

		// Render layout (which chains child view renders via onAfterRender).
		// The Connection view renders an empty shell here — the schemas
		// arrive asynchronously and trigger a re-render once they land.
		this.pict.views['DataCloner-Layout'].render();

		// Post-render initialization for the static (non-connection) UI.
		this.pict.providers.DataCloner.initPersistence();
		this.pict.providers.DataCloner.restoreDeployedTables();
		this.pict.providers.DataCloner.startLiveStatusPolling();
		this.pict.providers.DataCloner.initAccordionPreviews();
		this.pict.providers.DataCloner.updateAllPreviews();
		this.pict.views['DataCloner-Layout'].collapseAllSections();
		this.pict.providers.DataCloner.initAutoProcess();

		// Async: fetch the host's connection-form schemas and re-render
		// the Connection section.  bootstrapConnectionSchemas restores
		// localStorage values + hooks save listeners once the new DOM
		// is in place, then invokes onProviderChange() to surface the
		// active provider's form.
		this.pict.providers.DataCloner.bootstrapConnectionSchemas(function () { /* fire-and-forget */ });

		return fCallback();
	}
}

module.exports = DataClonerApplication;

module.exports.default_configuration = require('./Pict-Application-DataCloner-Configuration.json');
