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
import { js, object } from '@imqueue/js';
import { CountOptions, Includeable, Transaction } from 'sequelize';
import {
    Association,
    FindOptions,
    IncludeOptions,
    ModelAttributes,
    Op,
} from 'sequelize';
import { Model } from 'sequelize-typescript';
import { Literal } from 'sequelize/types/lib/utils';
import { database } from '..';
import { BaseModel, SaveOptions, Sequelize } from '../BaseModel';
import {
    FieldsInput,
    FILTER_OPS,
    FilterInput,
    OrderByInput,
    OrderDirection,
    PaginationInput,
} from '../types';

export namespace query {
    import isObject = js.isObject;
    import isArray = js.isArray;

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

    interface PureDataFunction {
        <M extends Model<M>, T>(
            model: typeof Model,
            input: T,
            attributes?: string[],
        ): ModelAttributes;
        <M extends Model<M>, T>(
            model: typeof Model,
            input: T[],
            attributes?: string[],
        ): ModelAttributes[];
    }

    /**
     * Performs safe trimming space characters inside SQL query input string
     * and inline it.
     *
     * @param {string} input - input string
     * @return {string} - sanitized string
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

            if (char === '\'') {
                opened = !opened;
            }
        }

        return output;
    }

    // tslint:disable-next-line:max-line-length
    // noinspection JSUnusedGlobalSymbols
    /**
     * SQL tag used to tag sql queries
     *
     * @param {string | TemplateStringsArray} sqlQuery
     * @param {...any[]} [rest] - anything else
     * @return {string}
     */
    export function sql(
        sqlQuery: string | TemplateStringsArray,
        ...rest: any[]
    ): string {
        return safeSqlSpaceCleanup(String(sqlQuery))
            .replace(RX_SQL_CLEAN, '')
            .replace(RX_SQL_END, ';');
    }

    /**
     * Extracts pure data from given input data for a given model
     *
     * @param {typeof Model} model
     * @param {any | any[]} input
     * @param {string[]} [attributes]
     * @return {any}
     */
    export const pureData: PureDataFunction = <T, M extends BaseModel<M>>(
        model: typeof BaseModel,
        input: T | T[],
        attributes?: string[],
    ) => {
        attributes = attributes || Object.keys(model.rawAttributes || {});

        if (isArray(input)) {
            return (input as T[]).map(inputItem => pureData(
                model,
                inputItem,
                attributes as string[],
            ));
        }

        return Object.keys(input as any).reduce((res: any, prop: string) => {
            if (~(attributes as string[]).indexOf(prop)) {
                res[prop] = (input as any)[prop];
            }

            return res;
        }, {});
    };

    // noinspection JSUnusedGlobalSymbols
    /**
     * Omits non-related properties from a given fields map object associated
     * with the given model
     *
     * @param {typeof Model} model
     * @param {any} fields
     * @return {string[]}
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
        primaryKeys(model).forEach(fieldName =>
            !~list.indexOf(fieldName) && list.push(fieldName),
        );

        return list;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Returns true if given fields contains associations from given model,
     * false otherwise
     *
     * @param {typeof Model} model
     * @param {any} fields
     * @return {boolean}
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
     * Returns list of filtered attributes from model through a given list of
     * user requested fields
     *
     * @param {any} attributes
     * @param {string[]} fields
     * @param {typeof BaseModel} [model]
     * @return {string[]}
     */
    export function filtered(
        attributes: any,
        fields: string[],
        model?: typeof BaseModel,
    ): string[] {
        let filteredAttributes = (attributes
            ? Object.keys(attributes).filter(attr => ~fields.indexOf(attr))
            : []);

        if (!filteredAttributes.length && model) {
            filteredAttributes = primaryKeys(model);
        }

        return filteredAttributes;
    }

    /**
     * Extracts foreign keys existing on the given model for a given list of
     * associations and returns as field names list
     *
     * @param {typeof BaseModel} model
     * @param {string[]} relations
     * @return {string[]}
     */
    export function foreignKeys(
        model: typeof BaseModel,
        relations: string[],
    ): string[] {
        const associations: {
            [name: string]: Association,
        } = model.associations || {};

        return relations.map((name: string) => {
            const association = (associations[name] || {}) as any;

            if (association.source === model &&
                association.foreignKey && (!(
                    association.sourceKey ||
                    association.associationType === 'BelongsToMany'
                ))
            ) {
                return association.foreignKey;
            }

            return null;
        })
            .filter(idField => idField) || [];
    }

    /**
     * Merges given arrays of scalars making sure they contains unique values
     *
     * @param {any[][]} args
     * @return {any[]}
     */
    function arrayMergeUnique(...args: any[][]): any[] {
        const result: any[] = [];

        for (const arr of args) {
            result.push(...arr);
        }

        return result.filter((item, index) => result.indexOf(item) === index);
    }

    /**
     * Makes sure all merge arguments are merged into a given query
     *
     * @param {any} [queryOptions]
     * @param {...any[]} merge
     * @return - merged query options
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
     * Automatically map query joins and requested attributes from a given
     * fields map to a given model and returns query find options. Additionally
     * will merge all given options as the rest arguments.
     *
     * @param {Model} model - model to build query for
     * @param {any} fields - map of the fields requested by a user or a list
     *                       of fields for a root object (without associations)
     * @param {...Array<Partial<T> | undefined>} merge - other query parts to
     *                                                   merge with
     * @return {T} - query options type specified by a call
     */
    export function autoQuery<T>(
        model: any,
        fields?: any,
        ...merge: (Partial<T> | undefined)[]
    ): T {
        const queryOptions: any = {};
        const { order } = merge.find((item: any) => item && !!item.order) ||
            {} as any;

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
                model.rawAttributes, fields, model,
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
            Object.assign(queryOptions, toWhereOptions(
                queryOptions.attributes.reduce((res: any, attr: string) => {
                    if (fields[attr] !== false) {
                        res[attr] = fields[attr];
                    }

                    return res;
                }, {}),
            ));

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
     * @param {typeof BaseModel} model
     * @return {string[]}
     */
    export function primaryKeys(model: typeof BaseModel): string[] {
        const fields = model.rawAttributes;

        return Object.keys(fields).filter(name => fields[name].primaryKey);
    }

    /**
     * Related entity arguments type used to be passed to createEntity()
     * subsequent calls.
     *
     * @type {RelationArgs}
     * @access private
     */
    type RelationArgs = [
        any,
        any,
        FieldsInput | undefined,
        Transaction | undefined,
        string
    ][];

    /**
     * Foreign key map representation, where related property name references
     * parent property name.
     *
     * @type {ForeignKeyMap}
     * @access private
     */
    interface ForeignKeyMap {
        [property: string]: string;
    }

    /**
     * Returns foreign key map for a given pair of parent model and related
     * model.
     *
     * @param {typeof BaseModel} parent
     * @param {typeof BaseModel} model
     * @return {ForeignKeyMap}
     * @access private
     */
    export function foreignKeysMap(
        parent: typeof BaseModel,
        model: typeof BaseModel,
    ): ForeignKeyMap | null {
        let found = false;

        const map: ForeignKeyMap = Object.keys(model.rawAttributes)
            .reduce((fkMap, name) => {
                const relation = model.rawAttributes[name].references;

                if (relation &&
                    relation.model === parent.name && relation.key
                ) {
                    fkMap[name] = relation.key;
                    found = true;
                }

                return fkMap;
            }, {} as ForeignKeyMap);

        return found ? map : null;
    }

    /**
     * Prepares input for a given model and builds found relation arguments
     *
     * @access private
     * @param {any} input
     * @param {string[]} relations
     * @param {typeof BaseModel} model
     * @param {FieldsInput} [fields]
     * @param {Transaction} [transaction]
     * @param {T} [parent]
     * @return {RelationArgs}
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
                fields ? fields[relation] as FieldsInput : undefined,
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

            foreignKey && Object.keys(foreignKey).forEach(property => {
                if (!(input as any)[property]) {
                    (input as any)[property] = (parent as any)[
                        foreignKey[property]
                    ];
                }
            });
        }

        return args;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Recursively creates entity and all it's relations from a given input
     * using a given model.
     *
     * @param {T} model - model class to map entity to
     * @param {I} input - data input object related to a given model
     * @param {FieldsInput} [fields] - fields map to return on created entity
     * @param {Transaction} [transaction] - transaction
     * @return {Promise<Partial<T>>}
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
     * @param {T} model
     * @param {I | I[]} input
     * @param {FieldsInput} [fields]
     * @param {Transaction} [transaction]
     * @param {string} [parentProperty]
     * @param {boolean} [noAppend]
     * @param {T} parent
     * @param {boolean} doCommit
     * @return {Promise<Partial<T>>}
     * @access private
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
        transaction = transaction || await database().transaction({
            autocommit: false,
        });

        // todo: this could be optimized through bulk operations
        if (isArray(input) && parentProperty && parent) {
            parent.appendChild(
                parentProperty,
                await Promise.all((input as I[]).map(inputItem =>
                    doCreateEntity(
                        model, inputItem, fields, transaction,
                        parentProperty, parent, true, doCommit,
                    )),
                ),
            );

            return parent;
        }

        if (fields) {
            primaryKeys(model).forEach(name =>
                !fields[name] && (fields[name] = false));
        }

        const fieldNames = Object.keys(input as any);
        const relationArgs = prepareInput<T>(
            input, filtered(model.associations, fieldNames),
            model, fields, transaction, parent);
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

        await Promise.all(relationArgs.map(async args => {
            args.push(entity);
            await doCreateEntity(...args);
        }));

        if (!parent && doCommit) {
            await transaction.commit();
        }

        return entity;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Builds and returns count query for a given query options and model.
     *
     * @param {Model} model
     * @param {any} fields
     * @param {Array<Partial<CountOptions> | undefined>} merge
     * @return {CountOptions}
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

    // noinspection JSUnusedGlobalSymbols
    /**
     * Builds proper paging options query part
     *
     * @param {PaginationInput} [pageOptions] - obtained pagination input
     *                                          from remote
     * @return {FindOptions} - pagination part of the query
     */
    export function toLimitOptions<T>(
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
     * @param {any} value
     * @return {OrderDirection}
     */
    function toOrderDirection(value: any): OrderDirection {
        if (String(value).toLocaleLowerCase() === 'desc') {
            return OrderDirection.desc;
        } else {
            return OrderDirection.asc;
        }
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Constructs order by part of the query from a given input orderBy object
     *
     * @param {any} orderBy
     */
    export function toOrderOptions<T>(
        orderBy?: OrderByInput,
    ): FindOptions {
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
            (order.order as [string, string][]).push(
                [field, toOrderDirection(orderBy[field])],
            );
        }

        return order;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Adds or null check to a given where field values
     *
     * @param {string | string[]} value
     * @return {FindOptions}
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
     * @param {FilterInput} filter
     * @return {FindOptions}
     */
    function parseFilter<T>(filter: FilterInput): FindOptions {
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
     * @param {string} prop
     * @param {any} data
     * @return {IFindOptions<T>>}
     */
    function parseFilterValue<T>(prop: string, data: any): FindOptions {
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
        } catch (err) { /* not a date */ }

        return ((+value + '') === value) ? +value : value;
    }

    /**
     * Builds toWhereOptions clause query sub-part for a given filter type
     *
     * @param {T} filter
     * @param {new () => T} inputType
     * @return {any} - toWhereOptions clause options
     */
    export function toWhereOptions<T>(
        filter?: T,
        inputType?: new () => T,
    ): any {
        if (!filter) {
            return {};
        }

        object.clearObject(filter);

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
                    ...toWhereOptions(withRangeFilters(data),
                        inputDataProp.input,
                    ),
                };

                // NOTE: If included data contains fields which are empty,
                // it should be deleted
                object.clearObject(filter);
                options.include = js.isArray(options.include)
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
                    parseFilter({ [prop]: data, } as FilterInput),
                );
            } else if (data && data.start && data.end) { // range filter
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
     * Builds where operations (conditions) from an array of values using
     * OR operator between given conditions.
     *
     * @param {any[]} data
     * @return any
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

    // noinspection JSUnusedGlobalSymbols
    /**
     * Will apply a range rule on a given filters. The rule is simple. If
     * filter query contains fields named as [ColumnName]IRange it will try to
     * convert those fields to a proper range filter if the value is a proper
     * RangeFilter interface as { start: something, end: something }
     * If nothing is matched will simply ignores and keep filtering props
     * as them are.
     *
     * @param {any} filter
     * @return {any}
     */
    export function withRangeFilters(filter: any) {
        if (!filter) {
            return filter;
        }

        for (const prop of Object.keys(filter)) {
            const col = prop.replace(RX_RANGE, '');

            if (col === prop) { // not a range filter
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
                    `Only one of filtering options "${col
                    }" or "${prop}" can be passed as filtering option!`,
                );
            }

            filter[col] = filter[prop];
            delete filter[prop];
        }

        return filter;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Looks up and returns include options in a given query using an array of
     * given models as a search path
     *
     * @param {FindOptions} queryOptions
     * @param {Array<typeof Model>} path
     * @return {IncludeOptions | null}
     */
    export function getInclude(
        queryOptions: FindOptions,
        path: typeof Model[],
    ): IncludeOptions | null {
        const currentModel = path.shift();

        for (const include of (queryOptions.include || [])) {
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

    // noinspection JSUnusedLocalSymbols,JSCommentMatchesSignature
    /**
     * Returns sequelize Literal build from a given string or string template
     * Actually it's an alias for Sequelize.Literal
     *
     * @example
     * ```typescript
     * const owner = 3;
     * const query = {
     *   where: L`(SELECT COUNT(*) FROM "SomeTable" WHERE owner = ${E(id)}) = 0`
     * }
     * ```
     * @param {TemplateStringsArray | string} str
     * @return {Literal}
     */
    export function L(
        str: TemplateStringsArray | string,
        ..._: any[]
    ): Literal {
        return Sequelize.literal(str as string);
    }

    /**
     * Escapes given argument. If argument is not a number or a string will
     * convert it to 'NULL'
     *
     * @param {any} input
     * @return {string | number}
     */
    export function E(input: any) {
        if (typeof input === 'number') {
            return +input;
        }

        if (typeof input === 'string') {
            return `'${input}'`;
        }

        return 'NULL';
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Removes given properties from the given object
     *
     * @param {any} obj
     * @param {...string[]} props
     * @return {any}
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

    // noinspection JSUnusedGlobalSymbols
    /**
     * Traverses given query object, lookups for includes matching
     * the given arguments of include options and overrides those are matching
     * by model and alias with the provided option.
     *
     * @param {FindOptions | CountOptions} queryOptions
     * @param {...IncludeOptions[]} options
     * @return {FindOptions | CountOptions}
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

                if (include as any === model || (
                    include.model === model && (!as || as === include.as)
                )) {
                    Object.assign(include, fields);
                    found = true;
                }
            }

            if (!found) {
                queryOptions.include.push({ model, ...fields } as Includeable);
            }
        }

        return queryOptions;
    }
}
