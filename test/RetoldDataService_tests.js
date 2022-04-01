/**
* Unit tests for Fable
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

var Chai = require("chai");
var Expect = Chai.expect;
var Assert = Chai.assert;

var libRetoldDataService = require('../source/Retold-Data-Service.js');

suite
(
	'Retold Data Service',
	function()
	{
		setup ( () => {} );

		suite
		(
			'Object Sanity',
			function()
			{
				test
				(
					'The class should initialize itself into a happy little object.',
					function()
					{
						testService = new libRetoldDataService({"Product":"SimpleInitializationTest"});

						// Instantiate the logger
						Expect(testService).to.be.an('object', 'The data service should initialize as an object directly from the require statement and minimal configuration.');
						Expect(testService).to.have.a.property('log')
							.that.is.a('object');
						Expect(testService).to.have.a.property('settings')
							.that.is.a('object');
						Expect(testService).to.have.a.property('fable')
							.that.is.a('object');
						Expect(testService).to.have.a.property('orator')
							.that.is.a('object');
						Expect(testService.settings.Product)
							.to.equal('SimpleInitializationTest')
					}
				);
				test
				(
					'Change some settings later...',
					function(fDone)
					{
						testService = new libRetoldDataService({"Product":"SimpleSettingsTest"});

						Expect(testService).to.have.a.property('settings')
							.that.is.a('object');
						Expect(testService.settings.Product)
							.to.equal('SimpleSettingsTest');
						Expect(testService.settings.ProductVersion)
							.to.equal('0.0.0');
						// Now change a setting by merging in something new
						testService.fable.settingsManager.merge({Product:'TestProduct'});
						Expect(testService.settings.Product)
							.to.equal('TestProduct');
						Expect(testService.settings.ProductVersion)
							.to.equal('0.0.0');
						fDone();
					}
				);
			}
		);
	}
);