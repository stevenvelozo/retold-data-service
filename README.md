# Retold Data Service

> An all-in-one Fable service that turns a Stricture schema into a complete REST API

Retold Data Service combines Meadow (data access), Orator (API server), and Meadow Endpoints (REST routes) into a single service provider. Point it at a compiled Stricture model and it auto-generates typed CRUD endpoints for every entity -- complete with filtering, pagination, soft deletes, and behavior injection hooks.

## Features

- **Zero-Boilerplate REST** - Define your schema once, get full CRUD endpoints for every entity automatically
- **Provider-Agnostic** - Swap between MySQL, MSSQL, SQLite, or ALASQL without changing application code
- **Schema-Driven** - Stricture DDL compiles into a model that drives endpoint generation, validation, and defaults
- **Lifecycle Hooks** - `onBeforeInitialize`, `onInitialize`, and `onAfterInitialize` for custom startup logic
- **Behavior Injection** - Pre- and post-operation hooks on every CRUD operation for custom business logic
- **DAL Access** - Direct programmatic data access alongside the REST endpoints for server-side logic
- **Fable Service Provider** - First-class service in the Fable ecosystem with logging, configuration, and DI
- **Double-Init Protection** - Guards against accidental re-initialization

## Quick Start

```javascript
const libFable = require('fable');
const libRetoldDataService = require('retold-data-service');

const _Fable = new libFable({
	APIServerPort: 8086,
	MySQL: {
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

_Fable.serviceManager.instantiateServiceProvider('RetoldDataService', {
	StorageProvider: 'MySQL',
	StorageProviderModule: 'meadow-connection-mysql',
	FullMeadowSchemaPath: `${__dirname}/model/`,
	FullMeadowSchemaFilename: 'MeadowModel-Extended.json'
});

_Fable.RetoldDataService.initializeService(
	(pError) =>
	{
		if (pError)
		{
			return console.log('Error initializing data service:', pError);
		}
		console.log('REST API is running on port 8086');
	});
```

## Installation

```bash
npm install retold-data-service
```

## How It Works

Retold Data Service orchestrates the full Meadow stack into a single initialization sequence:

```
Fable (Core)
  └── Retold Data Service
        ├── Orator (API Server)
        │     └── Restify (HTTP Engine)
        ├── Meadow (Data Access Layer)
        │     ├── Schema (from compiled Stricture model)
        │     ├── FoxHound (Query DSL)
        │     └── Provider (MySQL / MSSQL / SQLite / ALASQL)
        └── Meadow Endpoints (REST Routes)
              ├── Create   POST   /1.0/Entity
              ├── Read     GET    /1.0/Entity/:ID
              ├── Reads    GET    /1.0/Entities/:Begin/:Cap
              ├── Update   PUT    /1.0/Entity
              ├── Delete   DELETE /1.0/Entity/:ID
              ├── Count    GET    /1.0/Entities/Count
              ├── Schema   GET    /1.0/Entity/Schema
              └── New      GET    /1.0/Entity/Schema/New
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `StorageProvider` | `'MySQL'` | Database provider name |
| `StorageProviderModule` | `'meadow-connection-mysql'` | Node module for the provider |
| `FullMeadowSchemaPath` | `process.cwd() + '/model/'` | Path to the compiled schema |
| `FullMeadowSchemaFilename` | `'MeadowModel-Extended.json'` | Compiled model filename |
| `AutoStartOrator` | `true` | Start the HTTP server automatically |
| `APIServerPort` | `8080` | Port for the HTTP server |

## SQLite Example

For embedded or test scenarios, use the in-memory SQLite provider:

```javascript
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');

const _Fable = new libFable({
	APIServerPort: 8086,
	SQLite: { SQLiteFilePath: ':memory:' }
});

_Fable.serviceManager.addServiceType('RetoldDataService', libRetoldDataService);
_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

_Fable.MeadowSQLiteProvider.connectAsync(
	(pError) =>
	{
		_Fable.serviceManager.instantiateServiceProvider('RetoldDataService', {
			StorageProvider: 'SQLite',
			StorageProviderModule: 'meadow-connection-sqlite',
			FullMeadowSchemaPath: `${__dirname}/model/`,
			FullMeadowSchemaFilename: 'MeadowModel-Extended.json'
		});

		_Fable.RetoldDataService.initializeService(
			(pError) =>
			{
				console.log('REST API running with in-memory SQLite');
			});
	});
```

## Behavior Injection

Add custom logic before or after any CRUD operation:

```javascript
_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
	'Create-PreOperation',
	(pRequest, pRequestState, fRequestComplete) =>
	{
		if (!pRequestState.RecordToCreate.Title)
		{
			pRequest.CommonServices.sendCodedResponse(
				pRequestState.response, 400, 'Title is required');
			return fRequestComplete(true);
		}
		return fRequestComplete(false);
	});
```

## Lifecycle Hooks

Customize initialization by subclassing:

```javascript
class MyDataService extends libRetoldDataService
{
	onAfterInitialize(fCallback)
	{
		this.fable.log.info('Injecting custom behaviors...');
		this.fable.MeadowEndpoints.Book.controller.BehaviorInjection
			.setBehavior('Read-PostOperation', myCustomHook);
		return fCallback();
	}
}
```

## DAL Access

Query data directly alongside the REST endpoints:

```javascript
let tmpQuery = _Fable.DAL.Book.query
	.addFilter('Genre', 'Science Fiction')
	.addSort({ Column: 'PublicationYear', Direction: 'Descending' })
	.setCap(25)
	.setBegin(0);

_Fable.DAL.Book.doReads(tmpQuery,
	(pError, pQuery, pRecords) =>
	{
		console.log(`Found ${pRecords.length} sci-fi books`);
	});
```

## Backplane Endpoints

For dynamic model loading at runtime, Retold Data Service provides backplane endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/BackPlane/:Version/Load/MeadowModel` | POST | Load a full Meadow model |
| `/BackPlane/:Version/Load/MeadowSchema` | POST | Load a Meadow entity schema |
| `/BackPlane/:Version/Load/StrictureDDL` | POST | Load and compile a Stricture DDL |
| `/BackPlane/:Version/Model/Primary/` | GET | Get the primary service model |
| `/BackPlane/:Version/Model/Composite/` | GET | Get composite models |
| `/BackPlane/:Version/Settings` | POST | Merge in provider settings |
| `/BackPlane/:Version/SetProvider/:Name` | GET | Set the default provider |
| `/BackPlane/:Version/SetProvider/:Name/:Entity` | GET | Set a per-entity provider |

## Testing

```bash
npm test
```

Tests use an in-memory SQLite provider and require no external database server.

## Documentation

Detailed documentation is available in the `docs/` folder and can be served locally:

```bash
npx docsify-cli serve docs
```

## Related Packages

- [meadow](https://github.com/stevenvelozo/meadow) - Data access and ORM
- [meadow-endpoints](https://github.com/stevenvelozo/meadow-endpoints) - Auto-generated REST endpoints
- [orator](https://github.com/stevenvelozo/orator) - API server abstraction
- [fable](https://github.com/stevenvelozo/fable) - Application services framework

## License

MIT

## Contributing

Pull requests are welcome. For details on our code of conduct, contribution process, and testing requirements, see the [Retold Contributing Guide](https://github.com/stevenvelozo/retold/blob/main/docs/contributing.md).
