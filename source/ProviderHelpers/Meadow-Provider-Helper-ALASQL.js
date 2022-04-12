// ##### Part of the **[retold](https://stevenvelozo.github.io/retold/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/
const libALASQL = require('alasql');
const libRetoldProviderHelperBase = require('./Meadow-Provider-Helper-Base');
/**
* Retold MySQL Helper
*
* @class RetoldProviderHelperMySQL
*/
class RetoldProviderHelperALASQL extends libRetoldProviderHelperBase
{
	constructor(pFable)
	{
		super(pFable);
	}

	// Connect to the server
	connect()
	{
		this._Fable.log.info(`...Initializing the ALASQL in-memory database...`,_Fable.settings.MySQL);
		// Mapping in the provider is simple for our in-memory data store!
		this._Fable.ALASQL = libALASQL;
	}

	// Create database (this deals with its own connections and closes them)
	createDatabase()
	{

	}

	// Create tables if they don't exist (this deals with its own connections and closes them)
	createTables()
	{

	}

	// Update tables to match schemas (this deals with its own connections and closes them)
	// TODO: This requires some additional features in stricture.
	updateTables()
	{

	}
}

module.exports = RetoldProviderHelperALASQL;