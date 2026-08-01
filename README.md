# @imqueue/sequelize

[![Build Status](https://img.shields.io/github/actions/workflow/status/imqueue/sequelize/build.yml)](https://github.com/imqueue/sequelize)
[![Known Vulnerabilities](https://snyk.io/test/github/imqueue/sequelize/badge.svg?targetFile=package.json)](https://snyk.io/test/github/imqueue/sequelize?targetFile=package.json)
[![License](https://img.shields.io/badge/license-GPL-blue.svg)](https://github.com/imqueue/sequelize/blob/master/LICENSE)

Turns a query described as data — a filter, a page, an order and the fields the caller
actually needs — into one efficient Sequelize statement. Plus database views as models,
the Postgres index options Sequelize cannot express, and a single import surface for the
whole ORM stack.

# Which package should I use?

**For new development, start with
[@imqueue/pg-prisma](https://github.com/imqueue/pg-prisma) instead.**

This package is locked to Sequelize v6, and that is a position rather than neglect:
upstream Sequelize has sat in v7-alpha for years and is asking for maintainers, so v6 is
where the ground is stable. Services already built on Sequelize keep a maintained path
here and this package keeps evolving on top of it — it is not abandoned. It is simply not
the stack to start something new on.

# Install

~~~bash
npm i --save @imqueue/sequelize
~~~

# Usage

Connect once, anywhere in the service. Every later call hands back the same instance, so
only the first one needs the configuration:

~~~typescript
import { database, query } from '@imqueue/sequelize';

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
reference. The wider ecosystem documentation is at
[imqueue.org](https://imqueue.org/docs/).

## License

This project is licensed under the GNU General Public License v3.0.
See the [LICENSE](LICENSE)
