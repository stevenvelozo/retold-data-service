const libPictView = require('pict-view');

class DataClonerLayoutView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender()
	{
		// Render all section views into their containers
		this.pict.views['DataCloner-Connection'].render();
		this.pict.views['DataCloner-Session'].render();
		this.pict.views['DataCloner-Schema'].render();
		this.pict.views['DataCloner-Deploy'].render();
		this.pict.views['DataCloner-Sync'].render();
		this.pict.views['DataCloner-Export'].render();
		this.pict.views['DataCloner-ViewData'].render();

		this.pict.CSSMap.injectCSS();
	}

	toggleSection(pSectionId)
	{
		let tmpCard = document.getElementById(pSectionId);
		if (!tmpCard) return;
		tmpCard.classList.toggle('open');
	}

	expandAllSections()
	{
		let tmpCards = document.querySelectorAll('.accordion-card');
		for (let i = 0; i < tmpCards.length; i++)
		{
			tmpCards[i].classList.add('open');
		}
	}

	collapseAllSections()
	{
		let tmpCards = document.querySelectorAll('.accordion-card');
		for (let i = 0; i < tmpCards.length; i++)
		{
			tmpCards[i].classList.remove('open');
		}
	}

	toggleStatusDetail()
	{
		let tmpDetail = document.getElementById('liveStatusDetail');
		let tmpMeta = document.getElementById('liveStatusMeta');
		let tmpMessage = document.getElementById('liveStatusMessage');
		let tmpToggle = document.getElementById('liveStatusToggle');
		let tmpBar = document.getElementById('liveStatusBar');
		if (!tmpDetail) return;

		let tmpIsExpanded = tmpDetail.style.display !== 'none';

		if (tmpIsExpanded)
		{
			tmpDetail.style.display = 'none';
			tmpMeta.style.display = '';
			tmpMessage.style.display = '';
			tmpToggle.innerHTML = '&#9660;';
			tmpBar.classList.remove('expanded');
			this.pict.providers.DataCloner.onStatusDetailCollapsed();
		}
		else
		{
			tmpDetail.style.display = '';
			tmpMeta.style.display = 'none';
			tmpMessage.style.display = 'none';
			tmpToggle.innerHTML = '&#9650;';
			tmpBar.classList.add('expanded');
			this.pict.providers.DataCloner.onStatusDetailExpanded();
		}
	}
}

module.exports = DataClonerLayoutView;

module.exports.default_configuration =
{
	ViewIdentifier: 'DataCloner-Layout',
	DefaultRenderable: 'DataCloner-Layout',
	DefaultDestinationAddress: '#DataCloner-Application-Container',
	CSS: /*css*/`
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; padding: 20px; }
h1 { margin-bottom: 20px; color: #1a1a1a; }
h2 { margin-bottom: 12px; color: #444; font-size: 1.2em; border-bottom: 2px solid #ddd; padding-bottom: 6px; }

.section { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

/* Accordion layout */
.accordion-row { display: flex; gap: 0; margin-bottom: 16px; align-items: stretch; }
.accordion-number {
	flex: 0 0 48px; display: flex; align-items: flex-start; justify-content: center;
	padding-top: 16px; font-size: 1.6em; font-weight: 700; color: #4a90d9;
	user-select: none;
}
.accordion-card {
	flex: 1; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
	overflow: hidden; min-width: 0;
}
.accordion-header {
	display: flex; align-items: center; padding: 14px 20px; cursor: pointer;
	user-select: none; gap: 12px; transition: background 0.15s; line-height: 1.4;
}
.accordion-header:hover { background: #fafafa; }
.accordion-title { font-weight: 600; color: #333; font-size: 1.05em; white-space: nowrap; }
.accordion-preview { flex: 1; font-style: italic; color: #888; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.accordion-toggle {
	flex: 0 0 20px; display: flex; align-items: center; justify-content: center;
	border-radius: 4px; transition: background 0.15s, transform 0.25s; font-size: 0.7em; color: #888;
}
.accordion-header:hover .accordion-toggle { background: #eee; color: #555; }
.accordion-card.open .accordion-toggle { transform: rotate(180deg); }
.accordion-body { padding: 0 20px 20px; display: none; }
.accordion-card.open .accordion-body { display: block; }
.accordion-card.open .accordion-header { border-bottom: 1px solid #eee; }
.accordion-card.open .accordion-preview { display: none; }

/* Action controls (go link + auto checkbox) */
.accordion-actions { display: flex; align-items: baseline; gap: 8px; flex-shrink: 0; }
.accordion-card.open .accordion-actions { display: none; }
.accordion-go {
	font-size: 0.82em; color: #4a90d9; cursor: pointer; text-decoration: none;
	font-weight: 500; white-space: nowrap; padding: 2px 6px; border-radius: 3px;
	transition: background 0.15s;
}
.accordion-go:hover { background: #e8f0fe; text-decoration: underline; }
.accordion-auto {
	font-size: 0.82em; color: #999; white-space: nowrap; cursor: pointer;
}
.accordion-auto .auto-label { display: none; }
.accordion-auto:hover .auto-label { display: inline; }
.accordion-auto input[type="checkbox"] { width: auto; margin: 0; cursor: pointer; vertical-align: middle; position: relative; top: 0px; opacity: 0.75; transition: opacity 0.15s; }
.accordion-auto:hover input[type="checkbox"] { opacity: 1; }
.accordion-auto:hover { color: #666; }

/* Phase status indicator */
.accordion-phase {
	flex: 0 0 auto; display: none; align-items: center; justify-content: center;
	font-size: 0.85em; line-height: 1;
}
.accordion-phase.visible { display: flex; }
.accordion-phase-ok { color: #28a745; }
.accordion-phase-error { color: #dc3545; }
.accordion-phase-busy { color: #28a745; }
.accordion-phase-busy .phase-spinner {
	display: inline-block; width: 14px; height: 14px;
	border: 2px solid #28a745; border-top-color: transparent; border-radius: 50%;
	animation: phase-spin 0.8s linear infinite; vertical-align: middle;
}
@keyframes phase-spin {
	to { transform: rotate(360deg); }
}

.accordion-controls {
	display: flex; gap: 8px; margin-bottom: 12px; justify-content: flex-end;
}
.accordion-controls button {
	padding: 4px 10px; font-size: 0.82em; font-weight: 500; background: none;
	border: 1px solid #ccc; border-radius: 4px; color: #666; cursor: pointer; margin: 0;
}
.accordion-controls button:hover { background: #f0f0f0; border-color: #aaa; color: #333; }

label { display: block; font-weight: 600; margin-bottom: 4px; font-size: 0.9em; }
input[type="text"], input[type="password"], input[type="number"] {
	width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px;
	font-size: 0.95em; margin-bottom: 10px;
}
input[type="text"]:focus, input[type="password"]:focus, input[type="number"]:focus {
	outline: none; border-color: #4a90d9;
}

button {
	padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;
	font-size: 0.9em; font-weight: 600; margin-right: 8px; margin-bottom: 8px;
}
button.primary { background: #4a90d9; color: #fff; }
button.primary:hover { background: #357abd; }
button.secondary { background: #6c757d; color: #fff; }
button.secondary:hover { background: #5a6268; }
button.danger { background: #dc3545; color: #fff; }
button.danger:hover { background: #c82333; }
button.success { background: #28a745; color: #fff; }
button.success:hover { background: #218838; }
button:disabled { opacity: 0.5; cursor: not-allowed; }

.status { padding: 8px 12px; border-radius: 4px; margin-top: 10px; font-size: 0.9em; }
.status.ok { background: #d4edda; color: #155724; }
.status.error { background: #f8d7da; color: #721c24; }
.status.info { background: #d1ecf1; color: #0c5460; }
.status.warn { background: #fff3cd; color: #856404; }

.inline-group { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 10px; }
.inline-group > div { flex: 1; }

a { color: #4a90d9; }

select { background: #fff; width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95em; margin-bottom: 10px; }

.checkbox-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.checkbox-row input[type="checkbox"] { width: auto; margin: 0; }
.checkbox-row label { display: inline; margin: 0; font-weight: normal; cursor: pointer; }

/* Live Status Bar */
.live-status-bar {
	background: #fff; border-radius: 8px; margin-bottom: 16px;
	box-shadow: 0 1px 3px rgba(0,0,0,0.1);
	position: sticky; top: 0; z-index: 100; border-left: 4px solid #6c757d;
}
.live-status-bar.phase-idle { border-left-color: #6c757d; }
.live-status-bar.phase-disconnected { border-left-color: #dc3545; }
.live-status-bar.phase-ready { border-left-color: #4a90d9; }
.live-status-bar.phase-syncing { border-left-color: #28a745; }
.live-status-bar.phase-stopping { border-left-color: #ffc107; }
.live-status-bar.phase-complete { border-left-color: #28a745; }

.live-status-dot {
	width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
	background: #6c757d;
}
.live-status-bar.phase-idle .live-status-dot { background: #6c757d; }
.live-status-bar.phase-disconnected .live-status-dot { background: #dc3545; }
.live-status-bar.phase-ready .live-status-dot { background: #4a90d9; }
.live-status-bar.phase-syncing .live-status-dot {
	background: #28a745;
	animation: live-pulse 1.5s ease-in-out infinite;
}
.live-status-bar.phase-stopping .live-status-dot {
	background: #ffc107;
	animation: live-pulse 0.8s ease-in-out infinite;
}
.live-status-bar.phase-complete .live-status-dot { background: #28a745; }

@keyframes live-pulse {
	0%, 100% { opacity: 1; transform: scale(1); }
	50% { opacity: 0.4; transform: scale(0.8); }
}

.live-status-message { flex: 1; font-size: 0.92em; color: #333; line-height: 1.4; }

.live-status-meta {
	display: flex; gap: 16px; flex-shrink: 0; font-size: 0.82em; color: #666;
}
.live-status-meta-item { white-space: nowrap; }
.live-status-meta-item strong { color: #333; }

.live-status-progress-bar {
	height: 3px; background: #e9ecef; border-radius: 2px; overflow: hidden;
	position: absolute; bottom: 0; left: 0; right: 0;
}
.live-status-progress-fill {
	height: 100%; background: #28a745; transition: width 1s ease;
}
/* Expandable status bar */
.live-status-header {
	display: flex; align-items: center; gap: 14px; cursor: pointer;
	padding: 14px 20px; user-select: none;
}
.live-status-bar.expanded .live-status-header {
	border-bottom: 1px solid #e9ecef; padding-bottom: 10px;
}
.live-status-expand-toggle {
	flex: 0 0 20px; display: flex; align-items: center; justify-content: center;
	font-size: 0.7em; color: #888; transition: transform 0.25s;
}
.live-status-bar.expanded .live-status-expand-toggle { transform: rotate(180deg); }

.live-status-detail {
	padding: 12px 20px 16px; max-height: 60vh; overflow-y: auto;
}

/* Status Detail Summary Banner */
.status-detail-summary {
	display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
	padding: 8px 0 12px; margin-bottom: 12px; border-bottom: 1px solid #e9ecef;
}
.status-detail-summary-message {
	font-size: 0.92em; color: #333; font-weight: 600;
}
.status-detail-summary-counters {
	display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.82em; color: #666;
}

/* Status Detail Sections */
.status-detail-section { margin-bottom: 14px; }
.status-detail-section:last-child { margin-bottom: 0; }
.status-detail-section-title {
	font-size: 0.85em; font-weight: 600; color: #555; text-transform: uppercase;
	letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 4px;
	border-bottom: 1px solid #eee;
}

/* Running Operations */
.running-op-row {
	display: flex; align-items: center; gap: 12px; padding: 6px 0;
	font-size: 0.9em;
}
.running-op-name { font-weight: 600; min-width: 180px; }
.running-op-bar {
	flex: 1; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;
	min-width: 120px;
}
.running-op-bar-fill { height: 100%; background: #4a90d9; transition: width 0.5s ease; }
.running-op-count { font-size: 0.85em; color: #666; white-space: nowrap; }
.running-op-pending { color: #888; font-size: 0.85em; font-style: italic; padding: 4px 0; }

/* Completed Operations */
.completed-op-row { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.completed-op-row:last-child { border-bottom: none; }
.completed-op-header {
	display: flex; align-items: center; gap: 10px; font-size: 0.9em; margin-bottom: 4px;
}
.completed-op-name { font-weight: 600; }
.completed-op-stats { color: #666; font-size: 0.85em; }
.completed-op-checkmark { color: #28a745; }

/* Ratio Bar */
.ratio-bar-container {
	display: flex; height: 10px; border-radius: 5px; overflow: hidden;
	background: #e9ecef; margin: 4px 0;
}
.ratio-bar-segment { height: 100%; transition: width 0.5s ease; }
.ratio-bar-segment.unchanged { background: #6c757d; }
.ratio-bar-segment.new-records { background: #28a745; }
.ratio-bar-segment.updated { background: #4a90d9; }
.ratio-bar-segment.deleted { background: #dc3545; }
.ratio-bar-legend {
	display: flex; gap: 12px; font-size: 0.75em; color: #666; margin-top: 2px; flex-wrap: wrap;
}
.ratio-bar-legend-item { display: flex; align-items: center; gap: 4px; }
.ratio-bar-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ratio-bar-legend-dot.unchanged-dot { background: #6c757d; }
.ratio-bar-legend-dot.new-dot { background: #28a745; }
.ratio-bar-legend-dot.updated-dot { background: #4a90d9; }
.ratio-bar-legend-dot.deleted-dot { background: #dc3545; }

/* Error Operations */
.error-op-row { padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 0.9em; }
.error-op-row:last-child { border-bottom: none; }
.error-op-header { display: flex; align-items: center; gap: 8px; }
.error-op-name { font-weight: 600; color: #dc3545; }
.error-op-status { font-size: 0.82em; color: #dc3545; }
.error-op-message { font-size: 0.82em; color: #888; margin-top: 2px; padding-left: 18px; }
.error-op-log-entries {
	font-size: 0.78em; color: #888; margin-top: 4px; padding-left: 18px;
	font-family: monospace; max-height: 80px; overflow-y: auto;
}

/* Pre-count Table */
.precount-table {
	width: 100%; border-collapse: collapse; font-size: 0.88em;
}
.precount-table thead th {
	text-align: left; font-weight: 600; color: #555; font-size: 0.85em;
	text-transform: uppercase; letter-spacing: 0.3px;
	padding: 4px 8px 6px; border-bottom: 2px solid #e9ecef;
}
.precount-table tbody td {
	padding: 4px 8px; border-bottom: 1px solid #f0f0f0;
}
.precount-table tbody tr:last-child td { border-bottom: 1px solid #e9ecef; }
.precount-table tfoot td {
	padding: 6px 8px 2px; font-size: 0.95em;
}
.precount-error td { color: #dc3545; }
.precount-pending {
	color: #888; font-size: 0.85em; font-style: italic; padding: 8px 0 2px;
	display: flex; align-items: center; gap: 6px;
}
.precount-spinner {
	display: inline-block; width: 12px; height: 12px;
	border: 2px solid #ddd; border-top-color: #4a90d9;
	border-radius: 50%; animation: precount-spin 0.8s linear infinite;
}
@keyframes precount-spin { to { transform: rotate(360deg); } }
`,
	Templates:
	[
		{
			Hash: 'DataCloner-Layout',
			Template: /*html*/`
<h1>Retold Data Cloner</h1>

<!-- Live Status Bar (Expandable) -->
<div id="liveStatusBar" class="live-status-bar phase-idle" style="position:relative">
	<div class="live-status-header" onclick="pict.views['DataCloner-Layout'].toggleStatusDetail()">
		<div class="live-status-dot"></div>
		<div class="live-status-message" id="liveStatusMessage">Idle</div>
		<div class="live-status-meta" id="liveStatusMeta"></div>
		<div class="live-status-expand-toggle" id="liveStatusToggle">&#9660;</div>
	</div>
	<div class="live-status-detail" id="liveStatusDetail" style="display:none">
		<div id="DataCloner-Throughput-Histogram"></div>
		<div id="DataCloner-StatusDetail-Container"></div>
	</div>
	<div class="live-status-progress-bar"><div class="live-status-progress-fill" id="liveStatusProgressFill" style="width:0%"></div></div>
</div>

<!-- Expand / Collapse All -->
<div class="accordion-controls">
	<button onclick="pict.views['DataCloner-Layout'].expandAllSections()">Expand All</button>
	<button onclick="pict.views['DataCloner-Layout'].collapseAllSections()">Collapse All</button>
</div>

<!-- Section containers -->
<div id="DataCloner-Section-Connection"></div>
<div id="DataCloner-Section-Session"></div>
<div id="DataCloner-Section-Schema"></div>
<div id="DataCloner-Section-Deploy"></div>
<div id="DataCloner-Section-Sync"></div>
<div id="DataCloner-Section-Export"></div>
<div id="DataCloner-Section-ViewData"></div>
`
		}
	],
	Renderables:
	[
		{
			RenderableHash: 'DataCloner-Layout',
			TemplateHash: 'DataCloner-Layout',
			DestinationAddress: '#DataCloner-Application-Container'
		}
	]
};
