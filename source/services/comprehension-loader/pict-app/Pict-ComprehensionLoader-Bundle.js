module.exports = { ComprehensionLoaderApplication: require('./Pict-Application-ComprehensionLoader.js') };

if (typeof(window) !== 'undefined')
{
	window.ComprehensionLoaderApplication = module.exports.ComprehensionLoaderApplication;
}
