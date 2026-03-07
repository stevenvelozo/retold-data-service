module.exports = { DataClonerApplication: require('./Pict-Application-DataCloner.js') };

if (typeof(window) !== 'undefined')
{
	window.DataClonerApplication = module.exports.DataClonerApplication;
}
