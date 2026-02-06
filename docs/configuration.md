# Configuration

Retold Data Service accepts options during instantiation that control model loading, storage provider selection, and server behavior.

## Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `StorageProvider` | String | `'MySQL'` | Meadow provider name (`MySQL`, `SQLite`, `MSSQL`, `ALASQL`) |
| `StorageProviderModule` | String | `'meadow-connection-mysql'` | npm module name for the storage provider |
| `FullMeadowSchemaPath` | String | `${process.cwd()}/model/` | Directory path where the compiled schema lives |
| `FullMeadowSchemaFilename` | String | `'MeadowModel-Extended.json'` | Filename of the compiled Stricture schema |
| `AutoInitializeDataService` | Boolean | `true` | Whether to auto-initialize on construction |
| `AutoStartOrator` | Boolean | `true` | Whether to start the Orator web server during initialization |

## Fable Settings

The Fable instance configuration controls server port and database connection:

```javascript
{
    Product: 'MyApp',
    APIServerPort: 8086,

    // For MySQL
    MySQL: {
        Server: '127.0.0.1',
        Port: 3306,
        User: 'root',
        Password: 'secret',
        Database: 'mydb',
        ConnectionPoolLimit: 20
    },
    MeadowConnectionMySQLAutoConnect: true,

    // For SQLite
    SQLite: {
        SQLiteFilePath: './data/myapp.db'
    }
}
```

## Example: MySQL Configuration

```javascript
_Fable.serviceManager.instantiateServiceProvider('RetoldDataService', {
    FullMeadowSchemaPath: `${__dirname}/model/`,
    FullMeadowSchemaFilename: 'MeadowModel-Extended.json',
    StorageProvider: 'MySQL',
    StorageProviderModule: 'meadow-connection-mysql',
    AutoStartOrator: true
});
```

## Example: SQLite Configuration

```javascript
// Register the SQLite provider before creating the data service
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');
_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');

_Fable.MeadowSQLiteProvider.connectAsync(
    (pError) =>
    {
        _Fable.serviceManager.instantiateServiceProvider('RetoldDataService', {
            FullMeadowSchemaPath: `${__dirname}/model/`,
            FullMeadowSchemaFilename: 'MeadowModel-Extended.json',
            StorageProvider: 'SQLite',
            StorageProviderModule: 'meadow-connection-sqlite',
            AutoStartOrator: true
        });
    });
```

## Example: Disabling Auto-Start

```javascript
_Fable.serviceManager.instantiateServiceProvider('RetoldDataService', {
    FullMeadowSchemaPath: `${__dirname}/model/`,
    FullMeadowSchemaFilename: 'MeadowModel-Extended.json',
    AutoStartOrator: false
});

// Manually start later
_Fable.RetoldDataService.initializeService(
    (pError) =>
    {
        // Service initialized without starting the web server
        // Start it manually when ready:
        _Fable.Orator.startService(() => console.log('Server started'));
    });
```
