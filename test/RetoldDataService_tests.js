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

const libFable = require('fable');

const _Settings = require(`./model/fable-configuration.json`);

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
					'Change some settings later...',
					function(fDone)
					{
						_Fable = new libFable(_Settings);
						_Fable.serviceManager.addServiceType('RetoldDataService', require('../source/Retold-Data-Service.js'));
						let tmpRetoldDataService = _Fable.serviceManager.instantiateServiceProvider('RetoldDataService',
							{
								FullMeadowSchemaPath: `${process.cwd()}/test/model/`,
								DALMeadowSchemaPath: `${process.cwd()}/test/model/meadow/`,
						
								AutoInitializeDataService: true,
								AutoStartOrator: true
							});

						tmpRetoldDataService.initializeService(
							()=>
							{
								// The data service created an orator
								_Fable.Orator.stopService(fDone);
							});
					}
				);
			}
		);
	}
);