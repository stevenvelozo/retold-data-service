# stopService

Stop the Orator web server and reset the service state.

## Signature

`stopService(fCallback)`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | Function | Callback `(pError)` when the service is stopped |

## Behavior

- Stops the Orator web server via `fable.Orator.stopWebServer()`
- Sets `serviceInitialized = false`
- Returns error if the service is not currently initialized

## Example

```javascript
_Fable.RetoldDataService.stopService(
	(pError) =>
	{
		if (pError)
		{
			console.error('Stop failed:', pError);
			return;
		}
		console.log('Service stopped');
	});
```
