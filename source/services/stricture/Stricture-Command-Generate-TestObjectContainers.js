/**
 * Stricture Command - Generate Test Object Containers
 *
 * POST /1.0/Retold/Stricture/Generate/TestObjectContainers
 *
 * Accepts a compiled stricture model and returns per-entity test fixture JSON files.
 *
 * Body: { "Model": { "Tables": { ... }, ... } }
 * Returns: { "Files": { "TestObjectContainer-Book.json": "[{...}, ...]", ... } }
 */
module.exports = function(pStrictureService, pOratorServiceServer)
{
	pStrictureService.registerGenerateEndpoint(pOratorServiceServer, 'TestObjectContainers', require('stricture/source/Stricture-Generate-TestObjectContainers.js'));
};
