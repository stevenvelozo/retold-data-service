# initializeService

Main entry point for initializing the full service stack. Chains all lifecycle steps via Fable's Anticipate pattern.

## Signature

`initializeService(fCallback)`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | Function | Callback `(pError)` when initialization completes |

## Initialization Sequence

1. Check for double-initialization (returns error if already initialized)
2. `onBeforeInitialize()` -- custom pre-init hook
3. Start Orator web server (if `AutoStartOrator` is `true`)
4. `initializePersistenceEngine()` -- load storage provider
5. `onInitialize()` -- custom mid-init hook
6. `initializeDataEndpoints()` -- load model, create DALs and endpoints
7. `onAfterInitialize()` -- custom post-init hook
8. Set `serviceInitialized = true`

## Error Handling

- If already initialized, calls back with `Error("...already been initialized...")`
- If any step in the chain fails, the error propagates to `fCallback`

## Example

```javascript
_Fable.RetoldDataService.initializeService(
	(pError) =>
	{
		if (pError)
		{
			console.error('Initialization failed:', pError);
			return process.exit(1);
		}
		console.log('REST API running on port', _Fable.settings.APIServerPort);
	});
```
