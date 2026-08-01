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
import { clearObject, isArray, isObject } from './js.js';
import {
    type CountOptions,
    type Includeable,
    Sequelize as SequelizeLib,
    Transaction,
} from 'sequelize';
import {
    Association,
    type FindOptions,
    type IncludeOptions,
    type ModelAttributes,
    Op,
} from 'sequelize';
import { Model } from 'sequelize-typescript';
import type { Literal } from 'sequelize/types/utils';
// type-only: a value import would close the BaseModel -> helpers ->
// query -> BaseModel module cycle, which the synchronous require(esm)
// path used by CommonJS consumers cannot evaluate
import type { BaseModel, SaveOptions } from '../BaseModel.js';
import {
    FieldsInput,
    FILTER_OPS,
    FilterInput,
    OrderByInput,
    OrderDirection,
    PaginationInput,
} from '../types/index.js';
import type { ModelAttributeColumnReferencesOptions } from 'sequelize/types/model';

export namespace query {
    const RX_OP = /^\$/;
    const RX_LIKE = /%/;
    const RX_LTE = /^<=/;
    const RX_GTE = /^>=/;
    const RX_LT = /^</;
    const RX_GT = /^>/;
    const RX_EQ = /^=/;
    const RX_RANGE = /Range$/;
    const RX_SPACE = /\s/;
    const RX_SQL_CLEAN = /\s+(;|$)/;
    const RX_SQL_END = /;?$/;
    const RX_SQL_QUOTE = /'/g;

    interface PureDataFunction {
        <_M extends Model<_M>, T>(
            model: typeof Model,
            input: T,
            attributes?: string[],
        ): ModelAttributes;
        <_M extends Model<_M>, T>(
            model: typeof Model,
            input: T[],
            attributes?: string[],
        ): ModelAttributes[];
    }

    /**
     * Collapses whitespace outside quoted literals, so a statement fits on one line.
     *
     * @remarks
     * Walks the string tracking whether a single quote is open, so runs of
     * whitespace inside a literal are preserved and only structural whitespace is
     * collapsed. Quote tracking is a simple toggle: it does not understand escaped
     * or doubled quotes, so a literal containing one can throw the parity off.
     *
     * @param input - Statement to normalise.
     * @returns The statement with structural whitespace collapsed to single spaces.
     */
    export function safeSqlSpaceCleanup(input: string): string {
        let output = '';
        let opened = false;
        let space = false;

        for (const char of input) {
            if (!opened && RX_SPACE.test(char)) {
                if (!space) {
                    output += ' ';
                }

                space = true;
            } else {
                output += char;
                space = false;
            }

            if (char === "'") {
                opened = !opened;
            }
        }

        return output;
    }

    /**
     * Normalises a SQL string: one-lined, whitespace collapsed, ending in a single
     * semicolon.
     *
     * @remarks
     * Usable as a plain function or as a template tag, the tag form being there so
     * an editor highlights the SQL. It does NOT interpolate: a tag carrying
     * substitutions throws, because the substituted values cannot be reached from
     * here and the statement would come out mangled: tagging
     * `SELECT ... WHERE id = ${id}` used to yield `... id = ,`. Bind parameters are
     * the answer, and they are also the only safe one.
     *
     * Whitespace inside single-quoted literals is preserved; only whitespace
     * outside them is collapsed.
     *
     * @param sqlQuery - A complete statement, or a template with no substitutions.
     * @param values - Template substitutions, which are not supported.
     * @returns The statement on one line, terminated with exactly one `;`.
     * @throws TypeError when used as a template tag with substitutions.
     * @example
     * ```typescript
     * const statement = sql`
     *     SELECT id, name
     *       FROM "Lead"
     *      WHERE status = $1
     * `;
     * // SELECT id, name FROM "Lead" WHERE status = $1;
     * await database().query(statement, { bind: [status] });
     * ```
     */
    export function sql(
        sqlQuery: string | TemplateStringsArray,
        ...values: any[]
    ): string {
        // A tagged template hands the literal parts in as an array, and
        // String() would join them with commas — silently corrupting the
        // statement rather than failing. Refuse instead: every previous caller
        // that interpolated was already producing broken SQL.
        if (values.length && isArray(sqlQuery)) {
            throw new TypeError(
                'query.sql() does not interpolate values: the substitutions ' +
                    'cannot be reached and the statement would be mangled. ' +
                    'Use bind parameters instead.',
            );
        }

        return safeSqlSpaceCleanup(String(sqlQuery))
            .replace(RX_SQL_CLEAN, '')
            .replace(RX_SQL_END, ';');
    }

    /**
     * Keeps only the properties a model actually declares.
     *
     * @remarks
     * The filter for input arriving from outside: anything the model does not declare
     * as an attribute is dropped rather than passed to Sequelize, so a caller cannot
     * set a column by sending an unexpected property. Arrays are mapped element by
     * element, and relations are dropped along with everything else — this looks at
     * `rawAttributes` only.
     *
     * @param model - Model whose attributes define what survives.
     * @param input - One object, or an array of them.
     * @param attributes - Attribute names to allow, defaulting to all the model's.
     * @returns A new object (or array) carrying only the allowed properties.
     */
    export const pureData: PureDataFunction = <T, _M extends BaseModel<_M>>(
        model: typeof Model,
        input: T | T[],
        attributes?: string[],
    ) => {
        attributes = attributes || Object.keys(model.rawAttributes || {});

        if (isArray(input)) {
            return (input as T[]).map(inputItem =>
                pureData(model, inputItem, attributes as string[]),
            );
        }

        return Object.keys(input as any).reduce((res: any, prop: string) => {
            if (~(attributes as string[]).indexOf(prop)) {
                res[prop] = (input as any)[prop];
            }

            return res;
        }, {});
    };

    /**
     * Narrows a requested fields map to the model's own columns.
     *
     * @remarks
     * Relations and unknown names are dropped, and the primary keys are then added
     * back whether or not they were asked for — a deliberate trade so domain logic
     * always has a key to work with, at the cost of returning a column the caller
     * did not request.
     *
     * @param model - Model to narrow against.
     * @param fields - Requested fields map, or a falsy value for "everything".
     * @returns The surviving column names, or `true` meaning no restriction.
     */
    export function pureFields(
        model: typeof BaseModel,
        fields: any,
    ): string[] | true {
        if (!fields) {
            return true;
        }

        const attributes = Object.keys(model.rawAttributes || {});
        const list = Object.keys(
            Object.keys(fields).reduce((res: any, prop: string) => {
                if (~attributes.indexOf(prop)) {
                    res[prop] = fields[prop];
                }

                return res;
            }, {}),
        );

        // make sure it contains primary key fields
        // that's a tiny trade-off to make sure we won't loose it for a domain
        // logic to use
        primaryKeys(model).forEach(
            fieldName => !~list.indexOf(fieldName) && list.push(fieldName),
        );

        return list;
    }

    /**
     * Whether a fields map asks for any of the model's relations.
     *
     * @remarks
     * The cheap test for "does this query need joins at all", used to avoid building
     * an `include` when the caller only wants columns.
     *
     * @param model - Model whose associations to check against.
     * @param fields - Requested fields map.
     * @returns `true` when at least one key names an association.
     */
    export function needNesting(model: typeof Model, fields: any): boolean {
        if (!fields) {
            return false;
        }

        const associations = Object.keys(model.associations || {});
        const properties = Object.keys(fields);

        if (!associations.length) {
            return false;
        }

        return associations.some(name => !!~properties.indexOf(name));
    }

    /**
     * Intersects a set of attributes with the names a caller asked for.
     *
     * @remarks
     * With a `model` given, an empty intersection falls back to that model's primary
     * keys rather than to nothing — so a fields list that matches no column selects
     * the keys instead of every column, which is the safer failure but is not what
     * "no matches" might suggest. Without a `model`, an empty result stays empty.
     *
     * @param attributes - Object whose keys are the available names.
     * @param fields - Names the caller asked for.
     * @param model - Model to take primary keys from when nothing matched.
     * @returns The matching names, or the primary keys, or an empty array.
     */
    export function filtered(
        attributes: any,
        fields: string[],
        model?: typeof BaseModel,
    ): string[] {
        let filteredAttributes = attributes
            ? Object.keys(attributes).filter(attr => ~fields.indexOf(attr))
            : [];

        if (!filteredAttributes.length && model) {
            filteredAttributes = primaryKeys(model);
        }

        return filteredAttributes;
    }

    /**
     * Foreign-key column names on a model for the given relations.
     *
     * @remarks
     * These have to be selected even when the caller did not ask for them, or
     * Sequelize cannot attach the joined rows — which is why `autoQuery` merges them
     * into the attribute list.
     *
     * @param model - Model holding the foreign keys.
     * @param relations - Association names to collect keys for.
     * @returns The foreign-key column names.
     */
    export function foreignKeys(
        model: typeof BaseModel,
        relations: string[],
    ): string[] {
        const associations: {
            [name: string]: Association;
        } = model.associations || {};

        return (
            relations
                .map((name: string) => {
                    const association = (associations[name] || {}) as any;

                    if (
                        association.source === model &&
                        association.foreignKey &&
                        !(
                            association.sourceKey ||
                            association.associationType === 'BelongsToMany'
                        )
                    ) {
                        return association.foreignKey;
                    }

                    return null;
                })
                .filter(idField => idField) || []
        );
    }

    /**
     * Merges given arrays of scalars making sure they contains unique values
     *
     * @param args
     */
    function arrayMergeUnique(...args: any[][]): any[] {
        const result: any[] = [];

        for (const arr of args) {
            result.push(...arr);
        }

        return result.filter((item, index) => result.indexOf(item) === index);
    }

    /**
     * Merges query-option fragments into one options object.
     *
     * @remarks
     * Per property: an absent property is taken as-is, arrays are unioned with
     * duplicates dropped, objects are shallow-assigned, and anything else is
     * overwritten by the later value. A fragment whose property type disagrees with
     * what is already there — a scalar where an array sits, say — throws rather than
     * guessing.
     *
     * MUTATES and returns `queryOptions`, so pass a fresh object unless sharing is
     * what you want.
     *
     * @param queryOptions - Target, mutated in place.
     * @param merge - Fragments to merge, in order; falsy ones are skipped.
     * @returns The same `queryOptions` object.
     * @throws TypeError when a fragment's property type conflicts with the target's.
     */
    export function mergeQuery(queryOptions: any = {}, ...merge: any[]): any {
        for (const item of merge) {
            if (!item) {
                continue;
            }

            for (const prop of Object.keys(item)) {
                const err = `Given ${prop} option is invalid!`;

                if (typeof queryOptions[prop] === 'undefined') {
                    queryOptions[prop] = item[prop];
                    continue;
                }

                if (typeof item[prop] === 'undefined') {
                    continue;
                }

                if (isArray(queryOptions[prop])) {
                    if (!isArray(item[prop])) {
                        throw new TypeError(err);
                    }

                    for (const element of item[prop]) {
                        if (!~queryOptions[prop].indexOf(element)) {
                            queryOptions[prop].push(element);
                        }
                    }
                    continue;
                }

                if (isObject(queryOptions[prop])) {
                    if (!isObject(item[prop])) {
                        throw new TypeError(err);
                    }

                    Object.assign(queryOptions[prop], item[prop]);
                    continue;
                }

                queryOptions[prop] = item[prop];
            }
        }

        return queryOptions;
    }

    /**
     * Builds Sequelize find options from a requested fields map, joins included.
     *
     * @remarks
     * The helper the others compose into. It turns a {@link FieldsInput} into
     * `attributes` plus a nested `include` for every relation the map mentions,
     * recursing into each level, and adds the foreign keys a join needs whether or
     * not they were requested. Its rest parameter then merges the fragments the
     * sibling helpers return, which is the intended shape of a paginated read.
     *
     * A value in the map that is not `false` doubles as a filter for that column, so
     * a fields map can carry a where clause; see {@link FieldsInput} for why presence
     * rather than value is what selects.
     *
     * Two things to know. It MUTATES the `fields` map, adding any column named in a
     * merged `order` that the map omits, so ordering cannot break selection. And
     * `fields` may also be a plain array of names, which selects those columns and
     * builds no joins at all.
     *
     * @param model - Model to build the query for.
     * @param fields - Requested fields map, or an array of column names.
     * @param merge - Option fragments to merge in, typically from the helpers below.
     * @returns Find options, typed as the caller asks.
     * @example
     * ```typescript
     * const where = toWhereOptions(withRangeFilters(filter));
     * const rows = await LeadModel.findAll(autoQuery<FindOptions>(
     *     LeadModel,
     *     fields,
     *     where,
     *     toLimitOptions(pageOptions),
     *     toOrderOptions(orderBy),
     * ));
     * ```
     */
    export function autoQuery<T>(
        model: any,
        fields?: any,
        ...merge: (Partial<T> | undefined)[]
    ): T {
        const queryOptions: any = {};
        const { order } =
            merge.find((item: any) => item && !!item.order) || ({} as any);

        if (order && isArray(order)) {
            // make sure order arg will not break selection
            for (const [field] of order) {
                if (fields && typeof fields[field] === 'undefined') {
                    fields[field] = false;
                }
            }
        }

        if (isArray(fields)) {
            queryOptions.attributes = filtered(
                model.rawAttributes,
                fields,
                model,
            );
        } else if (fields) {
            const fieldNames = Object.keys(fields);
            // relations which are requested by a user
            const relations = filtered(model.associations, fieldNames);
            // attributes which are requested by a user
            queryOptions.attributes = arrayMergeUnique(
                filtered(model.rawAttributes, fieldNames, model),
                foreignKeys(model, relations),
            );

            // we may want to check if the given field is being filtered
            // and build where clause for it
            Object.assign(
                queryOptions,
                toWhereOptions(
                    queryOptions.attributes.reduce((res: any, attr: string) => {
                        if (fields[attr] !== false) {
                            res[attr] = fields[attr];
                        }

                        return res;
                    }, {}),
                ),
            );

            if (relations.length) {
                queryOptions.include = [];

                for (const rel of relations) {
                    const relModel = model.associations[rel].target;

                    // noinspection TypeScriptUnresolvedVariable
                    queryOptions.include.push({
                        model: relModel,
                        as: model.associations[rel].options.as,
                        ...autoQuery<any>(relModel, fields[rel]),
                    } as any);
                }
            }
        }

        if (merge.length) {
            mergeQuery(queryOptions, ...merge);
        }

        return queryOptions as T;
    }

    /**
     * Return names of primary key fields for a given model.
     *
     * @param model
     */
    export function primaryKeys(model: typeof BaseModel): string[] {
        const fields = model.rawAttributes;

        return Object.keys(fields).filter(name => fields[name].primaryKey);
    }

    /**
     * Related entity arguments type used to be passed to createEntity()
     * subsequent calls.
     */
    type RelationArgs = [
        any,
        any,
        FieldsInput | undefined,
        Transaction | undefined,
        string,
    ][];

    /**
     * Foreign key map representation, where related property name references
     * parent property name.
     */
    interface ForeignKeyMap {
        [property: string]: string;
    }

    /**
     * Returns foreign key map for a given pair of parent model and related
     * model.
     *
     * @param parent
     * @param model
     */
    export function foreignKeysMap(
        parent: typeof BaseModel,
        model: typeof BaseModel,
    ): ForeignKeyMap | null {
        let found = false;

        const map: ForeignKeyMap = Object.keys(model.rawAttributes).reduce(
            (fkMap, name) => {
                const relation = model.rawAttributes[name]
                    .references as ModelAttributeColumnReferencesOptions;

                if (
                    relation &&
                    relation.model === parent.name &&
                    relation.key
                ) {
                    fkMap[name] = relation.key;
                    found = true;
                }

                return fkMap;
            },
            {} as ForeignKeyMap,
        );

        return found ? map : null;
    }

    /**
     * Prepares input for a given model and builds found relation arguments
     *
     * @param input
     * @param relations
     * @param model
     * @param fields
     * @param transaction
     * @param parent
     */
    function prepareInput<T extends BaseModel<T>>(
        input: any,
        relations: string[],
        model: typeof BaseModel,
        fields?: FieldsInput,
        transaction?: Transaction,
        parent?: T,
    ): RelationArgs {
        const args: RelationArgs = [];

        for (const relation of relations) {
            args.push([
                model.associations[relation].target,
                input[relation],
                fields ? (fields[relation] as FieldsInput) : undefined,
                transaction,
                relation,
            ]);

            delete input[relation];
        }

        if (parent) {
            const foreignKey = foreignKeysMap(
                parent.constructor as typeof BaseModel,
                model,
            );

            if (foreignKey) {
                Object.keys(foreignKey).forEach(property => {
                    if (!(input as any)[property]) {
                        (input as any)[property] = (parent as any)[
                            foreignKey[property]
                        ];
                    }
                });
            }
        }

        return args;
    }

    /**
     * Recursively creates entity and all it's relations from a given input
     * using a given model.
     *
     * @param model - model class to map entity to
     * @param input - data input object related to a given model
     * @param fields - fields map to return on created entity
     * @param transaction - transaction
     */
    export async function createEntity<T extends BaseModel<T>, I>(
        model: typeof BaseModel,
        input: I,
        fields?: FieldsInput,
        transaction?: Transaction,
    ): Promise<Partial<T>> {
        return await doCreateEntity<T, I>(
            model,
            input,
            fields,
            transaction,
            undefined,
            undefined,
            false,
            !transaction,
        );
    }

    /**
     * Recursively creates entity and all it's relations from a given input
     * using a given model.
     *
     * @param model
     * @param input
     * @param fields
     * @param transaction
     * @param parentProperty
     * @param noAppend
     * @param parent
     * @param doCommit
     */
    async function doCreateEntity<T extends BaseModel<T>, I>(
        model: typeof BaseModel,
        input: I | I[],
        fields?: FieldsInput,
        transaction?: Transaction,
        parentProperty?: string,
        parent?: T,
        noAppend: boolean = false,
        doCommit: boolean = true,
    ): Promise<Partial<T>> {
        // the package root is imported lazily at call time: a static import
        // here would close a module cycle (index -> helpers -> index) that
        // the synchronous require(esm) path used by CommonJS consumers
        // cannot evaluate (bindings would stay undefined)
        const { database } = await import('../index.js');

        transaction =
            transaction ||
            (await database().transaction({
                autocommit: false,
            }));

        // todo: this could be optimized through bulk operations
        if (isArray(input) && parentProperty && parent) {
            parent.appendChild(
                parentProperty,
                await Promise.all(
                    (input as I[]).map(inputItem =>
                        doCreateEntity(
                            model,
                            inputItem,
                            fields,
                            transaction,
                            parentProperty,
                            parent,
                            true,
                            doCommit,
                        ),
                    ),
                ),
            );

            return parent;
        }

        if (fields) {
            primaryKeys(model).forEach(
                name => !fields[name] && (fields[name] = false),
            );
        }

        const fieldNames = Object.keys(input as any);
        const relationArgs = prepareInput<T>(
            input,
            filtered(model.associations, fieldNames),
            model,
            fields,
            transaction,
            parent,
        );
        const entity = new (model as any)(input as any as ModelAttributes);

        await entity.save({
            transaction,
            returning: fields
                ? filtered(model.rawAttributes, Object.keys(fields), model)
                : true,
        } as SaveOptions);

        if (!noAppend && parentProperty && parent) {
            parent.appendChild(parentProperty, entity);
        }

        await Promise.all(
            relationArgs.map(async args => {
                args.push(entity);
                await doCreateEntity(...args);
            }),
        );

        if (!parent && doCommit) {
            await transaction.commit();
        }

        return entity;
    }

    /**
     * The counting counterpart of {@link query.autoQuery}, for the same fields and filter.
     *
     * @remarks
     * Builds the same query, then drops `attributes` and counts distinct primary keys
     * instead — `distinct` matters because the joins `autoQuery` adds would otherwise
     * multiply a row once per joined record and inflate the total.
     *
     * Pass it the same `fields` and filter as the data query, or the two disagree.
     *
     * @param model - Model to count rows of.
     * @param fields - The same fields map used for the data query.
     * @param merge - The same filter fragments, minus limit and order.
     * @returns Count options ready for `Model.count()`.
     */
    export function autoCountQuery(
        model: any,
        fields?: any,
        ...merge: (Partial<CountOptions> | undefined)[]
    ): CountOptions {
        const queryOptions = autoQuery<CountOptions>(model, fields, ...merge);

        if (queryOptions.attributes) {
            delete queryOptions.attributes;
        }

        queryOptions.distinct = true;
        queryOptions.col = primaryKeys(model).shift() as string;

        return queryOptions;
    }

    /**
     * Builds proper paging options query part
     *
     * @param pageOptions - obtained pagination input
     *                                          from remote
     * @returns pagination part of the query
     */
    export function toLimitOptions<_T>(
        pageOptions?: PaginationInput,
    ): FindOptions {
        const page: FindOptions = {};

        if (!pageOptions || !+pageOptions.limit) {
            return page;
        }

        page.offset = 0;
        page.limit = 0;

        const count = pageOptions.count || 0;

        if (pageOptions.offset) {
            page.offset = pageOptions.offset;
        }

        if (pageOptions.limit) {
            page.limit = Math.abs(pageOptions.limit);
        }

        if (pageOptions.limit < 0) {
            if (page.offset === 0) {
                page.offset = count - page.limit;
            }

            if (page.offset < 0) {
                page.offset = 0;
            }
        }

        return page;
    }

    /**
     * Ensures order by value is correct or returns default (ASC) if not. This
     * would prevent from any possible injections or errors.
     *
     * @param value
     */
    function toOrderDirection(value: any): OrderDirection {
        if (String(value).toLocaleLowerCase() === 'desc') {
            return OrderDirection.desc;
        } else {
            return OrderDirection.asc;
        }
    }

    /**
     * Constructs order by part of the query from a given input orderBy object
     *
     * @param orderBy
     */
    export function toOrderOptions<_T>(orderBy?: OrderByInput): FindOptions {
        const order: FindOptions = {};

        if (!orderBy) {
            return order;
        }

        const fields: string[] = Object.keys(orderBy);

        if (!fields.length) {
            return order;
        }

        order.order = [];

        for (const field of fields) {
            (order.order as [string, string][]).push([
                field,
                toOrderDirection(orderBy[field]),
            ]);
        }

        return order;
    }

    /**
     * Adds or null check to a given where field values
     *
     * @param value
     */
    export function orNull(value: string | string[]): Partial<FindOptions> {
        if (isArray(value)) {
            return { [Op.or]: [null, ...value] } as FindOptions;
        }

        return { [Op.or]: [null, value] } as FindOptions;
    }

    /**
     * Rich filters implementation. Actually by doing this we allow outside
     * calls to replicate what sequelize does for us: building rich where
     * clauses.
     *
     * @param filter
     */
    function parseFilter<_T>(filter: FilterInput): FindOptions {
        const clause: FindOptions = {};

        if (Object.prototype.toString.call(filter) === '[object Object]') {
            for (const op of Object.keys(filter)) {
                if ((FILTER_OPS as any)[op]) {
                    (clause as any)[(FILTER_OPS as any)[op]] = parseFilter(
                        (filter as any)[op],
                    );
                } else {
                    (clause as any)[op] = parseFilter((filter as any)[op]);
                }
            }
        } else {
            // that's recursive value reached
            return filter as any;
        }

        return clause;
    }

    /**
     * This gives us an ability to simulate ILIKE, <, >, <=, >=, = right withing
     * given values in the filter.
     *
     * @param prop
     * @param data
     */
    function parseFilterValue<_T>(prop: string, data: any): FindOptions {
        const value: any = { [prop]: data };

        if (typeof data !== 'string') {
            return value;
        }

        if (RX_LIKE.test(data)) {
            value[prop] = { [Op.iLike]: data };
        } else if (RX_GTE.test(data)) {
            value[prop] = { [Op.gte]: parseValue(data.replace(RX_GTE, '')) };
        } else if (RX_GT.test(data)) {
            value[prop] = { [Op.gt]: parseValue(data.replace(RX_GT, '')) };
        } else if (RX_LTE.test(data)) {
            value[prop] = { [Op.lte]: parseValue(data.replace(RX_LTE, '')) };
        } else if (RX_LT.test(data)) {
            value[prop] = { [Op.lt]: parseValue(data.replace(RX_LT, '')) };
        } else if (RX_EQ.test(data)) {
            value[prop] = { [Op.eq]: parseValue(data.replace(RX_EQ, '')) };
        }

        return value as FindOptions;
    }

    /**
     * Parses a given value
     * @param value
     */
    function parseValue(value: string) {
        try {
            const date = new Date(value);
            if (date.toISOString() === value) {
                return date;
            }
        } catch {
            /* not a date */
        }

        return +value + '' === value ? +value : value;
    }

    /**
     * Turns a serializable filter into Sequelize `where` options.
     *
     * @remarks
     * Each property is dispatched on its shape: a `$`-prefixed key becomes the
     * matching Sequelize operator (see {@link FILTER_OPS}), an object with `start`
     * and `end` becomes a `BETWEEN`, any other object is walked recursively as a
     * nested filter, an array becomes an OR of its values, and a scalar is compared
     * directly.
     *
     * A STRING value is inspected before it is compared, which is convenient and
     * occasionally surprising. A `%` anywhere in it makes the comparison a
     * case-insensitive `ILIKE`, and a leading `<=`, `>=`, `<`, `>` or `=` becomes
     * that operator with the rest as the value, coerced to a number or a `Date` when
     * it parses as one. So `'>=10'` and `'%abc%'` work with no operator key — and a
     * literal value that happens to contain `%`, such as `'50% off'`, becomes a
     * pattern match rather than an equality test. Use an explicit `$eq` where that
     * matters.
     *
     * Empty is treated as absent, not as a contradiction: an empty array is skipped
     * and a single-element array is unwrapped to the value. Given a falsy filter it
     * returns `{}`, which means "no restriction" — so a caller cannot accidentally
     * filter everything out by passing nothing.
     *
     * With `inputType`, a property matching one of that type's own properties is
     * turned into a required `include` on the related model rather than a column
     * comparison, which is how a filter reaches across a relation.
     *
     * @param filter - Filter from a caller. Modified in place as empties are cleared.
     * @param inputType - Constructor describing which properties are relations.
     * @returns Options carrying `where` and, where relations were filtered, `include`.
     */
    export function toWhereOptions<T>(
        filter?: T,
        inputType?: new () => T,
    ): any {
        if (!filter) {
            return {};
        }

        clearObject(filter);

        let inputData = null;

        if (inputType) {
            inputData = new inputType();
        }

        const options: any = {};

        for (const prop of Object.keys(filter)) {
            let data: any = (filter as any)[prop];
            const inputDataProp = inputData && (inputData as any)[prop];

            if (inputData && inputDataProp) {
                const includeData = {
                    model: inputDataProp.model,
                    required: true,
                    ...toWhereOptions(
                        withRangeFilters(data),
                        inputDataProp.input,
                    ),
                };

                // NOTE: If included data contains fields which are empty,
                // it should be deleted
                clearObject(filter);
                options.include = isArray(options.include)
                    ? options.include.concat(includeData)
                    : [includeData];

                continue;
            }

            if (isArray(data)) {
                if (data.length === 0) {
                    continue;
                }

                if (data.length === 1) {
                    data = data[0];
                }
            }

            if (data === undefined) {
                continue;
            }

            options.where = options.where || {};

            if (RX_OP.test(prop)) {
                Object.assign(
                    options.where,
                    parseFilter({ [prop]: data } as FilterInput),
                );
            } else if (data && data.start && data.end) {
                // range filter
                Object.assign(options.where, {
                    [prop]: { [Op.between]: [data.start, data.end] },
                });
            } else if (
                Object.prototype.toString.call(data) === '[object Object]'
            ) {
                Object.assign(options.where, { [prop]: parseFilter(data) });
            } else if (isArray(data)) {
                Object.assign(options.where, {
                    [prop]: buildWhereFromArray(data),
                });
            } else {
                Object.assign(options.where, parseFilterValue(prop, data));
            }
        }

        return options;
    }

    /**
     * ORs an array of filter values into one condition.
     *
     * @remarks
     * Plain values are gathered into a single `IN`, while values carrying their own
     * operator prefix become separate conditions, and the two groups are then ORed —
     * so `['a', 'b', '>=10']` becomes `IN (a, b) OR >= 10` rather than three
     * unrelated comparisons.
     *
     * @param data - Values to combine.
     * @returns A `where` fragment for one column.
     */
    export function buildWhereFromArray(data: any[]): any {
        const ops: any[] = [];
        const ins: any[] = [];

        for (const value of data) {
            if (RX_LIKE.test(value)) {
                ops.push({ [Op.iLike]: value });
            } else if (RX_GTE.test(value)) {
                ops.push({ [Op.gte]: parseValue(value.replace(RX_GTE, '')) });
            } else if (RX_GT.test(value)) {
                ops.push({ [Op.gt]: parseValue(value.replace(RX_GT, '')) });
            } else if (RX_LTE.test(value)) {
                ops.push({ [Op.lte]: parseValue(value.replace(RX_LTE, '')) });
            } else if (RX_LT.test(value)) {
                ops.push({ [Op.lt]: parseValue(value.replace(RX_LT, '')) });
            } else if (RX_EQ.test(value)) {
                ops.push({ [Op.eq]: parseValue(value.replace(RX_EQ, '')) });
            } else {
                ins.push(value);
            }
        }

        if (!ops.length && ins.length) {
            return { [Op.in]: ins };
        }

        if (ins.length) {
            ops.push({ [Op.in]: ins });
        }

        return { [Op.or]: ops };
    }

    /**
     * Rewrites `<column>Range` filter properties onto the columns they belong to.
     *
     * @remarks
     * The convention that lets a range be filtered over RPC: a caller sends
     * `durationRange: { start, end }` and this moves it to `duration`, where
     * {@link query.toWhereOptions} turns it into a `BETWEEN`. Recognition is strict — the
     * property name must end in `Range` and the value must have exactly the keys
     * `start` and `end`, in either order. Anything else is left untouched and
     * filtered as an ordinary value, and nested objects are walked so a range on a
     * related model works too.
     *
     * Sending both `duration` and `durationRange` throws rather than choosing one.
     *
     * MUTATES and returns the filter it is given.
     *
     * @param filter
     */
    export function withRangeFilters(filter: any) {
        if (!filter) {
            return filter;
        }

        for (const prop of Object.keys(filter)) {
            const col = prop.replace(RX_RANGE, '');

            if (col === prop) {
                // not a range filter
                if (isObject(filter[prop])) {
                    withRangeFilters(filter[prop]);
                }

                continue;
            }

            const signature = Object.keys(filter[prop]) + '';

            if (!~['start,end', 'end,start'].indexOf(signature)) {
                continue; // not a range filter signature
            }

            if (filter[col]) {
                throw new TypeError(
                    `Only one of filtering options "${
                        col
                    }" or "${prop}" can be passed as filtering option!`,
                );
            }

            filter[col] = filter[prop];
            delete filter[prop];
        }

        return filter;
    }

    /**
     * Looks up and returns include options in a given query using an array of
     * given models as a search path
     *
     * @param queryOptions
     * @param path
     */
    export function getInclude(
        queryOptions: FindOptions,
        path: (typeof Model)[],
    ): IncludeOptions | null {
        const currentModel = path.shift();

        for (const include of (queryOptions.include as any) || []) {
            const model = (include as IncludeOptions).model;

            // noinspection JSIncompatibleTypesComparison
            if (model === currentModel) {
                if (!path.length) {
                    return include as IncludeOptions;
                } else {
                    return getInclude(include as FindOptions, path);
                }
            }
        }

        return null;
    }

    /**
     * Builds a Sequelize literal from a string or a template — the escape hatch for
     * SQL that no query option can express.
     *
     * @remarks
     * A literal is spliced into the statement exactly as given, so nothing about it
     * is parsed, checked or escaped. That is the whole point of it, and the reason to
     * keep each one as small as the job allows: a correlated subquery in a `where`, a
     * window function in an `order`, an operator Sequelize has no name for. Runtime
     * values belong in {@link query.E} rather than in the text.
     *
     * Used as a template tag, the substitutions used to be dropped and the literal
     * parts joined with commas, so the example below produced
     * `(SELECT COUNT(*) FROM "SomeTable" WHERE owner = ,) = 0` — accepted by the
     * template, rejected by Postgres. They are now interpolated in order.
     *
     * {@link query.sql} refuses substitutions rather than interpolating them, and the
     * difference is deliberate: a complete statement can carry bind parameters, so
     * interpolating into one is a choice to avoid. A fragment handed to Sequelize as
     * a literal has no bind channel, which leaves escaping as the only option.
     *
     * @param str - The SQL text, or the literal parts when used as a template tag.
     * @param values - The substitutions, when used as a template tag.
     * @returns The text as a Sequelize literal, ready to use as a query option value.
     * @example
     * ```typescript
     * const owner = 3;
     * const query = {
     *     where: L`(SELECT COUNT(*) FROM "SomeTable" WHERE owner = ${E(owner)}) = 0`,
     * };
     * ```
     */
    export function L(
        str: TemplateStringsArray | string,
        ...values: any[]
    ): Literal {
        if (typeof str === 'string') {
            return SequelizeLib.literal(str);
        }

        return SequelizeLib.literal(
            str.reduce((text, part, i) => text + String(values[i - 1]) + part),
        );
    }

    /**
     * Renders a value as a SQL constant: a number as itself, a string quoted and
     * escaped, anything else as `NULL`.
     *
     * @remarks
     * The companion to {@link query.L} and the only safe way to get a runtime value
     * into a literal. Single quotes inside a string are doubled, which is what
     * Postgres requires — and what this did not do: a value of `O'Brien` came out as
     * a broken string constant, and a value chosen deliberately came out as SQL. The
     * same path escapes a dynamic view's parameters, so a view selected with
     * caller-supplied `viewParams` was open the same way.
     *
     * Only numbers and strings render as values. Booleans, dates, objects, `null` and
     * `undefined` all become `NULL` — so format a date as a string before passing it,
     * and do not reach for this to render a boolean.
     *
     * @param input - Value to render.
     * @returns The number itself, a quoted and escaped string, or `NULL`.
     */
    export function E(input: any) {
        if (typeof input === 'number') {
            return +input;
        }

        if (typeof input === 'string') {
            return `'${input.replace(RX_SQL_QUOTE, "''")}'`;
        }

        return 'NULL';
    }

    /**
     * Removes given properties from the given object
     *
     * @param obj
     * @param props
     */
    export function skip(obj: any, ...props: string[]) {
        if (!obj) {
            return obj;
        }

        for (const prop of props) {
            delete obj[prop];
        }

        return obj;
    }

    /**
     * Traverses given query object, lookups for includes matching
     * the given arguments of include options and overrides those are matching
     * by model and alias with the provided option.
     *
     * @param queryOptions
     * @param options
     */
    export function overrideJoin(
        queryOptions: FindOptions | CountOptions,
        ...options: IncludeOptions[]
    ): FindOptions | CountOptions {
        if (!(queryOptions && queryOptions.include) || !options.length) {
            return queryOptions;
        }

        for (const { model, ...fields } of options) {
            let found = false;

            for (const include of queryOptions.include as IncludeOptions[]) {
                const as = fields.as;

                if (
                    (include as any) === model ||
                    (include.model === model && (!as || as === include.as))
                ) {
                    Object.assign(include, fields);
                    found = true;
                }
            }

            if (!found) {
                (queryOptions.include as any[]).push({
                    model,
                    ...fields,
                } as Includeable);
            }
        }

        return queryOptions;
    }
}
