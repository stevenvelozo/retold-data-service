/**
 * Retold Data Service - Meadow Integration Service
 *
 * Fable service that exposes meadow-integration capabilities via REST
 * endpoints under /1.0/Retold/MeadowIntegration/.
 *
 * Uses a dedicated Pict instance (which extends Fable with parseTemplate,
 * ExpressionParser, CSVParser, etc.) for integration operations.
 *
 * @author Steven Velozo <steven@velozo.com>
 */
const libFableServiceProviderBase = require('fable-serviceproviderbase');

const libPict = require('pict');
const libPath = require('path');

// Resolve the meadow-integration package root so we can require internal files
const _MeadowIntegrationBase = libPath.dirname(require.resolve('meadow-integration/package.json'));

// Require meadow-integration service providers from their resolved paths
const libTabularCheck = require(libPath.join(_MeadowIntegrationBase, 'source/services/tabular/Service-TabularCheck.js'));
const libTabularTransform = require(libPath.join(_MeadowIntegrationBase, 'source/services/tabular/Service-TabularTransform.js'));
const libIntegrationAdapter = require(libPath.join(_MeadowIntegrationBase, 'source/Meadow-Service-Integration-Adapter.js'));

const _RoutePrefix = '/1.0/Retold/MeadowIntegration';

class RetoldDataServiceMeadowIntegration extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.serviceType = 'RetoldDataServiceMeadowIntegration';

		// Create a dedicated Pict instance for integration operations.
		// Pict extends Fable with parseTemplate, ExpressionParser, CSVParser,
		// DataFormat, and other features required by meadow-integration services.
		this._Pict = new libPict(
			{
				Product: 'RetoldDataServiceMeadowIntegration',
				LogStreams: pFable.settings.LogStreams || [{ streamtype: 'console' }]
			});

		// Pre-initialize built-in Pict services used by integration operations
		this._Pict.instantiateServiceProvider('CSVParser');
		this._Pict.instantiateServiceProvider('FilePersistence');
		this._Pict.instantiateServiceProvider('DataGeneration');

		// Register meadow-integration service types on the Pict instance
		this._Pict.addAndInstantiateServiceTypeIfNotExists('MeadowIntegrationTabularCheck', libTabularCheck);
		this._Pict.addAndInstantiateServiceTypeIfNotExists('MeadowIntegrationTabularTransform', libTabularTransform);
	}

	/**
	 * The Pict instance used for integration operations.
	 * Command files use this to access parseTemplate, CSVParser,
	 * TabularCheck, TabularTransform, etc.
	 */
	get pict()
	{
		return this._Pict;
	}

	/**
	 * The route prefix for all MeadowIntegration endpoints.
	 */
	get routePrefix()
	{
		return _RoutePrefix;
	}

	/**
	 * The Integration Adapter class (used by ComprehensionPush).
	 */
	get IntegrationAdapter()
	{
		return libIntegrationAdapter;
	}

	/**
	 * Register all meadow integration REST routes on the Orator service server.
	 *
	 * @param {Object} pOratorServiceServer - The Orator ServiceServer instance
	 */
	connectRoutes(pOratorServiceServer)
	{
		// CSV operations
		require('./MeadowIntegration-Command-CSVCheck.js')(this, pOratorServiceServer);
		require('./MeadowIntegration-Command-CSVTransform.js')(this, pOratorServiceServer);

		// TSV operations
		require('./MeadowIntegration-Command-TSVCheck.js')(this, pOratorServiceServer);
		require('./MeadowIntegration-Command-TSVTransform.js')(this, pOratorServiceServer);

		// JSON Array operations
		require('./MeadowIntegration-Command-JSONArrayTransform.js')(this, pOratorServiceServer);

		// Comprehension operations
		require('./MeadowIntegration-Command-ComprehensionIntersect.js')(this, pOratorServiceServer);
		require('./MeadowIntegration-Command-ComprehensionToArray.js')(this, pOratorServiceServer);
		require('./MeadowIntegration-Command-ComprehensionToCSV.js')(this, pOratorServiceServer);
		require('./MeadowIntegration-Command-ComprehensionPush.js')(this, pOratorServiceServer);

		// Entity operations
		require('./MeadowIntegration-Command-EntityFromTabularFolder.js')(this, pOratorServiceServer);

		this.fable.log.info('Retold Data Service Meadow Integration routes registered.');
	}
}

module.exports = RetoldDataServiceMeadowIntegration;
module.exports.serviceType = 'RetoldDataServiceMeadowIntegration';
module.exports.default_configuration = {};
