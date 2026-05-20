'use strict';

/**
 * ComprehensionLoader bootstrap smoke tests.
 *
 * Verifies: (1) the Application class loads, (2) instantiation registers
 * all expected views without throwing, (3) the Shell view's render()
 * actually emits HTML into the application container.
 *
 * The async lifecycle (status polling, persistence load, etc.) is NOT
 * exercised here — that requires real fetch + localStorage backends and
 * isn't what a "smoke" check should hang on. Constructor + a single
 * shell-render pass is enough to prove the wiring compiles and runs.
 */

const { JSDOM } = require('jsdom');

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');
const libApp = require('../source/services/comprehension-loader/pict-app/Pict-Application-ComprehensionLoader.js');

suite('Comprehension Loader — bootstrap smoke', function ()
{
	setup(function ()
	{
		// Each test gets its own fresh DOM. Multiple smoke-test files share
		// the global namespace; setting up here (not at module load) means
		// the DOM matches the suite that's currently running.
		let tmpDOM = new JSDOM(
			'<!doctype html><html><body>'
			+ '<div id="ComprehensionLoader-Application-Container"></div>'
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
			'ComprehensionLoader-Layout',
			'ComprehensionLoader-Session',
			'ComprehensionLoader-Schema',
			'ComprehensionLoader-Source',
			'ComprehensionLoader-Load',
			'ComprehensionLoader-StatusHistogram',
			'ComprehensionLoader-Shell',
			'ComprehensionLoader-TopBar-Nav',
			'ComprehensionLoader-TopBar-User',
			'ComprehensionLoader-StatusBar',
			'ComprehensionLoader-StatusDetail',
			'ComprehensionLoader-SettingsPanel'
		];
		for (let i = 0; i < tmpExpectedViews.length; i++)
		{
			Expect(tmpPict.views[tmpExpectedViews[i]],
				'expected view ' + tmpExpectedViews[i] + ' to be registered').to.exist;
		}

		Expect(tmpPict.providers['Theme-Section'],
			'Theme-Section provider should be registered').to.exist;
		Expect(tmpPict.providers.ComprehensionLoader).to.exist;
	});

	test('Shell view renders HTML into the application container', function ()
	{
		let tmpPict = new libPict({ LogStreams: [{ streamtype: 'null', level: 'error' }] });
		new libApp(tmpPict, libApp.default_configuration);

		// Render only the shell — avoids triggering the live-status poll setInterval.
		tmpPict.views['ComprehensionLoader-Shell'].render();

		let tmpContainer = global.document.getElementById('ComprehensionLoader-Application-Container');
		Expect(tmpContainer).to.not.be.null;
		Expect(tmpContainer.innerHTML.length).to.be.greaterThan(30,
			'application container should have non-trivial HTML after shell render');
		Expect(tmpContainer.innerHTML).to.include('ComprehensionLoader-Shell-Mount');
	});
});
