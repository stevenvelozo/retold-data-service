# Retold Data Service

Retold Data Service is an all-in-one module that combines Fable, Meadow, Orator, and Meadow Endpoints into a single service.  Given a compiled Stricture schema, it automatically creates a data access layer (DAL) and RESTful API endpoints for every entity in your model.

## Features

- **Schema-Driven** — load a compiled Stricture model and get full CRUD endpoints for every table automatically
- **Pluggable Storage** — configure any Meadow-compatible provider (MySQL, SQLite, MSSQL, ALASQL) via options
- **Fable Service** — extends `fable-serviceproviderbase`, integrating with the Fable ecosystem for logging, configuration, and service management
- **Lifecycle Hooks** — override `onBeforeInitialize`, `onInitialize`, and `onAfterInitialize` for custom startup logic
- **Behavior Injection** — add pre- and post-operation hooks to any CRUD endpoint
- **DAL Access** — query your data directly through `fable.DAL.<Entity>` for programmatic access alongside the REST API
- **Auto-Start** — optionally start the Orator web server automatically on initialization

## Quick Start

```javascript
const libFable = require('fable');
const libRetoldDataService = require('retold-data-service');

const _Fable = new libFable({
    Product: 'MyApp',
    APIServerPort: 8086,
    MySQL: {
        Server: '127.0.0.1',
        Port: 3306,
        User: 'root',
        Password: 'secret',
        Database: 'mydb',
        ConnectionPoolLimit: 20
    },
    MeadowConnectionMySQLAutoConnect: true
});

_Fable.serviceManager.addServiceType('RetoldDataService', libRetoldDataService);
_Fable.serviceManager.instantiateServiceProvider('RetoldDataService', {
    FullMeadowSchemaPath: `${__dirname}/model/`,
    FullMeadowSchemaFilename: 'MeadowModel-Extended.json',
    StorageProvider: 'MySQL',
    StorageProviderModule: 'meadow-connection-mysql',
    AutoStartOrator: true
});

_Fable.RetoldDataService.initializeService(
    (pError) =>
    {
        if (pError) return console.error('Startup failed:', pError);
        console.log('Data service running on port 8086');
    });
```

## Installation

```bash
npm install retold-data-service
```

## Related Packages

| Package | Purpose |
|---------|---------|
| [fable](https://github.com/stevenvelozo/fable) | Core service framework |
| [meadow](https://github.com/stevenvelozo/meadow) | Data access layer and ORM |
| [foxhound](https://github.com/stevenvelozo/foxhound) | Query DSL for SQL generation |
| [meadow-endpoints](https://github.com/stevenvelozo/meadow-endpoints) | REST endpoint generation |
| [orator](https://github.com/stevenvelozo/orator) | API server abstraction |
| [stricture](https://github.com/stevenvelozo/stricture) | Schema definition DDL compiler |
| [retold-harness](https://github.com/stevenvelozo/retold-harness) | Application harness using Retold Data Service |

## Testing

```bash
npm test
```

Tests run against an in-memory SQLite database and require no external services.
