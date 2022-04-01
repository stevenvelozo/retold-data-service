# Retold Data Service

Provide a consistent back or mid-tier data service.

## Basic Usage

This library can run in any of three types of configurations:

* Configuration Driven
* Managed via Backplane Endpoints
* Hybrid (configuration plus endpoint)

## Configuration-Driven Mode

The service looks for a `Retold` stanza in the configuration.  For instance:

```
{
    ...
    "Retold": {
        "MeadowModel": "./meadow-schema-extended.json"
    },
    ...
}
```

The three auto-configured parameters are:

* `MeadowModel`
* `MeadowEntitySchema`
* `StrictureDDL`

The service tries to do the right thing with strings versus arrays -- you can pass an array of models or a single.  Likewise, you can pass an array of schemas or a single.  It also supports grabbing all files of a single folder with the `/*` suffix, and recursive with the `/**` suffix.  When used in this fashion, only `.json` files are loaded from the folder(s).

## Supplied Backplane Endpoints

### Load a Meadow Model

```
POST /BackPlane/${VERSION}/Load/MeadowModel
```

This endpoint accepts a JSON blob of an entire Meadow model.  It loads the entire model as a set of endpoints, and connects each endpoint to the default provider.

### Load a Meadow Entity Schema

```
POST /BackPlane/${VERSION}/Load/MeadowSchema
```

This endpoint accepts a JSON blob of an entire Meadow model.  It loads the entire model as a set of endpoints, and connects each endpoint to the default provider.

### Load a DDL and Compile it
```
POST /BackPlane/${VERSION}/Load/StrictureDDL
```

This endpoint loads a Stricture DDL, compiles it into the composite Entity schemas and loads them as endpoints.


### Access Primary Service Model and Composite Models
```
GET /BackPlane/${VERSION}/Model/Primary/
```

GET /BackPlane/${VERSION}/Model/Composite/

### Merge in Settings (to push default configurations for providers)
```
POST /BackPlane/${VERSION}/Settings
```

### Set the Default Provider
```
GET /BackPlane/${VERSION}/SetProvider/:ProviderName
```

### Set an Entity-Specific Provider
```
GET /BackPlane/${VERSION}/SetProvider/:ProviderName/:Entity
```





