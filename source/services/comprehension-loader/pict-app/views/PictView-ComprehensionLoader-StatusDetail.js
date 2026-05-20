'use strict';

const libPictView = require('pict-view');

/**
 * StatusDetail — content for the expandable bottom overlay panel.
 *
 * Renders the throughput histogram slot and the running-ops / completed-ops /
 * errors detail container, both of which the existing provider populates by
 * direct DOM manipulation. The element ids (#X-Throughput-Histogram,
 * #X-StatusDetail-Container) are preserved so the provider keeps working.
 */
class ComprehensionLoaderStatusDetailView extends libPictView
{
	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		if (this.pict.CSSMap) { this.pict.CSSMap.injectCSS(); }
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ComprehensionLoaderStatusDetailView;

module.exports.default_configuration =
{
	ViewIdentifier:            'ComprehensionLoader-StatusDetail',
	DefaultRenderable:         'ComprehensionLoader-StatusDetail',
	DefaultDestinationAddress: '#ComprehensionLoader-StatusDetail-Panel',
	AutoRender:                false,
	CSS: /*css*/`
		.rds-status-detail-body {
			padding: 12px 20px 16px;
			max-height: 100%;
			overflow-y: auto;
			color: var(--theme-color-text-primary, #333);
		}
		.rds-status-detail-section { margin-bottom: 14px; }
		.rds-status-detail-section:last-child { margin-bottom: 0; }
		.rds-status-detail-section-title {
			font-size: 0.85em; font-weight: 600;
			color: var(--theme-color-text-secondary, #555);
			text-transform: uppercase; letter-spacing: 0.5px;
			margin-bottom: 8px; padding-bottom: 4px;
			border-bottom: 1px solid var(--theme-color-border-light, #eee);
		}
		.running-op-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; font-size: 0.9em; }
		.running-op-name { font-weight: 600; min-width: 180px; }
		.running-op-bar {
			flex: 1; height: 8px;
			background: var(--theme-color-background-tertiary, #e9ecef);
			border-radius: 4px; overflow: hidden; min-width: 120px;
		}
		.running-op-bar-fill {
			height: 100%;
			background: var(--theme-color-brand-primary, #4a90d9);
			transition: width 0.5s ease;
		}
		.running-op-count { font-size: 0.85em; color: var(--theme-color-text-secondary, #666); white-space: nowrap; }
		.running-op-pending { color: var(--theme-color-text-muted, #888); font-size: 0.85em; font-style: italic; padding: 4px 0; }
		.completed-op-row { padding: 8px 0; border-bottom: 1px solid var(--theme-color-background-tertiary, #f0f0f0); }
		.completed-op-row:last-child { border-bottom: none; }
		.completed-op-header { display: flex; align-items: center; gap: 10px; font-size: 0.9em; margin-bottom: 4px; }
		.completed-op-name { font-weight: 600; }
		.completed-op-stats { color: var(--theme-color-text-secondary, #666); font-size: 0.85em; }
		.completed-op-checkmark { color: var(--theme-color-status-success, #28a745); }
		.error-op-row { padding: 6px 0; border-bottom: 1px solid var(--theme-color-background-tertiary, #f0f0f0); font-size: 0.9em; }
		.error-op-row:last-child { border-bottom: none; }
		.error-op-header { display: flex; align-items: center; gap: 8px; }
		.error-op-name { font-weight: 600; color: var(--theme-color-status-error, #dc3545); }
		.error-op-status { font-size: 0.82em; color: var(--theme-color-status-error, #dc3545); }
		.error-op-message { font-size: 0.82em; color: var(--theme-color-text-muted, #888); margin-top: 2px; padding-left: 18px; }
	`,
	Templates: [{
		Hash: 'ComprehensionLoader-StatusDetail',
		Template: /*html*/`
<div class="rds-status-detail-body">
	<div class="rds-status-detail-section">
		<div class="rds-status-detail-section-title">Throughput</div>
		<div id="ComprehensionLoader-Throughput-Histogram" style="height:120px"></div>
	</div>
	<div id="ComprehensionLoader-StatusDetail-Container"></div>
</div>`
	}],
	Renderables: [{
		RenderableHash:     'ComprehensionLoader-StatusDetail',
		TemplateHash:       'ComprehensionLoader-StatusDetail',
		DestinationAddress: '#ComprehensionLoader-StatusDetail-Panel'
	}]
};
