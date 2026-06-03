# Lifecycle Hooks

Retold Data Service provides three lifecycle hooks that you can override to customize initialization behavior.

## Available Hooks

| Hook | Fires | Use Case |
|------|-------|----------|
| `onBeforeInitialize(fCallback)` | Before Orator starts and before the persistence engine loads | Environment checks, early configuration |
| `onInitialize(fCallback)` | After Orator starts and persistence engine loads, before data endpoints are created | Register additional services, run migrations |
| `onAfterInitialize(fCallback)` | After all data endpoints are created and routes are connected | Post-startup tasks, inject behaviors, warm caches |

## Overriding Hooks

You can override the hooks by subclassing `RetoldDataService`:

```javascript
const libRetoldDataService = require('retold-data-service');

class MyDataService extends libRetoldDataService
{
    onBeforeInitialize(fCallback)
    {
        this.fable.log.info('Custom pre-initialization...');
        // Perform environment validation, load configs, etc.
        return fCallback();
    }

    onInitialize(fCallback)
    {
        this.fable.log.info('Custom initialization...');
        // Run database migrations, register extra services, etc.
        return fCallback();
    }

    onAfterInitialize(fCallback)
    {
        this.fable.log.info('Custom post-initialization...');
        // Inject behaviors, seed data, start background tasks, etc.
        this.fable.MeadowEndpoints.Book.controller.BehaviorInjection
            .setBehavior('Read-PostOperation', myCustomHook);
        return fCallback();
    }
}
```

## Hook Execution Order

<!-- bespoke diagram: edit diagrams/hook-execution-order.mmd or .hints.json, then: npx pict-renderer-graph build modules/meadow/retold-data-service/docs -->
![Hook Execution Order](diagrams/hook-execution-order.svg)

## Error Handling

If any hook or step passes an error to its callback, the initialization chain stops and the error is passed to the `initializeService` callback:

```javascript
onInitialize(fCallback)
{
    // Signal an error to stop initialization
    return fCallback(new Error('Database migration failed'));
}
```
