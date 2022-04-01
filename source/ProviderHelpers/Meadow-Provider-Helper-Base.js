// ##### Part of the **[retold](https://stevenvelozo.github.io/retold/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/
/**
* Retold Base Helper
*
* @class RetoldProviderHelperBase
*/
class RetoldProviderHelperBase
{
	constructor(pFable)
	{
		this._Fable = pFable;
	}

	// Connect to the server
	connect()
	{
		this._Fable.log.info(`...no connection operation on base Meadow Provider Helper`);
	}

	// Create database (this deals with its own connections and closes them)
	createDatabase()
	{
		this._Fable.log.info(`...no database creation operation on base Meadow Provider Helper`);
	}

	// Create tables if they don't exist (this deals with its own connections and closes them)
	createTables()
	{
		this._Fable.log.info(`...no table creation operation on base Meadow Provider Helper`);
	}

	// Update tables to match schemas (this deals with its own connections and closes them)
	// TODO: This requires some additional features in stricture.
	updateTables()
	{
		this._Fable.log.info(`...no table update operation on base Meadow Provider Helper`);
	}
}

module.exports = RetoldProviderHelperBase;