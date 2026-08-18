# Changelog

Notable changes to `@imqueue/pg-sequelize`.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.2.1] - 2026-08-18

### Fixed

- **`query.createEntity` leaked a pooled connection on every failed insert.**
  When no transaction was passed it opened one, and finished it only on the happy
  path — there was no `rollback` anywhere in the helper. A rejected `save()` (a
  unique or foreign-key violation, a NOT NULL, an invalid enum) unwound past the
  commit and left the transaction open.

  In sequelize 6 a pooled connection is bound to the `Transaction` and only
  `commit()` or `rollback()` hands it back, so nothing released it: `pool.max`
  failed inserts — 5 by default — exhausted the pool, after which every query in
  the process failed with `SequelizeConnectionAcquireTimeoutError` until it was
  restarted. On the database side the backend sat in
  `idle in transaction (aborted)` indefinitely.

  Ownership is now all-or-nothing, decided by a single flag used for both the
  commit and the rollback so the two cannot select different sets of calls. Only
  the call that opened the transaction finishes it; a caller-supplied transaction
  and the nested relation creates that inherit it are untouched, exactly as
  before. A rollback that fails is swallowed so it cannot replace the error that
  caused it.

  Anyone who cannot upgrade can own the lifecycle from outside, which closes the
  leak with no dependency change:

  ```typescript
  const entity = await Model.sequelize!.transaction(transaction =>
      createEntity<T, I>(Model, data, fields, transaction),
  );
  ```

## [4.2.0] - 2026-08-01

The package is renamed from `@imqueue/sequelize` to `@imqueue/pg-sequelize`. No
export changed name or signature; the migration is the dependency and the import
specifiers.

`@imqueue/sequelize` is deprecated on npm and will receive no further releases.
There is no compatibility shim: 4.1.3, the last version published under the old
name, stays installable indefinitely and stays frozen.

### Changed

- **Renamed on npm.** `npm i @imqueue/pg-sequelize`, and update every import
  specifier.

  The `pg-` prefix states what was already true. This package is Postgres-
  specific rather than dialect-neutral: `pg` is a direct dependency, the index
  decorators emit Postgres `CREATE INDEX` syntax including `CONCURRENTLY`, and
  the filter operators (`ILIKE`, `~`, `@>`, `<@`, `&&`, `-|-`, …) are Postgres
  operators. It also lines the name up with its sibling
  [`@imqueue/pg-prisma`](https://github.com/imqueue/pg-prisma), which covers the
  same ground for that stack.

- **`repository.url` was malformed and is now correct.** It read
  `git@github.com:/imqueue/sequelize` — scp form with a stray slash after the
  colon and no `.git` suffix — and was published that way. It is now
  `git+https://github.com/imqueue/pg-sequelize.git`.

- **`bugs.url`** and the three README badges (build status, Snyk, license) point
  at the renamed repository, and the API-reference link points at
  <https://imqueue.org/api/pg-sequelize/latest/>.

- **The published description was silently truncated.** npm stores 255
  characters and the description was 286, so it had been cut mid-word at
  "…Sequelize cannot e" since 4.1.3. It is now 239 characters.

### Added

- **`keywords`.** There were none, so discoverability rested entirely on the
  package name matching a search for "sequelize" — which the rename gives up.
  The list keeps `sequelize` alongside `postgres`, `pg`, `orm` and the rest.

- **`publishConfig.access`**, so a first publish under a new scoped name cannot
  land as a restricted package.
