/**
 * Stricture Command - Generate Dictionary CSV
 *
 * POST /1.0/Retold/Stricture/Generate/DictionaryCSV
 *
 * Accepts a compiled stricture model and returns a CSV data dictionary.
 *
 * Body: { "Model": { "Tables": { ... }, ... } }
 * Returns: { "Files": { "DataDictionary.csv": "..." } }
 */
module.exports = function(pStrictureService, pOratorServiceServer)
{
	pStrictureService.registerGenerateEndpoint(pOratorServiceServer, 'DictionaryCSV', require('stricture/source/Stricture-Generate-DictionaryCSV.js'));
};
