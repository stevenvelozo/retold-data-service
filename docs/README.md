# Retold Data Service

An all-in-one Fable service that turns a compiled Stricture schema into a complete REST API. Combines Meadow (data access), Orator (API server), and Meadow Endpoints (REST routes) into a single service provider with lifecycle hooks and behavior injection.

## What It Does

Retold Data Service orchestrates several Retold modules into a unified service:

- **[Meadow](https://fable-retold.github.io/meadow/)** provides the data access layer and ORM
- **[Meadow Endpoints](https://fable-retold.github.io/meadow-endpoints/)** generates REST routes for every entity
- **[Orator](https://fable-retold.github.io/orator/)** serves the HTTP API via Restify
- **[FoxHound](https://fable-retold.github.io/foxhound/)** builds SQL queries from a declarative DSL
- **[Stricture](https://fable-retold.github.io/stricture/)** compiles schema definitions into the model

## Features

- **Zero-Boilerplate REST** -- Define your schema once, get full CRUD endpoints for every entity automatically
- **Provider-Agnostic** -- Swap between MySQL, MSSQL, PostgreSQL, SQLite, MongoDB, DGraph, Solr, or ALASQL
- **Schema-Driven** -- Stricture DDL compiles into a model that drives endpoint generation, validation, and defaults
- **Lifecycle Hooks** -- `onBeforeInitialize`, `onInitialize`, and `onAfterInitialize` for custom startup logic
- **Behavior Injection** -- Pre- and post-operation hooks on every CRUD operation
- **DAL Access** -- Direct programmatic data access alongside the REST endpoints
- **Backplane Endpoints** -- Dynamic model loading and provider switching at runtime
- **Fable Service Provider** -- First-class service with logging, configuration, and DI

## Related Packages

- [meadow](https://fable-retold.github.io/meadow/) -- Data access layer and ORM
- [meadow-endpoints](https://fable-retold.github.io/meadow-endpoints/) -- REST endpoint generation
- [foxhound](https://fable-retold.github.io/foxhound/) -- Query DSL for SQL generation
- [stricture](https://fable-retold.github.io/stricture/) -- Schema definition DDL compiler
- [orator](https://fable-retold.github.io/orator/) -- API server abstraction
- [fable](https://fable-retold.github.io/fable/) -- Application services framework
- [retold-harness](https://fable-retold.github.io/retold-harness/) -- Application harness using this service
