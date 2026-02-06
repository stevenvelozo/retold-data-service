# Behavior Injection

Behavior injection lets you add custom logic before and after any CRUD operation on your endpoints.

## How It Works

Each entity's Meadow Endpoints controller has a `BehaviorInjection` object that accepts pre- and post-operation hooks.  These hooks run inline with the request handling pipeline.

## Setting a Behavior

```javascript
_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
    'Read-PreOperation',
    (pRequest, pRequestState, fRequestComplete) =>
    {
        // Custom logic before the Read operation
        console.log('About to read Book ID:', pRequest.params.IDRecord);
        return fRequestComplete(false);
    });
```

## Available Hook Points

Each CRUD operation supports `PreOperation` and `PostOperation` hooks:

| Hook Name | Fires |
|-----------|-------|
| `Create-PreOperation` | Before a CREATE |
| `Create-PostOperation` | After a CREATE |
| `Read-PreOperation` | Before a single READ |
| `Read-PostOperation` | After a single READ |
| `Reads-PreOperation` | Before a READ-many |
| `Reads-PostOperation` | After a READ-many |
| `Update-PreOperation` | Before an UPDATE |
| `Update-PostOperation` | After an UPDATE |
| `Delete-PreOperation` | Before a DELETE |
| `Delete-PostOperation` | After a DELETE |
| `Count-PreOperation` | Before a COUNT |
| `Count-PostOperation` | After a COUNT |
| `Schema-PreOperation` | Before a SCHEMA read |
| `Schema-PostOperation` | After a SCHEMA read |

## Request State

The `pRequestState` object contains:

| Property | Description |
|----------|-------------|
| `Record` | The current record being operated on |
| `RecordToCreate` | The record being created (Create operations) |
| `Query` | The FoxHound query object |
| `SessionData` | Session data for the current request |

## Examples

### Enriching Read Results

```javascript
_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
    'Read-PostOperation',
    (pRequest, pRequestState, fRequestComplete) =>
    {
        // Load related author data
        let tmpQuery = _Fable.DAL.BookAuthorJoin.query
            .addFilter('IDBook', pRequestState.Record.IDBook);

        _Fable.DAL.BookAuthorJoin.doReads(tmpQuery,
            (pError, pQuery, pJoinRecords) =>
            {
                pRequestState.Record.AuthorJoins = pJoinRecords;
                return fRequestComplete(false);
            });
    });
```

### Validating Before Create

```javascript
_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
    'Create-PreOperation',
    (pRequest, pRequestState, fRequestComplete) =>
    {
        if (!pRequestState.RecordToCreate.Title)
        {
            pRequest.CommonServices.sendCodedResponse(
                pRequestState.response, 400, 'Title is required');
            return fRequestComplete(true); // true signals an error
        }
        return fRequestComplete(false);
    });
```

### Adding Query Filters

```javascript
_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
    'Reads-PreOperation',
    (pRequest, pRequestState, fRequestComplete) =>
    {
        // Only return English-language books
        pRequestState.Query.addFilter('Language', 'English');
        return fRequestComplete(false);
    });
```

## Removing a Behavior

```javascript
delete _Fable.MeadowEndpoints.Book.controller
    .BehaviorInjection._BehaviorFunctions['Read-PreOperation'];
```
