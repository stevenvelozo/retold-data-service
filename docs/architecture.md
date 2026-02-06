# Architecture

Retold Data Service orchestrates several Retold modules into a unified service that turns a schema into a running API.

## Component Stack

```
┌─────────────────────────────────────────────┐
│            Your Application Code            │
│   - Configure options                       │
│   - Override lifecycle hooks                 │
│   - Inject behaviors                        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          Retold Data Service                │
│   - Loads Stricture model                   │
│   - Creates DAL per entity                  │
│   - Creates MeadowEndpoints per entity      │
│   - Manages service lifecycle               │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              Orator (API Server)            │
│   - HTTP server via Restify                 │
│   - Route registration                      │
│   - Request handling                        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Meadow Endpoints (REST Layer)       │
│   - CRUD route handlers                     │
│   - Behavior injection hooks                │
│   - Session management                      │
│   - Authorization enforcement               │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│            Meadow (Data Access)             │
│   - Schema management                       │
│   - Query building via FoxHound             │
│   - Provider-based query execution          │
│   - Audit stamping and soft deletes         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          Storage Provider                   │
│   MySQL │ SQLite │ MSSQL │ ALASQL          │
└─────────────────────────────────────────────┘
```

## How It Works

1. **Registration** — `RetoldDataService` is registered with Fable's service manager and instantiated with options
2. **Server Setup** — Orator and its Restify service server are registered and configured
3. **Initialization** — calling `initializeService()` triggers an ordered sequence:
   - `onBeforeInitialize()` — your custom pre-initialization logic
   - Orator web server start (if `AutoStartOrator` is true)
   - Persistence engine initialization (loads the storage provider module)
   - `onInitialize()` — your custom initialization logic
   - Data endpoint initialization (loads model, creates DALs and endpoints)
   - `onAfterInitialize()` — your custom post-initialization logic
4. **Serving** — the Restify server listens for HTTP requests and routes them through Meadow Endpoints to the DAL

## Key Objects

After initialization, these objects are available on the Fable instance:

| Object | Type | Description |
|--------|------|-------------|
| `fable.RetoldDataService` | Service | The data service instance |
| `fable.Orator` | Service | The Orator API server |
| `fable.OratorServiceServer` | Service | The Restify server |
| `fable.DAL.<Entity>` | Meadow | DAL for each entity in the model |
| `fable.MeadowEndpoints.<Entity>` | MeadowEndpoints | Endpoint controller for each entity |

## Service Provider Pattern

Retold Data Service follows the Fable service provider pattern:

```javascript
const libFableServiceProviderBase = require('fable-serviceproviderbase');

class RetoldDataService extends libFableServiceProviderBase
{
    constructor(pFable, pOptions, pServiceHash)
    {
        super(pFable, pOptions, pServiceHash);
        this.serviceType = 'RetoldDataService';
    }
}
```

This means it inherits logging, configuration access, and service lifecycle management from the base class.
