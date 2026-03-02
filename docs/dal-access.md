# DAL Access

After initialization, Retold Data Service exposes a Meadow DAL instance for every entity in your schema. Use these DAL objects for server-side data operations without going through the REST API.

## Accessing the DAL

DAL objects are available on the Fable instance:

```javascript
// Access any entity's DAL
let tmpBookDAL = _Fable.DAL.Book;
let tmpAuthorDAL = _Fable.DAL.Author;
```

## Read Operations

### Read Single Record

```javascript
let tmpQuery = _Fable.DAL.Book.query
	.addFilter('IDBook', 42);

_Fable.DAL.Book.doRead(tmpQuery,
	(pError, pQuery, pRecord) =>
	{
		console.log('Book:', pRecord.Title);
	});
```

### Read Multiple Records

```javascript
let tmpQuery = _Fable.DAL.Book.query
	.addFilter('Genre', 'Science Fiction')
	.setCap(25)
	.setBegin(0);

_Fable.DAL.Book.doReads(tmpQuery,
	(pError, pQuery, pRecords) =>
	{
		console.log(`Found ${pRecords.length} sci-fi books`);
	});
```

### Read with Sorting

```javascript
let tmpQuery = _Fable.DAL.Book.query
	.addSort({ Column: 'PublicationYear', Direction: 'Descending' })
	.setCap(10);

_Fable.DAL.Book.doReads(tmpQuery,
	(pError, pQuery, pRecords) =>
	{
		console.log('Newest books:', pRecords);
	});
```

### Read with LIKE Filter

```javascript
let tmpQuery = _Fable.DAL.Book.query
	.addFilter('Title', '%Dune%', 'LIKE');

_Fable.DAL.Book.doReads(tmpQuery,
	(pError, pQuery, pRecords) =>
	{
		console.log('Dune books:', pRecords.length);
	});
```

## Count

```javascript
let tmpQuery = _Fable.DAL.Book.query
	.addFilter('Genre', 'Fantasy');

_Fable.DAL.Book.doCount(tmpQuery,
	(pError, pQuery, pCount) =>
	{
		console.log('Fantasy books:', pCount);
	});
```

## Create

```javascript
let tmpQuery = _Fable.DAL.Book.query
	.addRecord(
	{
		Title: 'Neuromancer',
		Genre: 'Science Fiction',
		PublicationYear: 1984
	});

_Fable.DAL.Book.doCreate(tmpQuery,
	(pError, pQuery, pRecord) =>
	{
		console.log('Created book ID:', pRecord.IDBook);
	});
```

## Update

```javascript
let tmpQuery = _Fable.DAL.Book.query
	.addRecord(
	{
		IDBook: 42,
		Title: 'Updated Title'
	});

_Fable.DAL.Book.doUpdate(tmpQuery,
	(pError, pQuery, pRecord) =>
	{
		console.log('Updated:', pRecord.Title);
	});
```

## Delete

```javascript
let tmpQuery = _Fable.DAL.Book.query
	.addFilter('IDBook', 42);

_Fable.DAL.Book.doDelete(tmpQuery,
	(pError, pQuery, pResult) =>
	{
		console.log('Deleted:', pResult);
	});
```

## Cross-Entity Queries

Use the DAL to query across entities:

```javascript
// Find authors for a book
_Fable.DAL.BookAuthorJoin.doReads(
	_Fable.DAL.BookAuthorJoin.query.addFilter('IDBook', 42),
	(pError, pQuery, pJoins) =>
	{
		pJoins.forEach(
			(pJoin) =>
			{
				_Fable.DAL.Author.doRead(
					_Fable.DAL.Author.query.addFilter('IDAuthor', pJoin.IDAuthor),
					(pError, pQuery, pAuthor) =>
					{
						console.log('Author:', pAuthor.Name);
					});
			});
	});
```

## Query Object

The query object is provided by FoxHound and supports method chaining:

| Method | Description |
|--------|-------------|
| `addFilter(column, value, operator)` | Add a filter condition (default operator: `=`) |
| `addSort({ Column, Direction })` | Add sort order (`Ascending` or `Descending`) |
| `setCap(n)` | Limit result count |
| `setBegin(n)` | Skip first N results |
| `addRecord(object)` | Set record data for create/update |
