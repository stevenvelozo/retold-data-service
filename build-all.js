#!/usr/bin/env node
/**
 * Build every web app in this package.
 *
 * Quackage reads `.quackage.json` from CWD with no `--config` flag, so to
 * build the two apps we swap that file between runs. The original
 * `.quackage.json` is restored even if a build fails.
 *
 * Apps are listed in `_Apps` — add a row for each new web app:
 *   { Name: <label>, Config: <relative-path-to-its-quackage-config-file> }
 *
 * The primary config (`.quackage.json`) acts as the default state — the
 * runner restores it from a backup taken at start.
 */
'use strict';

const libFS    = require('fs');
const libChild = require('child_process');

const _PrimaryConfig = '.quackage.json';
const _Apps =
[
	{ Name: 'data-cloner',          Config: '.quackage.json' },
	{ Name: 'comprehension-loader', Config: '.quackage-comprehension-loader.json' }
];

let tmpBackup = null;
let tmpExitCode = 0;

try
{
	tmpBackup = libFS.readFileSync(_PrimaryConfig, 'utf8');

	for (let i = 0; i < _Apps.length; i++)
	{
		let tmpApp = _Apps[i];
		if (tmpApp.Config !== _PrimaryConfig)
		{
			libFS.writeFileSync(_PrimaryConfig, libFS.readFileSync(tmpApp.Config, 'utf8'));
		}
		else
		{
			libFS.writeFileSync(_PrimaryConfig, tmpBackup);
		}
		console.log('\n=== Building ' + tmpApp.Name + ' (config: ' + tmpApp.Config + ') ===\n');
		libChild.execSync('npx quack build', { stdio: 'inherit' });
	}
}
catch (pError)
{
	console.error('\nbuild-all: build failed — ' + pError.message);
	tmpExitCode = 1;
}
finally
{
	if (tmpBackup !== null)
	{
		libFS.writeFileSync(_PrimaryConfig, tmpBackup);
	}
}

if (tmpExitCode === 0)
{
	console.log('\nAll bundles built.');
}
process.exit(tmpExitCode);
