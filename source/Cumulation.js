/**
* @license MIT
* @author <steven@velozo.com>
*/
const libGraphGet = require('./GraphGet.js');

/**
* Cumulation browser sync library
*
* @class Cumulation
*/
class Cumulation
{
	constructor(pFable, pRequestSettings, pModel)
	{
		this._Dependencies = {};
		this._Dependencies.underscore = require('underscore');
		this._Dependencies.simpleget = require('simple-get');
		this._Dependencies.cookie = require('cookie');
		this._Dependencies.cumulation = this;

        // We want to make sure these are unique settings trees for each Cumulation object created.
		this._RequestSettings = JSON.parse(JSON.stringify(this._Dependencies.underscore.extend(JSON.parse(JSON.stringify(require('./Cumulation-Settings-Default.js'))), pSettings)));

		// This has behaviors similar to bunyan, for consistency
		this._Log = pFable.log;
	}

	/**
	 * 
	 * GET RECORDS (plural)
	 * 
	**/
	getRecordsFromServerGeneric (pEntity, pRecordsString, fCallback)
	{
		let tmpCallBack = (typeof(fCallback) === 'function') ? fCallback : ()=>{};
		let tmpURL = this._RequestSettings.Server+pEntity+'s/'+pRecordsString;
		let tmpRequestOptions = (
		{
			url: tmpURL,
			headers: JSON.parse(JSON.stringify(this._RequestSettings.Headers))
		});

		let tmpCookies = [];
		Object.keys(this._RequestSettings.Cookies).forEach((pKey)=>
			{
				tmpCookies.push(this._Dependencies.cookie.serialize(pKey, this._RequestSettings.Cookies[pKey]));
			});
		if (tmpCookies.length > 0)
			tmpRequestOptions.headers.cookie = tmpCookies.join(';');

		if (this._RequestSettings.DebugLog)
			this._Log.debug(`Beginning GET plural request`,tmpRequestOptions);
		let tmpRequestTime = this._Log.getTimeStamp();

		this._Dependencies.simpleget.get(tmpRequestOptions, (pError, pResponse)=>
			{
				if (pError)
				{
					return tmpCallBack(pError);
				}
				if (this._RequestSettings.DebugLog)
					this._Log.debug(`--> GET plural connected in ${this._Log.getTimeDelta(tmpRequestTime)}ms code ${pResponse.statusCode}`);

				let tmpData = '';

				pResponse.on('data', (pChunk)=>
					{
						if (this._RequestSettings.DebugLog)
							this._Log.debug(`--> GET plural data chunk size ${pChunk.length}b received in ${this._Log.getTimeDelta(tmpRequestTime)}ms`);
						tmpData += pChunk;
					});

				pResponse.on('end', ()=>
					{
						let tmpResult = null;
						if (tmpData)
							tmpResult = JSON.parse(tmpData);
						if (this._RequestSettings.DebugLog)
						{
							//this._Log.debug(`==> GET plural completed data size ${tmpData.length}b received in ${this._Log.getTimeDelta(tmpRequestTime)}ms`,tmpResult);
							this._Log.debug(`==> GET plural completed data size ${tmpData.length}b (${tmpResult.length} records) received in ${this._Log.getTimeDelta(tmpRequestTime)}ms`);
						}
						tmpCallBack(pError, tmpResult);
					});
			});
	};
};

module.exports = Cumulation;