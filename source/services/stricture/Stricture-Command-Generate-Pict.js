/**
 * Stricture Command - Generate Pict
 *
 * POST /1.0/Retold/Stricture/Generate/Pict
 *
 * Accepts a compiled stricture model and returns PICT UI model definitions.
 *
 * Body: { "Model": { "Tables": { ... }, ... } }
 * Returns: { "Files": { "Model.json": "{...}" } }
 */
module.exports = function(pStrictureService, pOratorServiceServer)
{
	pStrictureService.registerGenerateEndpoint(pOratorServiceServer, 'Pict', require('stricture/source/Stricture-Generate-Pict.js'));
};
