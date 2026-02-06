# DAL Access

In addition to the REST endpoints, you can query your data directly through the Meadow DAL objects.

## Accessing DAL Objects

After initialization, every entity in your model has a DAL object accessible via `fable.DAL`:

```javascript
// Read a single record
let tmpQuery = _Fable.DAL.Book.query.addFilter('IDBook', 42);

_Fable.DAL.Book.doRead(tmpQuery,
    (pError, pQuery, pRecord) =>
    {
        console.log('Found:', pRecord.Title);
    });
```

## Available Operations

| Method | Description |
|--------|-------------|
| `doCreate(query, callback)` | Insert a new record |
| `doRead(query, callback)` | Read a single record |
| `doReads(query, callback)` | Read multiple records |
| `doUpdate(query, callback)` | Update an existing record |
| `doDelete(query, callback)` | Soft-delete a record |
| `doUndelete(query, callback)` | Restore a soft-deleted record |
| `doCount(query, callback)` | Count matching records |

## Query Building

Each DAL has a `query` property (a FoxHound query instance) that you can configure with filters, sorting, and pagination:

```javascript
// Read all Science Fiction books, newest first, page 1
let tmpQuery = _Fable.DAL.Book.query
    .addFilter('Genre', 'Science Fiction')
    .addSort({Column: 'PublicationYear', Direction: 'Descending'})
    .setCap(25)
    .setBegin(0);

_Fable.DAL.Book.doReads(tmpQuery,
    (pError, pQuery, pRecords) =>
    {
        console.log(`Found ${pRecords.length} books`);
    });
```

## Creating Records

```javascript
let tmpQuery = _Fable.DAL.Author.query
    .addRecord({Name: 'Frank Herbert'});

_Fable.DAL.Author.doCreate(tmpQuery,
    (pError, pCreateQuery, pReadQuery, pRecord) =>
    {
        console.log('Created author with ID:', pRecord.IDAuthor);
    });
```

## Counting Records

```javascript
let tmpQuery = _Fable.DAL.Review.query;

_Fable.DAL.Review.doCount(tmpQuery,
    (pError, pQuery, pCount) =>
    {
        console.log('Total reviews:', pCount);
    });
```

## When to Use DAL vs Endpoints

Use the **REST endpoints** when:
- Building a web UI that communicates over HTTP
- Exposing an API for external consumers
- You need session management and authorization

Use **DAL access** when:
- Running server-side business logic
- Performing batch operations
- Writing behavior injection hooks that need to query related entities
- Running background tasks or workers
