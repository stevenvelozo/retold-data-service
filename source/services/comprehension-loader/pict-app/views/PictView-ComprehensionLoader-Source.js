const libPictView = require('pict-view');

class ComprehensionLoaderSourceView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender()
	{
		// Restore source mode and toggle UI
		let tmpSourceMode = localStorage.getItem('comprehensionLoader_comprehensionSourceMode');
		if (tmpSourceMode === 'file')
		{
			let tmpFileRadio = document.getElementById('sourceMode_file');
			if (tmpFileRadio) tmpFileRadio.checked = true;
		}
		this.onSourceModeChange();
	}

	onSourceModeChange()
	{
		let tmpMode = document.querySelector('input[name="comprehensionSourceMode"]:checked');
		let tmpModeName = tmpMode ? tmpMode.value : 'url';

		let tmpURLSection = document.getElementById('sourceURLSection');
		let tmpFileSection = document.getElementById('sourceFileSection');

		if (tmpURLSection) tmpURLSection.style.display = tmpModeName === 'url' ? '' : 'none';
		if (tmpFileSection) tmpFileSection.style.display = tmpModeName === 'file' ? '' : 'none';

		this.pict.providers.ComprehensionLoader.updateAllPreviews();
	}

	fetchFromURL()
	{
		let tmpURL = document.getElementById('comprehensionURL').value.trim();
		if (!tmpURL)
		{
			this.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Comprehension URL is required.', 'error');
			return;
		}

		this.pict.providers.ComprehensionLoader.setSectionPhase(3, 'busy');
		this.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Fetching comprehension...', 'info');

		let tmpSelf = this;

		// Try browser fetch first, fall back to server proxy on CORS failure
		fetch(tmpURL)
			.then(function(pResponse)
			{
				if (!pResponse.ok) throw new Error('HTTP ' + pResponse.status);
				return pResponse.json();
			})
			.then(function(pData)
			{
				tmpSelf.sendComprehensionToServer(pData);
			})
			.catch(function(pError)
			{
				// CORS or network error — try server-side proxy
				tmpSelf.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Direct fetch failed (' + pError.message + '), trying server proxy...', 'info');
				tmpSelf.pict.providers.ComprehensionLoader.api('POST', '/comprehension_load/comprehension/proxy-fetch', { URL: tmpURL })
					.then(function(pProxyData)
					{
						if (pProxyData.Success)
						{
							tmpSelf.pict.providers.ComprehensionLoader.setStatus('sourceStatus',
								'Loaded via proxy: ' + pProxyData.EntityCount + ' entities, ' + tmpSelf.pict.providers.ComprehensionLoader.formatNumber(pProxyData.TotalRecords) + ' records.', 'ok');
							tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(3, 'ok');
							tmpSelf.renderComprehensionSummary(pProxyData);
						}
						else
						{
							tmpSelf.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Proxy fetch failed: ' + (pProxyData.Error || 'Unknown error'), 'error');
							tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(3, 'error');
						}
					})
					.catch(function(pProxyError)
					{
						tmpSelf.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Proxy request failed: ' + pProxyError.message, 'error');
						tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(3, 'error');
					});
			});
	}

	loadFromFiles()
	{
		let tmpFileInput = document.getElementById('comprehensionFiles');
		if (!tmpFileInput || tmpFileInput.files.length === 0)
		{
			this.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Please select one or more JSON files.', 'error');
			return;
		}

		this.pict.providers.ComprehensionLoader.setSectionPhase(3, 'busy');
		this.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Reading files...', 'info');

		let tmpSelf = this;
		let tmpFiles = tmpFileInput.files;
		let tmpMergedData = {};
		let tmpFilesRead = 0;

		for (let i = 0; i < tmpFiles.length; i++)
		{
			(function(pFile)
			{
				let tmpReader = new FileReader();
				tmpReader.onload = function(pEvent)
				{
					try
					{
						let tmpParsed = JSON.parse(pEvent.target.result);

						// Merge entity keys from this file into the merged data
						let tmpKeys = Object.keys(tmpParsed);
						for (let k = 0; k < tmpKeys.length; k++)
						{
							let tmpKey = tmpKeys[k];
							if (Array.isArray(tmpParsed[tmpKey]))
							{
								if (!tmpMergedData[tmpKey])
								{
									tmpMergedData[tmpKey] = [];
								}
								tmpMergedData[tmpKey] = tmpMergedData[tmpKey].concat(tmpParsed[tmpKey]);
							}
							else
							{
								tmpMergedData[tmpKey] = tmpParsed[tmpKey];
							}
						}
					}
					catch (pParseError)
					{
						tmpSelf.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Error parsing ' + pFile.name + ': ' + pParseError.message, 'error');
						tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(3, 'error');
						return;
					}

					tmpFilesRead++;
					if (tmpFilesRead === tmpFiles.length)
					{
						// All files read — send merged comprehension to server
						tmpSelf.sendComprehensionToServer(tmpMergedData);
					}
				};
				tmpReader.onerror = function()
				{
					tmpSelf.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Error reading ' + pFile.name, 'error');
					tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(3, 'error');
				};
				tmpReader.readAsText(pFile);
			})(tmpFiles[i]);
		}
	}

	sendComprehensionToServer(pData)
	{
		let tmpSelf = this;
		this.pict.providers.ComprehensionLoader.api('POST', '/comprehension_load/comprehension/receive', { Comprehension: pData })
			.then(function(pResult)
			{
				if (pResult.Success)
				{
					tmpSelf.pict.providers.ComprehensionLoader.setStatus('sourceStatus',
						'Loaded: ' + pResult.EntityCount + ' entities, ' + tmpSelf.pict.providers.ComprehensionLoader.formatNumber(pResult.TotalRecords) + ' records.', 'ok');
					tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(3, 'ok');
					tmpSelf.renderComprehensionSummary(pResult);
				}
				else
				{
					tmpSelf.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Failed: ' + (pResult.Error || 'Unknown error'), 'error');
					tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(3, 'error');
				}
			})
			.catch(function(pError)
			{
				tmpSelf.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Request failed: ' + pError.message, 'error');
				tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(3, 'error');
			});
	}

	renderComprehensionSummary(pResult)
	{
		let tmpContainer = document.getElementById('comprehensionSummary');
		if (!tmpContainer) return;

		let tmpHtml = '<table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:0.9em">';
		tmpHtml += '<thead><tr><th style="text-align:left; padding:6px 12px; border-bottom:2px solid #ddd">Entity</th>';
		tmpHtml += '<th style="text-align:right; padding:6px 12px; border-bottom:2px solid #ddd">Records</th></tr></thead>';
		tmpHtml += '<tbody>';

		let tmpEntityList = pResult.EntityList || [];
		let tmpRecordCounts = pResult.RecordCounts || {};
		for (let i = 0; i < tmpEntityList.length; i++)
		{
			let tmpName = tmpEntityList[i];
			let tmpCount = tmpRecordCounts[tmpName] || 0;
			tmpHtml += '<tr>';
			tmpHtml += '<td style="padding:4px 12px; border-bottom:1px solid #f0f0f0">' + this.pict.providers.ComprehensionLoader.escapeHtml(tmpName) + '</td>';
			tmpHtml += '<td style="padding:4px 12px; border-bottom:1px solid #f0f0f0; text-align:right; font-variant-numeric:tabular-nums">' + this.pict.providers.ComprehensionLoader.formatNumber(tmpCount) + '</td>';
			tmpHtml += '</tr>';
		}

		tmpHtml += '</tbody>';
		tmpHtml += '<tfoot><tr>';
		tmpHtml += '<td style="padding:6px 12px; font-weight:600">Total</td>';
		tmpHtml += '<td style="padding:6px 12px; text-align:right; font-weight:600; font-variant-numeric:tabular-nums">' + this.pict.providers.ComprehensionLoader.formatNumber(pResult.TotalRecords) + '</td>';
		tmpHtml += '</tr></tfoot>';
		tmpHtml += '</table>';

		tmpContainer.innerHTML = tmpHtml;
		tmpContainer.style.display = '';
	}

	clearComprehension()
	{
		let tmpSelf = this;
		this.pict.providers.ComprehensionLoader.api('POST', '/comprehension_load/comprehension/clear')
			.then(function(pData)
			{
				if (pData.Success)
				{
					tmpSelf.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Comprehension data cleared.', 'info');
					tmpSelf.pict.providers.ComprehensionLoader.setSectionPhase(3, '');
					let tmpContainer = document.getElementById('comprehensionSummary');
					if (tmpContainer)
					{
						tmpContainer.innerHTML = '';
						tmpContainer.style.display = 'none';
					}
				}
			})
			.catch(function(pError)
			{
				tmpSelf.pict.providers.ComprehensionLoader.setStatus('sourceStatus', 'Request failed: ' + pError.message, 'error');
			});
	}

	goAction()
	{
		let tmpMode = document.querySelector('input[name="comprehensionSourceMode"]:checked');
		let tmpModeName = tmpMode ? tmpMode.value : 'url';

		if (tmpModeName === 'url')
		{
			this.fetchFromURL();
		}
		else
		{
			this.loadFromFiles();
		}
	}
}

module.exports = ComprehensionLoaderSourceView;

module.exports.default_configuration =
{
	ViewIdentifier: 'ComprehensionLoader-Source',
	DefaultRenderable: 'ComprehensionLoader-Source',
	DefaultDestinationAddress: '#ComprehensionLoader-Section-Source',
	Templates:
	[
		{
			Hash: 'ComprehensionLoader-Source',
			Template: /*html*/`
<div class="accordion-row">
	<div class="accordion-number">3</div>
	<div class="accordion-card" id="section3" data-section="3">
		<div class="accordion-header" onclick="pict.views['ComprehensionLoader-Layout'].toggleSection('section3')">
			<div class="accordion-title">Comprehension Source</div>
			<span class="accordion-phase" id="phase3"></span>
			<div class="accordion-preview" id="preview3">Provide a comprehension JSON URL or upload files</div>
			<div class="accordion-actions">
				<span class="accordion-go" onclick="event.stopPropagation(); pict.views['ComprehensionLoader-Source'].goAction()">go</span>
				<label class="accordion-auto" onclick="event.stopPropagation()"><input type="checkbox" id="auto3"> <span class="auto-label">auto</span></label>
			</div>
			<div class="accordion-toggle">&#9660;</div>
		</div>
		<div class="accordion-body">
			<div style="margin-bottom:12px">
				<label style="margin-bottom:6px">Source Mode</label>
				<div style="display:flex; gap:16px; align-items:center">
					<label style="font-weight:normal; margin:0; cursor:pointer">
						<input type="radio" name="comprehensionSourceMode" id="sourceMode_url" value="url" checked onchange="pict.views['ComprehensionLoader-Source'].onSourceModeChange()"> URL
						<span style="color:#888; font-size:0.85em">(fetch from a URL)</span>
					</label>
					<label style="font-weight:normal; margin:0; cursor:pointer">
						<input type="radio" name="comprehensionSourceMode" id="sourceMode_file" value="file" onchange="pict.views['ComprehensionLoader-Source'].onSourceModeChange()"> File Upload
						<span style="color:#888; font-size:0.85em">(load JSON from local files)</span>
					</label>
				</div>
			</div>

			<div id="sourceURLSection">
				<label for="comprehensionURL">Comprehension JSON URL</label>
				<input type="text" id="comprehensionURL" placeholder="http://example.com/comprehension.json">
				<button class="primary" onclick="pict.views['ComprehensionLoader-Source'].fetchFromURL()">Fetch Comprehension</button>
			</div>

			<div id="sourceFileSection" style="display:none">
				<label for="comprehensionFiles">Comprehension JSON File(s)</label>
				<input type="file" id="comprehensionFiles" multiple accept=".json" style="margin-bottom:10px">
				<div style="font-size:0.8em; color:#888; margin-bottom:10px">Multiple files will be merged (entity keys combined).</div>
				<button class="primary" onclick="pict.views['ComprehensionLoader-Source'].loadFromFiles()">Load Files</button>
			</div>

			<button class="secondary" onclick="pict.views['ComprehensionLoader-Source'].clearComprehension()" style="margin-left:0">Clear Comprehension</button>
			<div id="sourceStatus"></div>

			<div id="comprehensionSummary" style="display:none"></div>
		</div>
	</div>
</div>
`
		}
	],
	Renderables:
	[
		{
			RenderableHash: 'ComprehensionLoader-Source',
			TemplateHash: 'ComprehensionLoader-Source',
			DestinationAddress: '#ComprehensionLoader-Section-Source'
		}
	]
};
