# Schema Definition

Retold Data Service loads a compiled Stricture schema model to create its entities and endpoints.

## The Stricture DDL

Schemas are defined using Stricture's DDL syntax, then compiled into a JSON model that Retold Data Service understands.

### DDL Example

```
!Book
@IDBook
%GUIDBook
&CreateDate
#CreatingIDUser
&UpdateDate
#UpdatingIDUser
^Deleted
&DeleteDate
#DeletingIDUser
$Title 200
$Type 32
$Genre 128
$ISBN 64
$Language 12
#PublicationYear

!Author
@IDAuthor
%GUIDAuthor
&CreateDate
#CreatingIDUser
&UpdateDate
#UpdatingIDUser
^Deleted
&DeleteDate
#DeletingIDUser
$Name 200
```

### DDL Symbols

| Symbol | Meaning | Meadow Type |
|--------|---------|-------------|
| `!` | Table/entity name | — |
| `@` | Auto-increment ID | `AutoIdentity` |
| `%` | Auto GUID | `AutoGUID` |
| `&` | DateTime column | `CreateDate`, `UpdateDate`, `DeleteDate`, or `DateTime` |
| `#` | Numeric column | `Integer`, `CreateIDUser`, `UpdateIDUser`, `DeleteIDUser` |
| `$` | String column (with size) | `String` |
| `^` | Boolean column | `Deleted` or `Boolean` |
| `.` | Decimal column (with precision) | `Decimal` |
| `*` | Text column | `String` (large) |

## Compiling the Model

Use Stricture to compile the DDL into JSON:

```bash
npx stricture -i model/ddl/BookStore.ddl
```

This produces a `MeadowModel-Extended.json` file containing the full model with:
- Column definitions per table
- Meadow schema per table (with `AutoIdentity`, `AutoGUID`, `CreateDate`, etc.)
- JSON Schema per table
- Default objects per table
- Authorization rules per table

## Model JSON Structure

```json
{
    "Tables": {
        "Book": {
            "TableName": "Book",
            "Columns": [...],
            "MeadowSchema": {
                "Scope": "Book",
                "DefaultIdentifier": "IDBook",
                "Schema": [
                    {"Column": "IDBook", "Type": "AutoIdentity"},
                    {"Column": "GUIDBook", "Type": "AutoGUID"},
                    {"Column": "Title", "Type": "String", "Size": "200"},
                    ...
                ],
                "DefaultObject": {
                    "IDBook": 0,
                    "Title": "",
                    ...
                },
                "Authorization": { ... }
            }
        },
        "Author": { ... }
    }
}
```

## Build Script

The test model includes a build script for compiling the DDL:

```bash
npm run build-test-model
```

This runs `cd test && npx stricture -i model/ddl/BookStore.ddl` to regenerate the compiled model from the DDL.

## Schema Types Reference

| Type | Description | Auto-Managed |
|------|-------------|-------------|
| `AutoIdentity` | Auto-increment primary key | On Create (NULL/omit) |
| `AutoGUID` | Unique identifier | On Create (UUID generated) |
| `CreateDate` | Creation timestamp | On Create |
| `CreateIDUser` | Creator user ID | On Create |
| `UpdateDate` | Last update timestamp | On Create and Update |
| `UpdateIDUser` | Last updater user ID | On Create and Update |
| `Deleted` | Soft-delete flag | On Delete (set to 1) |
| `DeleteDate` | Deletion timestamp | On Delete |
| `DeleteIDUser` | Deleter user ID | On Delete |
| `String` | Text data | — |
| `Integer` | Numeric data | — |
| `Decimal` | Decimal data | — |
| `Boolean` | Boolean data | — |
| `DateTime` | Date/time data | — |
