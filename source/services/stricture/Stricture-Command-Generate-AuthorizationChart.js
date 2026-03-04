/**
 * Stricture Command - Generate Authorization Chart
 *
 * POST /1.0/Retold/Stricture/Generate/AuthorizationChart
 *
 * Accepts a compiled stricture model and returns an authorization chart document.
 *
 * Body: { "Model": { "Tables": { ... }, "Authorization": { ... }, ... } }
 * Returns: { "Files": { ... } }
 */
module.exports = function(pStrictureService, pOratorServiceServer)
{
	pStrictureService.registerGenerateEndpoint(pOratorServiceServer, 'AuthorizationChart', require('stricture/source/Stricture-Generate-Authorization-Chart.js'));
};
