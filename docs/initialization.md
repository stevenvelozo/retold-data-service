# Initialization

Retold Data Service follows an ordered initialization sequence.  Understanding this sequence is key to customizing the service behavior.

## Basic Initialization

```javascript
const libFable = require('fable');
const libRetoldDataService = require('retold-data-service');

const _Fable = new libFable(settings);

// 1. Register the service type
_Fable.serviceManager.addServiceType('RetoldDataService', libRetoldDataService);

// 2. Instantiate the service with options
_Fable.serviceManager.instantiateServiceProvider('RetoldDataService', options);

// 3. Initialize the service
_Fable.RetoldDataService.initializeService(
    (pError) =>
    {
        if (pError) return console.error('Init failed:', pError);
        console.log('Ready!');
    });
```

## Initialization Sequence

When `initializeService()` is called, the following steps run in order:

```
1. onBeforeInitialize()       ← your custom hook
2. Start Orator web server    ← if AutoStartOrator is true
3. initializePersistenceEngine()  ← loads the storage provider module
4. onInitialize()             ← your custom hook
5. initializeDataEndpoints()  ← loads model, creates DAL + endpoints
6. onAfterInitialize()        ← your custom hook
```

### Step 5: initializeDataEndpoints()

This is the core step where the model is loaded and endpoints are created:

1. Load the compiled Stricture schema from `FullMeadowSchemaPath + FullMeadowSchemaFilename`
2. Extract the list of table names from `model.Tables`
3. For each table:
   - Create a Meadow DAL from the table's `MeadowSchema` package
   - Set the DAL's provider to the configured `StorageProvider`
   - Create a Meadow Endpoints controller for the DAL
   - Connect the endpoint routes to the Orator service server

## Double-Initialization Protection

Calling `initializeService()` a second time returns an error:

```javascript
_Fable.RetoldDataService.initializeService(
    (pError) =>
    {
        // pError.message: "Retold Data Service Application is being
        //                   initialized but has already been initialized..."
    });
```

## Stopping the Service

```javascript
_Fable.RetoldDataService.stopService(
    (pError) =>
    {
        if (pError) return console.error('Stop failed:', pError);
        console.log('Service stopped');
    });
```

Calling `stopService()` on an uninitialized service returns an error.
