# onBeforeInitialize

Lifecycle hook called before Orator starts and before the persistence engine loads.

## Signature

`onBeforeInitialize(fCallback)`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | Function | Callback `(pError)` to continue the initialization chain |

## Default Behavior

No-op -- calls `fCallback()` immediately.

## Override

Subclass `RetoldDataService` to add custom pre-initialization logic:

```javascript
class MyDataService extends require('retold-data-service')
{
	onBeforeInitialize(fCallback)
	{
		this.fable.log.info('Validating environment...');

		if (!process.env.DATABASE_URL)
		{
			return fCallback(new Error('DATABASE_URL is required'));
		}

		return fCallback();
	}
}
```

## Use Cases

- Environment validation
- Early configuration overrides
- External service health checks
- Feature flag loading
