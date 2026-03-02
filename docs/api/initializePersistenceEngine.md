# initializePersistenceEngine

Dynamically loads and instantiates the configured storage provider module.

## Signature

`initializePersistenceEngine(fCallback)`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | Function | Callback `(pError)` when the provider is loaded |

## Behavior

Calls `fable.serviceManager.addAndInstantiateServiceType()` with:
- Service name: `Meadow{StorageProvider}Provider` (e.g. `MeadowMySQLProvider`)
- Module: `require(this.options.StorageProviderModule)`

This is called automatically during `initializeService()`. You typically do not call this directly.

## Supported Providers

| StorageProvider | StorageProviderModule | Fable Service Name |
|----------------|----------------------|-------------------|
| `MySQL` | `meadow-connection-mysql` | `MeadowMySQLProvider` |
| `SQLite` | `meadow-connection-sqlite` | `MeadowSQLiteProvider` |
| `MSSQL` | `meadow-connection-mssql` | `MeadowMSSQLProvider` |
| `PostgreSQL` | `meadow-connection-postgresql` | `MeadowPostgreSQLProvider` |
| `MongoDB` | `meadow-connection-mongodb` | `MeadowMongoDBProvider` |
| `DGraph` | `meadow-connection-dgraph` | `MeadowDGraphProvider` |
| `Solr` | `meadow-connection-solr` | `MeadowSolrProvider` |
| `ALASQL` | `meadow-connection-alasql` | `MeadowALASQLProvider` |
