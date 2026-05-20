'use strict';

// Located at source/services/. Apps live one level deeper at
// source/services/<app>/pict-app/. The package.json is two levels up.
const tmpPackage = require('../../package.json');

if (!tmpPackage.retold || !tmpPackage.retold.brand)
{
	throw new Error('retold-data-service: package.json is missing retold.brand — '
		+ 'run `npm run brand` (which calls pict-section-theme-brand) before building');
}

module.exports = tmpPackage.retold.brand;
