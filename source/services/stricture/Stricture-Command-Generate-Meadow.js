/**
 * Stricture Command - Generate Meadow
 *
 * POST /1.0/Retold/Stricture/Generate/Meadow
 *
 * Accepts a compiled stricture model and returns per-entity Meadow schema JSON files.
 *
 * Body: { "Model": { "Tables": { ... }, ... } }
 * Returns: { "Files": { "ModelBook.json": "{...}", "ModelAuthor.json": "{...}" } }
 */
module.exports = function(pStrictureService, pOratorServiceServer)
{
	pStrictureService.registerGenerateEndpoint(pOratorServiceServer, 'Meadow', require('stricture/source/Stricture-Generate-Meadow.js'));
};
