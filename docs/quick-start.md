# Quick Start

## Installation

```bash
npm install retold-data-service
```

You will also need a compiled Stricture schema (`MeadowModel-Extended.json`) for your data model.  See the [Schema Definition](schema-definition.md) guide for details on creating one.

## MySQL Quick Start

This example creates a Retold Data Service backed by MySQL:

```javascript
const libFable = require('fable');
const libRetoldDataService = require('retold-data-service');

// 1. Create a Fable instance with MySQL configuration
let tmpSettings = (
	{
		Product: 'BookStoreAPI',
		ProductVersion: '1.0.0',
		APIServerPort: 8086,
		MySQL:
			{
				Server: '127.0.0.1',
				Port: 3306,
				User: 'root',
				Password: '',
				Database: 'bookstore',
				ConnectionPoolLimit: 20
			},
		MeadowConnectionMySQLAutoConnect: true
	});

let _Fable = new libFable(tmpSettings);

// 2. Register the RetoldDataService service type
_Fable.serviceManager.addServiceType('RetoldDataService', libRetoldDataService);

// 3. Instantiate the service with options pointing to your compiled schema
let _DataService = _Fable.serviceManager.instantiateServiceProvider('RetoldDataService',
	{
		FullMeadowSchemaPath: `${__dirname}/model/`,
		FullMeadowSchemaFilename: 'MeadowModel-Extended.json',
		StorageProvider: 'MySQL',
		StorageProviderModule: 'meadow-connection-mysql',
		AutoStartOrator: true
	});

// 4. Initialize the service -- this starts the web server and creates all endpoints
_DataService.initializeService(
	(pError) =>
	{
		if (pError)
		{
			return console.error('Startup failed:', pError);
		}
		console.log('Data service running on port 8086');
	});
```

## SQLite Quick Start

For embedded use, testing, or rapid prototyping, use SQLite with an in-memory database:

```javascript
const libFable = require('fable');
const libRetoldDataService = require('retold-data-service');
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');

let tmpSettings = (
	{
		Product: 'BookStoreTest',
		ProductVersion: '1.0.0',
		APIServerPort: 9329,
		SQLite:
			{
				SQLiteFilePath: ':memory:'
			}
	});

let _Fable = new libFable(tmpSettings);

// Register and connect the SQLite provider before initializing the data service
_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

_Fable.MeadowSQLiteProvider.connectAsync(
	(pError) =>
	{
		if (pError)
		{
			return console.error('SQLite connection failed:', pError);
		}

		// Register and instantiate the data service with SQLite options
		_Fable.serviceManager.addServiceType('RetoldDataService', libRetoldDataService);
		let _DataService = _Fable.serviceManager.instantiateServiceProvider('RetoldDataService',
			{
				FullMeadowSchemaPath: `${__dirname}/model/`,
				FullMeadowSchemaFilename: 'MeadowModel-Extended.json',
				StorageProvider: 'SQLite',
				StorageProviderModule: 'meadow-connection-sqlite',
				AutoStartOrator: true
			});

		_DataService.initializeService(
			(pError) =>
			{
				if (pError)
				{
					return console.error('Startup failed:', pError);
				}
				console.log('Data service running with in-memory SQLite');
			});
	});
```

> **Note:** For SQLite you need to install `meadow-connection-sqlite` as a dependency:
> ```bash
> npm install meadow-connection-sqlite
> ```

## What Happens

After `initializeService` completes, the following are available:

- **REST API** listening on the configured port (default `8086`)
- **`fable.DAL.<Entity>`** for each entity in your Stricture schema -- direct data access layer objects for programmatic queries
- **`fable.MeadowEndpoints.<Entity>`** for each entity -- endpoint controllers with behavior injection support
- **8 CRUD endpoints per entity**, automatically mapped:

| Method | Route | Description |
|--------|-------|-------------|
| GET | `1.0/<Entity>/<ID>` | Read a single record by ID |
| GET | `1.0/<Entities>` | Read all records |
| GET | `1.0/<Entities>/<Begin>/<Cap>` | Read records with pagination |
| GET | `1.0/<Entities>/FilteredTo/<Filter>` | Read records matching a filter |
| GET | `1.0/<Entities>/Count` | Count all records |
| POST | `1.0/<Entity>` | Create a new record |
| PUT | `1.0/<Entity>` | Update an existing record |
| DELETE | `1.0/<Entity>/<ID>` | Soft-delete a record |

Additional endpoints include schema introspection (`GET 1.0/<Entity>/Schema`) and default record generation (`GET 1.0/<Entity>/Schema/New`).

## Verify It Works

Once the service is running, test it with curl:

```bash
# Read all Books (paginated, first 10)
curl http://localhost:8086/1.0/Books/0/10

# Read a single Book by ID
curl http://localhost:8086/1.0/Book/1

# Count all Books
curl http://localhost:8086/1.0/Books/Count

# Get the schema for Book
curl http://localhost:8086/1.0/Book/Schema

# Create a new Book
curl -X POST http://localhost:8086/1.0/Book \
	-H "Content-Type: application/json" \
	-d '{"Title": "Dune", "Genre": "Science Fiction", "PublicationYear": 1965}'
```
