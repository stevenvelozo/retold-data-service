# API Reference

Complete method reference for the `RetoldDataService` class.

## Class: RetoldDataService

Extends `fable-serviceproviderbase`. Registered as service type `'RetoldDataService'`.

**Source:** `source/Retold-Data-Service.js`

### Methods

| Method | Description |
|--------|-------------|
| [constructor](constructor.md) | Create a new RetoldDataService instance |
| [initializeService](initializeService.md) | Initialize the full service stack |
| [stopService](stopService.md) | Stop the Orator web server |
| [initializePersistenceEngine](initializePersistenceEngine.md) | Load the storage provider module |
| [initializeDataEndpoints](initializeDataEndpoints.md) | Load model and create DAL + endpoints |
| [onBeforeInitialize](onBeforeInitialize.md) | Pre-initialization lifecycle hook |
| [onInitialize](onInitialize.md) | Mid-initialization lifecycle hook |
| [onAfterInitialize](onAfterInitialize.md) | Post-initialization lifecycle hook |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `serviceType` | String | Always `'RetoldDataService'` |
| `serviceInitialized` | Boolean | Whether the service has been initialized |
| `fullModel` | Object/Boolean | The loaded Stricture model, or `false` before init |
| `entityList` | Array/Boolean | Array of entity names, or `false` before init |
| `_DAL` | Object | Map of entity name to Meadow DAL instance |
| `_MeadowEndpoints` | Object | Map of entity name to MeadowEndpoints controller |
| `fable.DAL` | Object | Same as `_DAL` (decorated on Fable) |
| `fable.MeadowEndpoints` | Object | Same as `_MeadowEndpoints` (decorated on Fable) |
