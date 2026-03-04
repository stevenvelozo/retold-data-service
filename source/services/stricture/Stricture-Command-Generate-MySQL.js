/**
 * Stricture Command - Generate MySQL
 *
 * POST /1.0/Retold/Stricture/Generate/MySQL
 *
 * Accepts a compiled stricture model and returns MySQL CREATE TABLE statements.
 *
 * Body: { "Model": { "Tables": { ... }, ... } }
 * Returns: { "Files": { "Model.mysql.sql": "CREATE TABLE ..." } }
 */
module.exports = function(pStrictureService, pOratorServiceServer)
{
	pStrictureService.registerGenerateEndpoint(pOratorServiceServer, 'MySQL', require('stricture/source/Stricture-Generate-MySQL.js'));
};
