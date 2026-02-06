# Storage Providers

Retold Data Service supports any Meadow-compatible storage provider.  The provider is configured through the `StorageProvider` and `StorageProviderModule` options.

## Available Providers

| Provider | Module | Best For |
|----------|--------|----------|
| MySQL | `meadow-connection-mysql` | Production web applications |
| SQLite | `meadow-connection-sqlite` | Embedded apps, testing, single-server deployments |
| MSSQL | `meadow-connection-mssql` | Enterprise SQL Server environments |
| ALASQL | Built into Meadow | In-memory / browser-side usage |

## MySQL Setup

MySQL is the default provider.

```javascript
const settings = {
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
};

const _Fable = new libFable(settings);

_Fable.serviceManager.instantiateServiceProvider('RetoldDataService', {
    StorageProvider: 'MySQL',
    StorageProviderModule: 'meadow-connection-mysql',
    FullMeadowSchemaPath: `${__dirname}/model/`,
    FullMeadowSchemaFilename: 'MeadowModel-Extended.json'
});
```

## SQLite Setup

SQLite requires pre-registering the connection provider before creating the data service:

```javascript
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');

const settings = {
    APIServerPort: 8086,
    SQLite: { SQLiteFilePath: './data/app.db' }
};

const _Fable = new libFable(settings);

// Register and connect SQLite before creating the data service
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

        _Fable.RetoldDataService.initializeService(callback);
    });
```

For in-memory testing, use `':memory:'` as the SQLite file path:

```javascript
SQLite: { SQLiteFilePath: ':memory:' }
```

## MSSQL Setup

```javascript
const settings = {
    APIServerPort: 8086,
    MSSQL: {
        Server: '127.0.0.1',
        Port: 1433,
        User: 'sa',
        Password: 'YourPassword123',
        Database: 'mydb'
    }
};

_Fable.serviceManager.instantiateServiceProvider('RetoldDataService', {
    StorageProvider: 'MSSQL',
    StorageProviderModule: 'meadow-connection-mssql',
    FullMeadowSchemaPath: `${__dirname}/model/`,
    FullMeadowSchemaFilename: 'MeadowModel-Extended.json'
});
```

## Changing the Provider at Runtime

After initialization, each entity's provider can be changed individually:

```javascript
_Fable.DAL.Book.setProvider('MySQL');
_Fable.DAL.Author.setProvider('SQLite');
```
