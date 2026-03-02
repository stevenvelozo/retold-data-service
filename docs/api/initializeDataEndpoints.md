# initializeDataEndpoints

Core initialization step that loads the compiled Stricture model and creates a Meadow DAL and MeadowEndpoints controller for every entity.

## Signature

`initializeDataEndpoints(fCallback)`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fCallback` | Function | Callback `(pError)` when all endpoints are created |

## Behavior

1. Loads the compiled Stricture schema from `options.FullMeadowSchemaPath` + `options.FullMeadowSchemaFilename`
2. Extracts the entity list from `fullModel.Tables`
3. For each entity:
   - Creates a Meadow DAL from the table's `MeadowSchema` property via `loadFromPackageObject()`
   - Sets the DAL's storage provider to `options.StorageProvider`
   - Creates a MeadowEndpoints controller wrapping the DAL
   - Connects routes to the Orator service server via `connectRoutes()`
4. Stores all DALs in `this._DAL` (also accessible via `fable.DAL`)
5. Stores all endpoint controllers in `this._MeadowEndpoints` (also accessible via `fable.MeadowEndpoints`)

## After Initialization

```javascript
// Access DAL for any entity
let tmpBookDAL = _Fable.DAL.Book;

// Access endpoints controller for any entity
let tmpBookEndpoints = _Fable.MeadowEndpoints.Book;

// List all entities
console.log(_Fable.RetoldDataService.entityList);
// ['Book', 'Author', 'BookAuthorJoin', ...]
```

## Generated Endpoints Per Entity

For each entity (e.g. `Book`), these routes are connected:

| Method | URL | Operation |
|--------|-----|-----------|
| GET | `/1.0/Book/:ID` | Read single record |
| GET | `/1.0/Books/:Begin/:Cap` | Read multiple records |
| POST | `/1.0/Book` | Create record |
| PUT | `/1.0/Book` | Update record |
| DELETE | `/1.0/Book/:ID` | Soft-delete record |
| GET | `/1.0/Books/Count` | Count records |
| GET | `/1.0/Book/Schema` | Get entity schema |
| GET | `/1.0/Book/Schema/New` | Get default record |
