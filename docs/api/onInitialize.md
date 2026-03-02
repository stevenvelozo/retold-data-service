# onInitialize

Lifecycle hook called after Orator starts and the persistence engine loads, but before data endpoints are created.

## Signature

`onInitialize(fCallback)`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | Function | Callback `(pError)` to continue the initialization chain |

## Default Behavior

No-op -- calls `fCallback()` immediately.

## Override

```javascript
class MyDataService extends require('retold-data-service')
{
	onInitialize(fCallback)
	{
		this.fable.log.info('Running database migrations...');
		// The persistence engine is connected but endpoints don't exist yet
		return fCallback();
	}
}
```

## Use Cases

- Database migrations
- Additional service registration
- Custom route registration before entity routes
- Schema transformations
