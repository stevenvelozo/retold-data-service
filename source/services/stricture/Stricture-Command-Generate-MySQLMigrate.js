/**
 * Stricture Command - Generate MySQL Migrate
 *
 * POST /1.0/Retold/Stricture/Generate/MySQLMigrate
 *
 * Accepts a compiled stricture model and returns MySQL migration stubs.
 *
 * Body: { "Model": { "Tables": { ... }, ... } }
 * Returns: { "Files": { "Model-MigrateMySQL.sql": "INSERT INTO ... SELECT ..." } }
 */
module.exports = function(pStrictureService, pOratorServiceServer)
{
	pStrictureService.registerGenerateEndpoint(pOratorServiceServer, 'MySQLMigrate', require('stricture/source/Stricture-Generate-MySQL-Migrate.js'));
};
