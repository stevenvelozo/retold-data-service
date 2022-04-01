// ##### Part of the **[retold](https://stevenvelozo.github.io/retold/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/
const libMySQL = require('mysql2');
const libRetoldProviderHelperBase = require('./Meadow-Provider-Helper-Base');
/**
* Retold MySQL Helper
*
* @class RetoldProviderHelperMySQL
*/
class RetoldProviderHelperMySQL extends libRetoldProviderHelperBase
{
	constructor(pFable)
	{
		this._Fable = pFable;
	}

	// Connect to the server
	connect()
	{
		this._Fable.log.info(`...Creating SQL Connection pools at [${_Fable.settings.MySQL.Server}]...`,_Fable.settings.MySQL);
		// Setup SQL Connection Pool
		_Fable.MeadowMySQLConnectionPool = libMySQL.createPool
			(
				{
					connectionLimit: _Fable.settings.MySQL.ConnectionPoolLimit,
					host: _Fable.settings.MySQL.Server,
					port: _Fable.settings.MySQL.Port,
					user: _Fable.settings.MySQL.User,
					password: _Fable.settings.MySQL.Password,
					database: _Fable.settings.MySQL.Database,
					namedPlaceholders: true
				}
			);
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

module.exports = RetoldProviderHelperMySQL;