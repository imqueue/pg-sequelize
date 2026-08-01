/*!
 * @imqueue/sequelize - Sequelize ORM refines for @imqueue
 *
 * I'm Queue Software Project
 * Copyright (C) 2025  imqueue.com <support@imqueue.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * If you want to use this code in a closed source (commercial) project, you can
 * purchase a proprietary commercial license. Please contact us at
 * <support@imqueue.com> to get commercial licensing options.
 */
/**
 * Sequelize and `sequelize-typescript`, refined for `@imqueue` services.
 *
 * The package has three jobs, and in practice they are used in that order of
 * frequency.
 *
 * First, it is the single import surface for the whole ORM stack. Everything
 * `sequelize` and `sequelize-typescript` export is re-exported here — `Table`,
 * `Column`, `DataType`, `AllowNull`, `ForeignKey`, `BelongsTo`, `HasMany`,
 * `QueryInterface` and the rest — so a service imports from one place rather than
 * three, and several option types are widened on the way through (see
 * {@link ReturningOptions}). A migration typically needs nothing from here but
 * `QueryInterface`.
 *
 * Second, {@link database} builds and caches the connection, discovers your compiled
 * model files, and installs SQL logging that can prettify and colourise statements.
 * It is a process-wide singleton — the first call configures it and every later call
 * just hands back the same instance.
 *
 * Third, it supplies the vocabulary a remote caller needs in order to query. Prisma
 * and Sequelize both express filters with values a JSON payload cannot carry —
 * Sequelize's operators are ES symbols — so {@link FilterInput},
 * {@link FieldsInput}, {@link PaginationInput} and {@link OrderByInput} give a
 * serializable equivalent, and the `query` namespace turns them back into Sequelize
 * options. `query.autoQuery` is the one that composes the others.
 *
 * The decorators are the smallest part but the most opinionated: {@link CreatedBy},
 * {@link UpdatedBy} and {@link DeletedBy} stamp the acting user from the RPC request
 * context, and {@link AssociatedWith} declares a relation the query helpers can walk.
 *
 * @example
 * ```typescript
 * // the shape every paginated read method in a service ends up with
 * const where = query.toWhereOptions(query.withRangeFilters(filter));
 * const rows = await LeadModel.findAll(query.autoQuery<FindOptions>(
 *     LeadModel,
 *     fields,
 *     where,
 *     query.toLimitOptions(pageOptions),
 *     query.toOrderOptions(orderBy),
 * ));
 * ```
 *
 * @packageDocumentation
 */

export * from './src/index.js';
