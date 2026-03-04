/**
 * Stricture Command - Generate LaTeX Documentation
 *
 * POST /1.0/Retold/Stricture/Generate/LaTeX
 *
 * Accepts a compiled stricture model and returns LaTeX documentation files.
 *
 * Body: { "Model": { "Tables": { ... }, ... } }
 * Returns: { "Files": { "filename.tex": "..." } }
 */
module.exports = function(pStrictureService, pOratorServiceServer)
{
	pStrictureService.registerGenerateEndpoint(pOratorServiceServer, 'LaTeX', require('stricture/source/Stricture-Generate-LaTeX.js'));
};
