# constructor

Create a new RetoldDataService instance with merged default and custom options.

## Signature

`constructor(pFable, pOptions, pServiceHash)`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pFable` | Fable | The Fable application instance |
| `pOptions` | Object | Service configuration options |
| `pServiceHash` | String | Optional service hash identifier |

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `StorageProvider` | String | `'MySQL'` | Meadow provider name |
| `StorageProviderModule` | String | `'meadow-connection-mysql'` | npm module for the provider |
| `FullMeadowSchemaPath` | String | `process.cwd() + '/model/'` | Path to compiled schema |
| `FullMeadowSchemaFilename` | String | `'MeadowModel-Extended.json'` | Schema filename |
| `AutoInitializeDataService` | Boolean | `true` | Auto-initialize on construction |
| `AutoStartOrator` | Boolean | `true` | Start Orator web server during init |

## What Happens

1. Merges default options with provided `pOptions`
2. Registers `OratorServiceServer` (Restify) as a Fable service
3. Registers `Orator` as a Fable service
4. Creates an internal Meadow instance
5. Creates empty `_DAL` and `_MeadowEndpoints` maps
6. Decorates `fable.DAL` and `fable.MeadowEndpoints` with these maps
7. Sets `serviceInitialized = false`

## Example

```javascript
const libFable = require('fable');
const libRetoldDataService = require('retold-data-service');

const _Fable = new libFable(
	{
		APIServerPort: 8086,
		MySQL:
		{
			Server: '127.0.0.1',
			Port: 3306,
			User: 'root',
			Password: 'secret',
			Database: 'bookstore',
			ConnectionPoolLimit: 20
		},
		MeadowConnectionMySQLAutoConnect: true
	});

_Fable.serviceManager.addServiceType('RetoldDataService', libRetoldDataService);
_Fable.serviceManager.instantiateServiceProvider('RetoldDataService',
	{
		StorageProvider: 'MySQL',
		StorageProviderModule: 'meadow-connection-mysql',
		FullMeadowSchemaPath: `${__dirname}/model/`,
		FullMeadowSchemaFilename: 'MeadowModel-Extended.json'
	});
```
