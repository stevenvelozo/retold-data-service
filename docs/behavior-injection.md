# Behavior Injection

Behavior injection lets you add custom logic before or after any CRUD operation on any entity. This is the primary extension mechanism for adding business rules, validation, enrichment, and side effects.

## How It Works

Each MeadowEndpoints controller has a `BehaviorInjection` object that manages hooks for every CRUD operation. You set behaviors by specifying the operation and timing (pre or post).

## Available Hooks

| Hook | Fires |
|------|-------|
| `Create-PreOperation` | Before a record is created |
| `Create-PostOperation` | After a record is created |
| `Read-PreOperation` | Before a single record is read |
| `Read-PostOperation` | After a single record is read |
| `Reads-PreOperation` | Before multiple records are read |
| `Reads-PostOperation` | After multiple records are read |
| `Update-PreOperation` | Before a record is updated |
| `Update-PostOperation` | After a record is updated |
| `Delete-PreOperation` | Before a record is deleted |
| `Delete-PostOperation` | After a record is deleted |
| `Count-PreOperation` | Before a count query |
| `Count-PostOperation` | After a count query |

## Setting a Behavior

```javascript
_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
	'Create-PreOperation',
	(pRequest, pRequestState, fRequestComplete) =>
	{
		// Your custom logic here
		return fRequestComplete(false);
	});
```

## Callback Convention

The `fRequestComplete` callback accepts a single boolean argument:
- `false` -- Continue normal processing
- `true` -- Halt processing (request is already handled)

## Examples

### Validation

```javascript
_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
	'Create-PreOperation',
	(pRequest, pRequestState, fRequestComplete) =>
	{
		if (!pRequestState.RecordToCreate.Title)
		{
			pRequest.CommonServices.sendCodedResponse(
				pRequestState.response, 400, 'Title is required');
			return fRequestComplete(true);
		}
		return fRequestComplete(false);
	});
```

### Record Enrichment

```javascript
_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
	'Read-PostOperation',
	(pRequest, pRequestState, fRequestComplete) =>
	{
		// Add computed fields to the response
		pRequestState.Record.DisplayTitle =
			`${pRequestState.Record.Title} (${pRequestState.Record.PublicationYear})`;
		return fRequestComplete(false);
	});
```

### Cross-Entity Enrichment

```javascript
_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
	'Read-PostOperation',
	(pRequest, pRequestState, fRequestComplete) =>
	{
		_Fable.DAL.BookAuthorJoin.doReads(
			_Fable.DAL.BookAuthorJoin.query.addFilter('IDBook', pRequestState.Record.IDBook),
			(pJoinError, pJoinQuery, pJoinRecords) =>
			{
				let tmpAuthors = [];
				let tmpRemaining = pJoinRecords.length;

				if (tmpRemaining < 1)
				{
					pRequestState.Record.Authors = [];
					return fRequestComplete(false);
				}

				for (let j = 0; j < pJoinRecords.length; j++)
				{
					_Fable.DAL.Author.doRead(
						_Fable.DAL.Author.query.addFilter('IDAuthor', pJoinRecords[j].IDAuthor),
						(pReadError, pReadQuery, pAuthor) =>
						{
							if (pAuthor && pAuthor.IDAuthor)
							{
								tmpAuthors.push(pAuthor);
							}
							tmpRemaining--;
							if (tmpRemaining <= 0)
							{
								pRequestState.Record.Authors = tmpAuthors;
								return fRequestComplete(false);
							}
						});
				}
			});
	});
```

### Audit Logging

```javascript
_Fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
	'Delete-PreOperation',
	(pRequest, pRequestState, fRequestComplete) =>
	{
		_Fable.log.warn(`Book ${pRequestState.RecordToDelete.IDBook} is being deleted`);
		return fRequestComplete(false);
	});
```

## Timing

- **PreOperation** hooks run before the database operation. Use them for validation, transformation, or authorization.
- **PostOperation** hooks run after the database operation. Use them for enrichment, logging, or triggering side effects.

## Using with Lifecycle Hooks

The best place to inject behaviors is in the `onAfterInitialize` lifecycle hook:

```javascript
class MyDataService extends require('retold-data-service')
{
	onAfterInitialize(fCallback)
	{
		this.fable.MeadowEndpoints.Book.controller.BehaviorInjection.setBehavior(
			'Read-PostOperation', myBookEnrichmentHook);

		this.fable.MeadowEndpoints.Review.controller.BehaviorInjection.setBehavior(
			'Create-PreOperation', myReviewValidationHook);

		return fCallback();
	}
}
```
