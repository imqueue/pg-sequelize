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
 * It exists to join two things that do not meet on their own: the input a GraphQL API
 * receives — a filter, a page, an order, and the set of fields the query actually
 * selected — and an efficient SQL statement for the service behind it. A resolver
 * passes that input through almost untouched and gets back a query that selects the
 * columns asked for, joins only the relations the selection reaches into, and filters
 * on values that arrived as JSON.
 *
 * The `query` namespace and the serializable input types are what do it. Sequelize
 * writes a filter with ES symbols as its operators, and a symbol cannot survive a JSON
 * payload, so {@link FilterInput}, {@link FieldsInput}, {@link PaginationInput} and
 * {@link OrderByInput} give the wire an equivalent that can. `query.autoQuery` turns
 * them back into Sequelize options, and builds the `include` tree the requested fields
 * imply — which is where the efficiency comes from: a field nobody asked for is not
 * selected, and a relation nobody reached into is not joined.
 *
 * {@link database} builds and caches the connection and discovers your compiled model
 * files. It is a process-wide singleton: the first call configures it, every later one
 * hands back the same instance, and SQL logging that can prettify and colourise
 * statements is installed along the way.
 *
 * It is also the single import surface for the ORM stack, which is what most files in
 * a service touch it for. Everything `sequelize` and `sequelize-typescript` export is
 * re-exported here — `Table`, `Column`, `DataType`, `AllowNull`, `ForeignKey`,
 * `BelongsTo`, `HasMany`, `QueryInterface` and the rest — so a model imports from one
 * place rather than three, and several option types are widened on the way through
 * (see {@link ReturningOptions}). A migration usually needs nothing but
 * `QueryInterface`.
 *
 * The decorators are the smallest part and the most opinionated: {@link CreatedBy},
 * {@link UpdatedBy} and {@link DeletedBy} stamp the acting user from the RPC request
 * context, {@link AssociatedWith} declares a relation the query helpers can walk, and
 * `View` and `DynamicView` let a model be a database view — a parameterised one, whose
 * placeholders are filled in per query.
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
