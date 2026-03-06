/**
 * DataCloner Provider Registry
 *
 * Maps provider names to their module names and fable service names.
 *
 * @author Steven Velozo <steven@velozo.com>
 */

const _ProviderRegistry = {
	SQLite: { moduleName: 'meadow-connection-sqlite', serviceName: 'MeadowSQLiteProvider', configKey: 'SQLite' },
	MySQL: { moduleName: 'meadow-connection-mysql', serviceName: 'MeadowMySQLProvider', configKey: 'MySQL' },
	MSSQL: { moduleName: 'meadow-connection-mssql', serviceName: 'MeadowMSSQLProvider', configKey: 'MSSQL' },
	PostgreSQL: { moduleName: 'meadow-connection-postgresql', serviceName: 'MeadowConnectionPostgreSQL', configKey: 'PostgreSQL' },
	Solr: { moduleName: 'meadow-connection-solr', serviceName: 'MeadowConnectionSolr', configKey: 'Solr' },
	MongoDB: { moduleName: 'meadow-connection-mongodb', serviceName: 'MeadowConnectionMongoDB', configKey: 'MongoDB' },
	RocksDB: { moduleName: 'meadow-connection-rocksdb', serviceName: 'MeadowConnectionRocksDB', configKey: 'RocksDB' },
	Bibliograph: { moduleName: 'bibliograph', serviceName: 'Bibliograph', configKey: 'Bibliograph' },
};

module.exports = _ProviderRegistry;
