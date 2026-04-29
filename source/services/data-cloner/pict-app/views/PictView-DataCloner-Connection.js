/**
 * DataCloner — Database Connection (section 1)
 *
 * Thin accordion shell + connect/test wiring around the shared
 * `pict-section-connection-form` view, which owns the schema-driven
 * provider <select> + per-provider field rendering.  The shared view
 * is registered separately in Pict-Application-DataCloner.js and
 * renders into the FormSlot below.
 *
 * Flow:
 *   1. Layout renders, this view paints the accordion shell with an
 *      empty FormSlot + "Loading providers…" preview text.
 *   2. Pict-Provider-DataCloner#bootstrapConnectionSchemas() fetches
 *      GET /clone/connection/schemas and calls setSchemas() on the
 *      shared view, which renders the per-provider form into FormSlot.
 *   3. User clicks Connect / Test → this view delegates to the shared
 *      view's getProviderConfig() to assemble the wire-format payload,
 *      then POSTs to /clone/connection/{configure,test}.
 *
 * Earlier versions of this view contained the schema rendering inline;
 * that logic has been lifted into pict-section-connection-form so
 * retold-databeacon and retold-facto can share it.  See:
 *   modules/pict/pict-section-connection-form/source/Pict-Section-ConnectionForm.js
 */
'use strict';

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier:            'DataCloner-Connection',
	DefaultRenderable:         'DataCloner-Connection',
	DefaultDestinationAddress: '#DataCloner-Section-Connection',

	Templates:
	[
		{
			Hash: 'DataCloner-Connection',
			Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">1</div>
	<div class="accordion-card" id="section1" data-section="1">
		<div class="accordion-header" onclick="pict.views['DataCloner-Layout'].toggleSection('section1')">
			<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto1"> <span class="auto-label">auto</span></label>
			<div class="accordion-title">Database Connection</div>
			<span class="accordion-phase" id="phase1"></span>
			<div class="accordion-preview" id="preview1">{~D:AppData.DataCloner.Connection.PreviewText~}</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['DataCloner-Connection'].connectProvider()">go</span>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<p style="font-size:0.9em; color:#666; margin-bottom:10px">Configure the local database where cloned data will be stored.  The provider list comes from the host's installed meadow-connection modules.</p>

			<div class="inline-group" style="margin-bottom:10px">
				<div style="flex:1; display:flex; align-items:flex-end; gap:8px; justify-content:flex-end">
					<button class="primary" onclick="pict.views['DataCloner-Connection'].connectProvider()">Connect</button>
					<button class="secondary" onclick="pict.views['DataCloner-Connection'].testConnection()">Test Connection</button>
				</div>
			</div>

			<!-- pict-section-connection-form renders here -->
			<div id="DataCloner-Connection-FormSlot"></div>

			<div id="connectionStatus"></div>
		</div>
	</div>
</div>`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'DataCloner-Connection',
			TemplateHash:       'DataCloner-Connection',
			DestinationAddress: '#DataCloner-Section-Connection'
		}
	]
};

class DataClonerConnectionView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	// ====================================================================
	//  Lifecycle
	// ====================================================================

	onBeforeRender(pRenderable)
	{
		// Make sure AppData has the slot the accordion preview reads
		// from (the Provider's bootstrapConnectionSchemas() will fill in
		// the live values once schemas arrive).
		if (!this.pict.AppData.DataCloner) { this.pict.AppData.DataCloner = {}; }
		if (!this.pict.AppData.DataCloner.Connection)
		{
			this.pict.AppData.DataCloner.Connection =
				{
					Schemas:        [],
					ActiveProvider: '',
					PreviewText:    'Loading providers…'
				};
		}
		return super.onBeforeRender(pRenderable);
	}

	// ====================================================================
	//  Helpers used by the provider's preview / persistence layer
	// ====================================================================

	/**
	 * Build the section 1 accordion preview text.  Reads live DOM
	 * values via the shared view if it's mounted, otherwise falls back
	 * to schema defaults.
	 *
	 * @param {{Schemas: object[], ActiveProvider: string}} pState
	 * @returns {string}
	 */
	_buildPreviewText(pState)
	{
		let tmpActive = pState.ActiveProvider;
		let tmpSchema = (pState.Schemas || []).find((pS) => pS.Provider === tmpActive);
		if (!tmpSchema) { return tmpActive || '(no provider selected)'; }

		// Heuristics:
		//   - file-based providers (single Path field) → "<DisplayName> at <path>"
		//   - host/port/user providers              → "<DisplayName> on host:port [as user]"
		// Host/port/user are matched by canonical schema field names.
		let tmpFields = tmpSchema.Fields || [];
		let tmpPath = tmpFields.find((pF) => pF.Type === 'Path');
		if (tmpPath)
		{
			let tmpVal = this._readFieldValue(tmpSchema.Provider, tmpPath) || tmpPath.Default || '';
			return `${tmpSchema.DisplayName} at ${tmpVal}`;
		}
		let tmpHostField = tmpFields.find((pF) => pF.Name === 'host' || pF.Name === 'server');
		let tmpPortField = tmpFields.find((pF) => pF.Name === 'port');
		let tmpUserField = tmpFields.find((pF) => pF.Name === 'user');
		if (tmpHostField && tmpPortField)
		{
			let tmpHost = this._readFieldValue(tmpSchema.Provider, tmpHostField) || tmpHostField.Default || '';
			let tmpPort = this._readFieldValue(tmpSchema.Provider, tmpPortField) || tmpPortField.Default || '';
			let tmpPreview = `${tmpSchema.DisplayName} on ${tmpHost}:${tmpPort}`;
			if (tmpUserField)
			{
				let tmpUser = this._readFieldValue(tmpSchema.Provider, tmpUserField) || tmpUserField.Default || '';
				if (tmpUser) { tmpPreview += ` as ${tmpUser}`; }
			}
			return tmpPreview;
		}
		return tmpSchema.DisplayName;
	}

	_readFieldValue(pProvider, pField)
	{
		if (typeof(document) === 'undefined') { return ''; }
		let tmpForm = this.pict.views['PictSection-ConnectionForm'];
		if (!tmpForm) { return ''; }
		let tmpEl = document.getElementById(tmpForm.fieldDOMId(pProvider, pField.Name));
		if (!tmpEl) { return ''; }
		if (pField.Type === 'Boolean') { return tmpEl.checked ? 'true' : ''; }
		return tmpEl.value;
	}

	/**
	 * DOM-id resolver for fields owned by the shared view.  Forwarded
	 * to PictSection-ConnectionForm so the provider's persistence
	 * layer (saveField, restoreFields) can compute element ids without
	 * needing to know the prefix.
	 */
	fieldDOMId(pProvider, pFieldName)
	{
		let tmpForm = this.pict.views['PictSection-ConnectionForm'];
		if (tmpForm && typeof(tmpForm.fieldDOMId) === 'function')
		{
			return tmpForm.fieldDOMId(pProvider, pFieldName);
		}
		// Fallback before the shared view is mounted.
		let tmpProvider = String(pProvider || '').toLowerCase();
		let tmpField    = String(pFieldName || '').replace(/\./g, '_');
		return `datacloner-conn-${tmpProvider}-${tmpField}`;
	}

	// ====================================================================
	//  Connect / Test — delegate field collection to the shared view
	// ====================================================================

	getProviderConfig()
	{
		let tmpForm = this.pict.views['PictSection-ConnectionForm'];
		if (tmpForm && typeof(tmpForm.getProviderConfig) === 'function')
		{
			return tmpForm.getProviderConfig();
		}
		// Shared view not mounted yet (early bootstrap, or schemas
		// failed to load).  Surface a plain empty payload — the
		// connect/test handlers downstream will report the failure
		// from the server side.
		return { Provider: '', Config: {} };
	}

	connectProvider()
	{
		if (this._connectInFlight) { return; }
		this._connectInFlight = true;

		let tmpConnInfo = this.getProviderConfig();

		this.pict.providers.DataCloner.setSectionPhase(1, 'busy');
		this.pict.providers.DataCloner.setStatus('connectionStatus', 'Connecting to ' + tmpConnInfo.Provider + '...', 'info');

		let tmpSelf = this;
		this.pict.providers.DataCloner.api('POST', '/clone/connection/configure', tmpConnInfo)
			.then(
				(pData) =>
				{
					tmpSelf._connectInFlight = false;
					if (pData.Success)
					{
						tmpSelf.pict.providers.DataCloner.setStatus('connectionStatus', pData.Message, 'ok');
						tmpSelf.pict.providers.DataCloner.setSectionPhase(1, 'ok');
					}
					else
					{
						tmpSelf.pict.providers.DataCloner.setStatus('connectionStatus', 'Connection failed: ' + (pData.Error || 'Unknown error'), 'error');
						tmpSelf.pict.providers.DataCloner.setSectionPhase(1, 'error');
					}
				})
			.catch(
				(pError) =>
				{
					tmpSelf._connectInFlight = false;
					tmpSelf.pict.providers.DataCloner.setStatus('connectionStatus', 'Request failed: ' + pError.message, 'error');
					tmpSelf.pict.providers.DataCloner.setSectionPhase(1, 'error');
				});
	}

	testConnection()
	{
		let tmpConnInfo = this.getProviderConfig();

		this.pict.providers.DataCloner.setStatus('connectionStatus', 'Testing ' + tmpConnInfo.Provider + ' connection...', 'info');

		this.pict.providers.DataCloner.api('POST', '/clone/connection/test', tmpConnInfo)
			.then(
				(pData) =>
				{
					if (pData.Success)
					{
						this.pict.providers.DataCloner.setStatus('connectionStatus', pData.Message, 'ok');
					}
					else
					{
						this.pict.providers.DataCloner.setStatus('connectionStatus', 'Test failed: ' + (pData.Error || 'Unknown error'), 'error');
					}
				})
			.catch(
				(pError) =>
				{
					this.pict.providers.DataCloner.setStatus('connectionStatus', 'Request failed: ' + pError.message, 'error');
				});
	}

	checkConnectionStatus()
	{
		this.pict.providers.DataCloner.api('GET', '/clone/connection/status')
			.then(
				(pData) =>
				{
					if (pData.Connected)
					{
						this.pict.providers.DataCloner.setStatus('connectionStatus', 'Connected: ' + pData.Provider, 'ok');
						this.pict.providers.DataCloner.setSectionPhase(1, 'ok');
					}
				})
			.catch(
				() => { /* ignore */ });
	}
}

module.exports = DataClonerConnectionView;
module.exports.default_configuration = _ViewConfiguration;
