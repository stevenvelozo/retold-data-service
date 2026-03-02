# API Reference

Complete method reference for the `RetoldDataService` class.

## Class: RetoldDataService

Extends `fable-serviceproviderbase`. Registered as service type `'RetoldDataService'`.

**Source:** `source/Retold-Data-Service.js`

### Methods

| Method | Description |
|--------|-------------|
| [constructor](api/constructor.md) | Create a new RetoldDataService instance |
| [initializeService](api/initializeService.md) | Initialize the full service stack |
| [stopService](api/stopService.md) | Stop the Orator web server |
| [initializePersistenceEngine](api/initializePersistenceEngine.md) | Load the storage provider module |
| [initializeDataEndpoints](api/initializeDataEndpoints.md) | Load model and create DAL + endpoints |
| [onBeforeInitialize](api/onBeforeInitialize.md) | Pre-initialization lifecycle hook |
| [onInitialize](api/onInitialize.md) | Mid-initialization lifecycle hook |
| [onAfterInitialize](api/onAfterInitialize.md) | Post-initialization lifecycle hook |

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
