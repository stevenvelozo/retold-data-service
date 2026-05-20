'use strict';

/**
 * Bundle smoke tests — verifies `npm run build` produced both browser bundles
 * and each has the expected window-global identifier.
 */

const libFS   = require('fs');
const libPath = require('path');
const libChai = require('chai');

const Expect = libChai.expect;

suite('Built bundles', function ()
{
	test('comprehension-loader bundle is present and non-trivial', function ()
	{
		let tmpPath = libPath.resolve(__dirname, '../source/services/comprehension-loader/web/comprehension-loader.js');
		let tmpStat = libFS.statSync(tmpPath);
		Expect(tmpStat.size).to.be.greaterThan(10000, 'bundle should be > 10KB');
	});

	test('data-cloner bundle is present and non-trivial', function ()
	{
		let tmpPath = libPath.resolve(__dirname, '../source/services/data-cloner/web/data-cloner.js');
		let tmpStat = libFS.statSync(tmpPath);
		Expect(tmpStat.size).to.be.greaterThan(10000, 'bundle should be > 10KB');
	});

	test('comprehension-loader bundle exposes ComprehensionLoaderApplication', function ()
	{
		let tmpPath = libPath.resolve(__dirname, '../source/services/comprehension-loader/web/comprehension-loader.js');
		let tmpSrc = libFS.readFileSync(tmpPath, 'utf8');
		Expect(tmpSrc).to.include('ComprehensionLoaderApplication');
	});

	test('data-cloner bundle exposes DataClonerApplication', function ()
	{
		let tmpPath = libPath.resolve(__dirname, '../source/services/data-cloner/web/data-cloner.js');
		let tmpSrc = libFS.readFileSync(tmpPath, 'utf8');
		Expect(tmpSrc).to.include('DataClonerApplication');
	});
});
