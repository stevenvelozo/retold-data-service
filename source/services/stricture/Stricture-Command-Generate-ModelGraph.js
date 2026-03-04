/**
 * Stricture Command - Generate Model Graph
 *
 * POST /1.0/Retold/Stricture/Generate/ModelGraph
 *
 * Accepts a compiled stricture model and returns a GraphViz DOT relationship diagram.
 *
 * Body: { "Model": { "Tables": { ... }, ... } }
 * Returns: { "Files": { "Model-Relationships.dot": "digraph ..." } }
 */
module.exports = function(pStrictureService, pOratorServiceServer)
{
	pStrictureService.registerGenerateEndpoint(pOratorServiceServer, 'ModelGraph', require('stricture/source/Stricture-Generate-ModelGraph.js'));
};
