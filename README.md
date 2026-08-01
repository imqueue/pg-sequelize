# @imqueue/pg-sequelize

[![Build Status](https://img.shields.io/github/actions/workflow/status/imqueue/pg-sequelize/build.yml)](https://github.com/imqueue/pg-sequelize)
[![Known Vulnerabilities](https://snyk.io/test/github/imqueue/pg-sequelize/badge.svg?targetFile=package.json)](https://snyk.io/test/github/imqueue/pg-sequelize?targetFile=package.json)
[![License](https://img.shields.io/badge/license-GPL-blue.svg)](https://github.com/imqueue/pg-sequelize/blob/master/LICENSE)

Turns a query described as data — a filter, a page, an order and the fields the caller
actually needs — into one efficient Sequelize statement. Plus database views as models,
the Postgres index options Sequelize cannot express, and a single import surface for the
whole ORM stack.

# Sequelize v6, and the alternative

This targets Sequelize v6 — a mature line, proven in production, and the one this
package is actively developed against. Sequelize v7 is still in alpha upstream, so v6 is
what there is to build on today; if v7 lands, this follows it.

If you would rather build on Prisma,
[@imqueue/pg-prisma](https://github.com/imqueue/pg-prisma) covers the same ground for
that stack. Both are supported — pick the ORM you want to live with.

# Renamed

This package was called `@imqueue/sequelize` up to and including 4.1.3. The old
name is deprecated on npm and receives no further releases; there is no
compatibility shim. To migrate, change the dependency and every import specifier
— no export changed name or signature, and the `pg-` prefix only states what was
always true: this targets Postgres specifically, not every Sequelize dialect.

# Install

~~~bash
npm i --save @imqueue/pg-sequelize
~~~

# Usage

Connect once, anywhere in the service. Every later call hands back the same instance, so
only the first one needs the configuration:

~~~typescript
import { database, query } from '@imqueue/pg-sequelize';

const sequelize = database({
    logger: console,
    modelsPath: './src/orm/models',
    sequelize: {
        benchmark: true,
        dialect: 'postgres',
        storage: 'sequelize',
        pool: {
            max: 250,
            min: 2,
            idle: 30000,
            acquire: 30000,
        },
    },
});
~~~

Then let the caller's own arguments build the query. `autoQuery` reads the requested
field map, so a column nobody asked for is not selected and a relation nobody reached
into is not joined:

~~~typescript
const where = query.toWhereOptions(query.withRangeFilters(filter));
const rows = await LeadModel.findAll(query.autoQuery<FindOptions>(
    LeadModel,
    fields,
    where,
    query.toLimitOptions(pageOptions),
    query.toOrderOptions(orderBy),
));
const total = await LeadModel.count(query.autoCountQuery(LeadModel, fields, where));
~~~

`filter`, `fields`, `pageOptions` and `orderBy` are plain JSON — `FilterInput`,
`FieldsInput`, `PaginationInput` and `OrderByInput` describe them — because Sequelize
writes its operators as ES symbols, and a symbol cannot survive a wire format. A GraphQL
resolver is the case this was written against, passing its arguments and its selected
field set straight through; an RPC method taking a filter object is the same problem.

# Docs

Every exported symbol carries its own documentation, so an editor is the fastest
reference. The same content is published, symbol by symbol, as the
[API reference](https://imqueue.org/api/pg-sequelize/latest/) — searchable, and linkable
when you need to point someone at one thing. The wider ecosystem documentation is at
[imqueue.org](https://imqueue.org/docs/).

## License

This project is licensed under the GNU General Public License v3.0.
See the [LICENSE](LICENSE)
