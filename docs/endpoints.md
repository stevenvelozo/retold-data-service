# Endpoints

Once initialized, Retold Data Service automatically creates RESTful endpoints for every entity in your Stricture model.

## URL Pattern

All endpoints follow the Meadow Endpoints URL pattern:

```
/{Version}/{Entity}         — singular entity operations (Read, Create, Update, Delete)
/{Version}/{Entity}s        — plural entity operations (Reads, Count)
```

The version defaults to `1.0`.

## Available Endpoints

For an entity named `Book`, these endpoints are created:

### Read (Single Record)

```
GET /1.0/Book/:IDRecord
```

Returns a single record by primary key.  Returns a 404 error object if not found.

### Read (Multiple Records)

```
GET /1.0/Books
GET /1.0/Books/:Begin/:Cap
GET /1.0/Books/FilteredTo/:Filter
GET /1.0/Books/FilteredTo/:Filter/:Begin/:Cap
```

Returns an array of records.  Supports pagination via `Begin` and `Cap` parameters, and filtering via the Meadow filter stanza format.

### Create

```
POST /1.0/Book
Body: { "Title": "Dune", "Genre": "Science Fiction" }
```

Creates a new record and returns the created record (with auto-generated ID and GUID).

### Update

```
PUT /1.0/Book
Body: { "IDBook": 1, "Title": "Dune (Updated)" }
```

Updates an existing record and returns the updated record.  The request body must include the primary key.

### Delete (Soft Delete)

```
DELETE /1.0/Book/:IDRecord
```

Soft-deletes a record (sets `Deleted = 1`).  Returns the number of affected records.

### Count

```
GET /1.0/Books/Count
GET /1.0/Books/Count/FilteredTo/:Filter
GET /1.0/Books/Count/By/:ByField/:ByValue
```

Returns the count of matching records as `{ "Count": N }`.

### Schema

```
GET /1.0/Book/Schema
```

Returns the JSON Schema for the entity.

### New Default Record

```
GET /1.0/Book/Schema/New
```

Returns a new default record with all fields set to their default values.

## Filter Stanza Format

Filters use the Meadow filter stanza format in the URL:

```
FBV~Column~Operator~Value
```

| Code | Meaning |
|------|---------|
| `FBV` | Filter By Value |
| `EQ` | Equals |
| `NE` | Not Equals |
| `GT` | Greater Than |
| `GE` | Greater Than or Equal |
| `LT` | Less Than |
| `LE` | Less Than or Equal |
| `LK` | LIKE |

### Examples

```
# Filter by exact genre
GET /1.0/Books/FilteredTo/FBV~Genre~EQ~Science Fiction

# Filter by title pattern (URL-encode the % as %25)
GET /1.0/Books/FilteredTo/FBV~Title~LK~%25Dune%25

# Count filtered records
GET /1.0/Books/Count/FilteredTo/FBV~Genre~EQ~Fantasy
```
