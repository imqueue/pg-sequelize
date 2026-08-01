# Changelog

Notable changes to `@imqueue/pg-sequelize`.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
