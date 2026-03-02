# onAfterInitialize

Lifecycle hook called after all data endpoints are created and routes are connected.

## Signature

`onAfterInitialize(fCallback)`

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
	onAfterInitialize(fCallback)
	{
		this.fable.log.info('Injecting custom behaviors...');

		this.fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
			'Read-PostOperation',
			(pRequest, pRequestState, fRequestComplete) =>
			{
				// Enrich book records with author data
				pRequestState.Record.CustomField = 'injected';
				return fRequestComplete(false);
			});

		return fCallback();
	}
}
```

## Use Cases

- Behavior injection on entity endpoints
- Cache warming
- Background task scheduling
- Custom endpoint registration after entity routes
- Seed data verification
