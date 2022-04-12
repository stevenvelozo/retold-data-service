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
		super(pFable);
	}

	// Connect to the server
	connect()
	{
		this._Fable.log.info(`...Creating SQL Connection pools at [${this._Fable.settings.MySQL.Server}]...`,this._Fable.settings.MySQL);
		// Setup SQL Connection Pool
		// TODO: try/catch/finally
		this._Fable.MeadowMySQLConnectionPool = libMySQL.createPool
			(
				{
					connectionLimit: this._Fable.settings.MySQL.ConnectionPoolLimit,
					host: this._Fable.settings.MySQL.Server,
					port: this._Fable.settings.MySQL.Port,
					user: this._Fable.settings.MySQL.User,
					password: this._Fable.settings.MySQL.Password,
					database: this._Fable.settings.MySQL.Database,
					namedPlaceholders: true
				}
			);
		
		return true;
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