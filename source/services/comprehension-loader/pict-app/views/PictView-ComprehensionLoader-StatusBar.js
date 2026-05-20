'use strict';

const libPictView = require('pict-view');

/**
 * StatusBar — renders into Theme-BottomBar's #Theme-BottomBar-Status slot.
 *
 * Markup preserves the same element ids (#liveStatusBar, #liveStatusMessage,
 * #liveStatusMeta, #liveStatusProgressFill) that the provider's existing
 * renderLiveStatus() poll handler manipulates by id — so the provider's
 * imperative DOM update flow keeps working untouched.
 */
class ComprehensionLoaderStatusBarView extends libPictView
{
	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		if (this.pict.CSSMap) { this.pict.CSSMap.injectCSS(); }
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ComprehensionLoaderStatusBarView;

module.exports.default_configuration =
{
	ViewIdentifier:            'ComprehensionLoader-StatusBar',
	DefaultRenderable:         'ComprehensionLoader-StatusBar',
	DefaultDestinationAddress: '#Theme-BottomBar-Status',
	AutoRender:                false,
	CSS: /*css*/`
		.rds-status-bar {
			display: flex; align-items: center; gap: 12px;
			height: 100%; padding: 0 12px;
			color: var(--theme-color-text-primary, #333333);
			font-size: 0.88em;
			border-top: 1px solid var(--theme-color-border-light, #e9e9e9);
			border-left: 3px solid var(--theme-color-text-secondary, #6c757d);
			position: relative;
		}
		.rds-status-bar.phase-idle         { border-left-color: var(--theme-color-text-secondary, #6c757d); }
		.rds-status-bar.phase-disconnected { border-left-color: var(--theme-color-status-error,   #dc3545); }
		.rds-status-bar.phase-ready        { border-left-color: var(--theme-color-brand-primary,  #4a90d9); }
		.rds-status-bar.phase-loading      { border-left-color: var(--theme-color-status-success, #28a745); }
		.rds-status-bar.phase-stopping     { border-left-color: var(--theme-color-status-warning, #ffc107); }
		.rds-status-bar.phase-complete     { border-left-color: var(--theme-color-status-success, #28a745); }

		.rds-status-dot {
			width: 10px; height: 10px; border-radius: 50%;
			flex-shrink: 0;
			background: var(--theme-color-text-secondary, #6c757d);
		}
		.rds-status-bar.phase-idle         .rds-status-dot { background: var(--theme-color-text-secondary, #6c757d); }
		.rds-status-bar.phase-disconnected .rds-status-dot { background: var(--theme-color-status-error,   #dc3545); }
		.rds-status-bar.phase-ready        .rds-status-dot { background: var(--theme-color-brand-primary,  #4a90d9); }
		.rds-status-bar.phase-loading      .rds-status-dot {
			background: var(--theme-color-status-success, #28a745);
			animation: rds-status-pulse 1.5s ease-in-out infinite;
		}
		.rds-status-bar.phase-stopping     .rds-status-dot {
			background: var(--theme-color-status-warning, #ffc107);
			animation: rds-status-pulse 0.8s ease-in-out infinite;
		}
		.rds-status-bar.phase-complete     .rds-status-dot { background: var(--theme-color-status-success, #28a745); }

		@keyframes rds-status-pulse {
			0%, 100% { opacity: 1; transform: scale(1); }
			50%      { opacity: 0.4; transform: scale(0.8); }
		}

		.rds-status-message { flex: 1; line-height: 1.2; }
		.rds-status-meta {
			display: flex; gap: 12px; flex-shrink: 0;
			font-size: 0.92em; color: var(--theme-color-text-secondary, #666);
		}
		.rds-status-meta .live-status-meta-item { white-space: nowrap; }
		.rds-status-meta .live-status-meta-item strong { color: var(--theme-color-text-primary, #333); }

		.rds-status-detail-btn {
			padding: 2px 8px;
			background: transparent;
			border: 1px solid var(--theme-color-border-default, #ccc);
			border-radius: 3px;
			color: var(--theme-color-text-secondary, #666);
			cursor: pointer;
			font-size: 0.92em;
			line-height: 1;
		}
		.rds-status-detail-btn:hover {
			background: var(--theme-color-background-hover, #f0f0f0);
			color: var(--theme-color-text-primary, #333);
		}

		.rds-status-progress-bar {
			position: absolute; left: 0; right: 0; bottom: 0;
			height: 2px;
			background: var(--theme-color-background-tertiary, #e9ecef);
			overflow: hidden;
		}
		.rds-status-progress-fill {
			height: 100%;
			background: var(--theme-color-status-success, #28a745);
			transition: width 1s ease;
		}
	`,
	Templates: [{
		Hash: 'ComprehensionLoader-StatusBar',
		Template: /*html*/`
<div id="liveStatusBar" class="rds-status-bar phase-idle">
	<div class="rds-status-dot live-status-dot"></div>
	<div id="liveStatusMessage" class="rds-status-message live-status-message">Idle</div>
	<div id="liveStatusMeta" class="rds-status-meta live-status-meta"></div>
	<button class="rds-status-detail-btn"
		onclick="_Pict.views['ComprehensionLoader-Shell'].toggleStatusDetail()"
		title="Show detail">Detail</button>
	<div class="rds-status-progress-bar live-status-progress-bar">
		<div id="liveStatusProgressFill" class="rds-status-progress-fill live-status-progress-fill" style="width:0%"></div>
	</div>
</div>`
	}],
	Renderables: [{
		RenderableHash:     'ComprehensionLoader-StatusBar',
		TemplateHash:       'ComprehensionLoader-StatusBar',
		DestinationAddress: '#Theme-BottomBar-Status'
	}]
};
