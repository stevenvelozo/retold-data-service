/**
 * Stricture Command - Generate Markdown Documentation
 *
 * POST /1.0/Retold/Stricture/Generate/Markdown
 *
 * Accepts a compiled stricture model and returns Markdown documentation files.
 *
 * Body: { "Model": { "Tables": { ... }, ... } }
 * Returns: { "Files": { "Dictionary.md": "...", "Model-Book.md": "...", "ModelChangeTracking.md": "..." } }
 */
module.exports = function(pStrictureService, pOratorServiceServer)
{
	pStrictureService.registerGenerateEndpoint(pOratorServiceServer, 'Markdown', require('stricture/source/Stricture-Generate-Markdown.js'));
};
