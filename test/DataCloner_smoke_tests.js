'use strict';

/**
 * DataCloner bootstrap smoke tests — parallel to the ComprehensionLoader
 * smoke suite. See that file for rationale.
 */

const { JSDOM } = require('jsdom');

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');
const libApp = require('../source/services/data-cloner/pict-app/Pict-Application-DataCloner.js');

suite('Data Cloner — bootstrap smoke', function ()
{
	setup(function ()
	{
		let tmpDOM = new JSDOM(
			'<!doctype html><html><body>'
			+ '<div id="DataCloner-Application-Container"></div>'
			+ '<style id="PICT-CSS"></style>'
			+ '</body></html>',
			{ url: 'http://localhost/' });
		global.window = tmpDOM.window;
		global.document = tmpDOM.window.document;
		global.localStorage = tmpDOM.window.localStorage;
	});

	test('Application class loads as a function with a default_configuration', function ()
	{
		Expect(libApp).to.be.a('function');
		Expect(libApp.default_configuration).to.be.an('object');
	});

	test('Instantiation registers all theme + shell views without throwing', function ()
	{
		let tmpPict = new libPict({ LogStreams: [{ streamtype: 'null', level: 'error' }] });
		let tmpInstance = new libApp(tmpPict, libApp.default_configuration);
		Expect(tmpInstance).to.exist;

		let tmpExpectedViews =
		[
			'Pict-Section-Modal',
			'DataCloner-Layout',
			'DataCloner-Connection',
			'DataCloner-Session',
			'DataCloner-Schema',
			'DataCloner-Deploy',
			'DataCloner-Sync',
			'DataCloner-Export',
			'DataCloner-ViewData',
			'DataCloner-StatusHistogram',
			'PictSection-ConnectionForm',
			'DataCloner-Shell',
			'DataCloner-TopBar-Nav',
			'DataCloner-TopBar-User',
			'DataCloner-StatusBar',
			'DataCloner-StatusDetail',
			'DataCloner-SettingsPanel'
		];
		for (let i = 0; i < tmpExpectedViews.length; i++)
		{
			Expect(tmpPict.views[tmpExpectedViews[i]],
				'expected view ' + tmpExpectedViews[i] + ' to be registered').to.exist;
		}

		Expect(tmpPict.providers['Theme-Section'],
			'Theme-Section provider should be registered').to.exist;
		Expect(tmpPict.providers.DataCloner).to.exist;
	});

	test('Shell view renders HTML into the application container', function ()
	{
		let tmpPict = new libPict({ LogStreams: [{ streamtype: 'null', level: 'error' }] });
		new libApp(tmpPict, libApp.default_configuration);

		tmpPict.views['DataCloner-Shell'].render();

		let tmpContainer = global.document.getElementById('DataCloner-Application-Container');
		Expect(tmpContainer).to.not.be.null;
		Expect(tmpContainer.innerHTML.length).to.be.greaterThan(30,
			'application container should have non-trivial HTML after shell render');
		Expect(tmpContainer.innerHTML).to.include('DataCloner-Shell-Mount');
	});
});
