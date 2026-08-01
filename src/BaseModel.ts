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
import { Graph } from './Graph.js';

// Explicit named re-exports instead of `export * from` a CommonJS
// module: a CJS star re-export anywhere in the module graph breaks the
// synchronous require(esm) path used by CommonJS consumers (export
// names materialize with values left unbound). Types flow through the
// fully-erased type star below; Sequelize is intentionally excluded —
// this package exports its own extended Sequelize class.
export type * from 'sequelize-typescript';
export {
    AfterBulkCreate,
    AfterBulkDestroy,
    AfterBulkRestore,
    AfterBulkSync,
    AfterBulkUpdate,
    AfterConnect,
    AfterCreate,
    AfterDefine,
    AfterDestroy,
    AfterFind,
    AfterInit,
    AfterRestore,
    AfterSave,
    AfterSync,
    AfterUpdate,
    AfterUpsert,
    AfterValidate,
    AllowNull,
    Association,
    AutoIncrement,
    BaseAssociation,
    BeforeBulkCreate,
    BeforeBulkDestroy,
    BeforeBulkRestore,
    BeforeBulkSync,
    BeforeBulkUpdate,
    BeforeConnect,
    BeforeCount,
    BeforeCreate,
    BeforeDefine,
    BeforeDestroy,
    BeforeFind,
    BeforeFindAfterExpandIncludeAll,
    BeforeFindAfterOptions,
    BeforeInit,
    BeforeRestore,
    BeforeSave,
    BeforeSync,
    BeforeUpdate,
    BeforeUpsert,
    BeforeValidate,
    BelongsTo,
    BelongsToAssociation,
    BelongsToMany,
    BelongsToManyAssociation,
    Column,
    Comment,
    Contains,
    CreatedAt,
    DataType,
    Default,
    DefaultScope,
    DeletedAt,
    Equals,
    ForeignKey,
    HasAssociation,
    HasMany,
    HasOne,
    INFER_ALIAS_MAP,
    Index,
    Is,
    IsAfter,
    IsAlpha,
    IsAlphanumeric,
    IsArray,
    IsBefore,
    IsCreditCard,
    IsDate,
    IsDecimal,
    IsEmail,
    IsFloat,
    IsIP,
    IsIPv4,
    IsIPv6,
    IsIn,
    IsInt,
    IsLowercase,
    IsNull,
    IsNumeric,
    IsUUID,
    IsUppercase,
    IsUrl,
    Length,
    Max,
    Min,
    Model,
    Not,
    NotContains,
    NotEmpty,
    NotIn,
    NotNull,
    PrimaryKey,
    Scopes,
    Table,
    Unique,
    UpdatedAt,
    Validate,
    ValidationFailed,
    Validator,
    addAssociation,
    addAttribute,
    addAttributeOptions,
    addFieldToIndex,
    addHook,
    addOptions,
    addScopeOptions,
    addScopeOptionsGetter,
    annotateModelWithIndex,
    createIndexDecorator,
    getAssociations,
    getAssociationsByRelation,
    getAttributes,
    getHooks,
    getIndexes,
    getModelName,
    getModels,
    getOptions,
    getPreparedAssociationOptions,
    getScopeOptions,
    getScopeOptionsGetters,
    getSequelizeTypeByDesignType,
    implementHookDecorator,
    inferDataType,
    installHooks,
    isDataType,
    prepareArgs,
    prepareOptions,
    resolveModelGetter,
    resolveScope,
    resolveScopes,
    resolvesDeprecatedScopes,
    setAssociations,
    setAttributes,
    setHooks,
    setIndexes,
    setModelName,
    setOptions,
    setScopeOptionsGetters,
    verbose,
} from 'sequelize-typescript';

import {
    type BuildOptions as BuildOptionsOrigin,
    type BulkCreateOptions as BulkCreateOptionsOrigin,
    type CreateOptions as CreateOptionsOrigin,
    type DropOptions,
    type FindOptions as FindOptionsOrigin,
    type Identifier,
    type IncludeOptions,
    type InitOptions as InitOptionsOrigin,
    type ModelAttributes,
    type ModelOptions,
    type ModelType,
    QueryInterface as QueryInterfaceOrigin,
    type QueryOptions as QueryOptionsOrigin,
    type QueryOptionsWithType,
    type QueryOptionsWithWhere,
    type SaveOptions as InstanceSaveOptionsOrigin,
    type SyncOptions as SyncOptionsOrigin,
    type UpdateOptions as UpdateOptionsOrigin,
    type UpsertOptions as UpsertOptionsOrigin,
    type WhereOptions,
} from 'sequelize';
import {
    DataType,
    Model,
    Sequelize as SequelizeOrigin,
} from 'sequelize-typescript';
// type-only namespace import: the specifier resolves to a declaration
// file with no runtime counterpart, so it must be fully erased at emit
import type * as QueryTypes from 'sequelize/types/query-types';
import {
    type ColumnIndexOptions,
    type IDynamicViewDefineOptions,
    RX_MATCHER,
    RX_NAME_MATCHER,
    type ViewParams,
} from './decorators/index.js';
import { query } from './helpers/index.js';
import sql = query.sql;
import E = query.E;
import type { ModelAttributeColumnOptions } from 'sequelize/types/model';
import type { TableName } from 'sequelize/types/dialects/abstract/query-interface';

/**
 * Replaces every member of `T` that `R` also declares with `R`'s version of it.
 *
 * @remarks
 * The mechanism behind each widened option type in this module. Sequelize types
 * `returning` as a boolean; this package needs it to accept a column list as well,
 * and intersecting the two would leave a member that has to be both. Removing the
 * keys `R` redeclares before intersecting is what lets the override win instead.
 *
 * `T` is the type to start from and `R` the members to override it with, so the
 * widened save options are Sequelize's own with only `returning` replaced.
 */
export type Modify<T, R> = Pick<T, Exclude<keyof T, keyof R>> & R;

/**
 * Original toJSON method from sequelize's Model class.
 */
const toJSON = Model.prototype.toJSON;
const RX_CREATE_VIEW = new RegExp(
    'create\\s+(or\\s+replace\\s+)?' + '(materialized\\s+)?view\\s+(.*?)\\s+as',
    'i',
);
const RX_SQL_END = /;$/;
const RX_RETURNING = /returning\s+\*/i;
const ALIAS_PATH_DELIMITER = '->';

/**
 * Sequelize's own sync options, extended for views and column indices.
 *
 * @remarks
 * Passing nothing is the common case: tables, then views, then indices. The two
 * additions worth knowing are `withNoViews`, for a deployment where views are
 * managed outside the application, and `withoutDrop`, for views that depend on each
 * other.
 */
export interface SyncOptions extends SyncOptionsOrigin {
    /**
     * Has no effect when passed to a sync call.
     *
     * @remarks
     * Whether a model is a view is decided by the model, not by the caller: the
     * `View` and `DynamicView` decorators set this flag in the model's own options,
     * and that is the only place it is ever read from. It is declared here because
     * a model's options and a sync call's options are the same type, not because
     * passing it does anything.
     *
     * @deprecated Decorate the model instead; passing this is ignored.
     */
    treatAsView?: boolean;
    /**
     * Syncs tables and indices only, leaving every view untouched.
     *
     * @remarks
     * For a database where views are owned by migrations or by a DBA rather than by
     * the model definitions, and for start-up paths that should not drop and rebuild
     * every view.
     */
    withNoViews?: boolean;
    /**
     * Replaces each view in place instead of dropping it first.
     *
     * @remarks
     * The default drops a view and creates it again, which fails as soon as another
     * view selects from it — Postgres will not drop a view something depends on.
     * With this set, only the model's own create statement runs, so it has to be
     * written as `CREATE OR REPLACE VIEW` to succeed against a view that already
     * exists. Postgres will still refuse a replacement whose output columns differ
     * in name, type or order, so a column added to the middle of a view needs the
     * drop.
     */
    withoutDrop?: boolean;
}
/**
 * Sequelize's own find options, plus the parameters of a dynamic view.
 *
 * @remarks
 * Accepted by every finder on `BaseModel`. The single addition is ignored unless the
 * model was declared with `DynamicView`.
 */
export interface FindOptions extends FindOptionsOrigin {
    /**
     * Values for the placeholders in a dynamic view's definition.
     *
     * @remarks
     * Merged over the defaults the decorator supplied, then substituted into the view
     * SQL before the statement runs — which is how one model can be selected from
     * with different parameters. Values are escaped on the way in, and one reached
     * through an `include` is honoured too.
     */
    viewParams?: ViewParams;
}
/**
 * What a model's `options` actually holds on a model of this package.
 *
 * @remarks
 * Sequelize's own init options together with the view fields the decorators write
 * into them, which is why reading `Model.options` for `treatAsView`,
 * `viewDefinition` or `viewParams` type-checks here and does not in plain sequelize.
 */
export interface InitOptions
    extends InitOptionsOrigin, IDynamicViewDefineOptions {}
/**
 * Widens `returning` so it can name the columns to fetch back, not just ask whether
 * to fetch any.
 *
 * @remarks
 * Sequelize types `returning` as a boolean: every column, or none. Postgres can
 * return a subset, and a service usually wants exactly the fields its caller asked
 * for — so this package accepts a list of column names and rewrites the
 * `RETURNING *` in the generated statement to name just those.
 *
 * Two things follow. Less data crosses both hops: the database returns fewer
 * columns, and the instance remembers the list, so serializing it emits only those
 * properties. And because the option is widened rather than replaced, `true` and
 * `false` keep working exactly as before. An empty array is treated as `false`,
 * since a statement returning no columns is not what anyone means by it.
 *
 * The cost is a cast at the call site, and the mimicked option types in this module
 * are what to cast to — they exist for this and nothing else. Whenever TypeScript
 * objects to a `returning` array, import the type it names from `@imqueue/sequelize`
 * rather than from `sequelize`. Use `restoreSerialization()` to forget the list
 * again.
 *
 * @example
 * ```typescript
 * const scope = new Scope({ name: 'test', description: 'Test', schema: {} });
 *
 * await scope.save({ returning: ['id', 'name'] } as SaveOptions);
 * console.log(JSON.stringify(scope)); // {"id":2,"name":"test"}
 *
 * const [count, scopes] = await Scope.update({ name: 'TEST' }, {
 *     where: { id: 2 },
 *     returning: ['id', 'name'],
 * } as UpdateOptions);
 * console.log(JSON.stringify(scopes[0])); // {"id":2,"name":"TEST"}
 * ```
 */
export interface ReturningOptions {
    /**
     * `true` for every column, `false` for none, or the names of the columns to
     * fetch back.
     */
    returning?: boolean | string[];
}
/**
 * The shape sequelize's resolved include tree actually has, as this module reads it.
 *
 * @remarks
 * Sequelize builds this while working out an `include`, and does not declare it in
 * its public types. It is declared here because the select-query override walks the
 * tree looking for dynamic views nested inside a join, and needs each node's alias to
 * rewrite the right part of the statement. Of no use to application code.
 */
export interface WithIncludeMap extends InitOptions {
    /** The resolved options of each included association, keyed by property name. */
    includeMap?: {
        [propertyName: string]: WithIncludeMap & IncludeOptions & FindOptions;
    };
    /** The property names present in `includeMap`. */
    includeNames?: string[];
    /** The node this one was included from. */
    parent: WithIncludeMap;
}
/**
 * Names a model class by the instance type it produces.
 *
 * @remarks
 * Used where a helper takes a model class rather than an instance. The constructor is
 * declared without arguments because the type is there to identify a class, not to
 * build anything with it — sequelize instantiates models itself.
 */
export type IModelClass<T extends BaseModel<T>> = new () => T;

/**
 * Options for `upsert()`, with `returning` widened to accept a column list.
 *
 * @remarks
 * Cast to this at the call site when TypeScript objects to a `returning`
 * column list; {@link ReturningOptions} explains what the list does.
 */
export type UpsertOptions = Modify<UpsertOptionsOrigin, ReturningOptions>;
/**
 * Options for `build()`, with `returning` widened to accept a column list.
 *
 * @remarks
 * Cast to this at the call site when TypeScript objects to a `returning`
 * column list; {@link ReturningOptions} explains what the list does.
 */
export type BuildOptions = Modify<BuildOptionsOrigin, ReturningOptions>;
/**
 * Options for `bulkCreate()`, with `returning` widened to accept a column list.
 *
 * @remarks
 * Cast to this at the call site when TypeScript objects to a `returning`
 * column list; {@link ReturningOptions} explains what the list does.
 */
export type BulkCreateOptions = Modify<
    BulkCreateOptionsOrigin,
    ReturningOptions
>;
/**
 * Options for a raw `query()`, with `returning` widened to accept a column list.
 *
 * @remarks
 * Cast to this at the call site when TypeScript objects to a `returning`
 * column list; {@link ReturningOptions} explains what the list does.
 */
export type QueryOptions = Modify<QueryOptionsOrigin, ReturningOptions>;
/**
 * Options for the static `update()`, with `returning` widened to accept a column
 * list.
 *
 * @remarks
 * Cast to this at the call site when TypeScript objects to a `returning`
 * column list; {@link ReturningOptions} explains what the list does.
 */
export type UpdateOptions = Modify<UpdateOptionsOrigin, ReturningOptions>;
/**
 * Options for `create()`, with `returning` widened to accept a column list.
 *
 * @remarks
 * Cast to this at the call site when TypeScript objects to a `returning`
 * column list; {@link ReturningOptions} explains what the list does.
 */
export type CreateOptions = Modify<CreateOptionsOrigin, ReturningOptions>;
/**
 * Options for an instance's `save()`, with `returning` widened to accept a column
 * list.
 *
 * @remarks
 * Cast to this at the call site when TypeScript objects to a `returning`
 * column list; {@link ReturningOptions} explains what the list does.
 */
export type SaveOptions = Modify<InstanceSaveOptionsOrigin, ReturningOptions>;

/**
 * Sequelize's query interface, extended with view creation and removal.
 *
 * @remarks
 * The type a migration works against, and the most imported symbol in this package.
 * Everything sequelize's own interface offers is here unchanged; `createView` and
 * `dropView` are the additions, since sequelize has no equivalent.
 *
 * The instance handed out by `Sequelize.getQueryInterface()` is also wrapped in three
 * ways that do not show up in this type: every write method treats an empty
 * `returning` array as `false`, `query()` rewrites `RETURNING *` when given a column
 * list, and the select-query generator substitutes a dynamic view's definition into
 * the statement.
 */
export interface QueryInterface extends QueryInterfaceOrigin {
    /** The connection this interface belongs to. */
    sequelize: Sequelize;
    /**
     * Drops a view, if it exists.
     *
     * @remarks
     * Issues `DROP VIEW IF EXISTS`, so it is safe to call for a view that was never
     * created. A materialized view needs a different statement and is not covered.
     *
     * @param viewName - Name of the view to drop.
     * @param options - `cascade` also drops whatever depends on the view.
     * @returns The result of the drop statement.
     */
    dropView(viewName: string, options?: DropOptions): Promise<any>;
    /**
     * Creates a view from a complete SQL definition.
     *
     * @remarks
     * The definition is executed exactly as given, so it carries its own `CREATE VIEW`
     * or `CREATE OR REPLACE VIEW` keywords. The name is checked against the one the
     * statement declares before anything runs, which catches registering one view's
     * SQL under another view's name — a copy-paste mistake that would otherwise
     * create the wrong relation and leave the model pointing at nothing.
     *
     * The check recognises a plain or temporary view. A `CREATE MATERIALIZED VIEW`
     * definition is rejected by it, and would not survive the drop-and-create cycle
     * either, so materialized views are outside what this supports today.
     *
     * @param viewName - The name the definition is expected to declare.
     * @param viewDefinition - The complete create statement.
     * @returns The result of executing the definition.
     * @throws TypeError when the definition does not declare `viewName`.
     */
    createView(viewName: string, viewDefinition: string): Promise<any>;
}

const castNumber = (value: any) => +value;
const NUMBERS_MAP = new Map<string, (value: any) => number>([
    [DataType.BIGINT.name, castNumber],
    [DataType.NUMBER.name, castNumber],
    [DataType.INTEGER.name, castNumber],
    [DataType.FLOAT.name, castNumber],
    [DataType.REAL.name, castNumber],
    [DataType.DECIMAL.name, castNumber],
    [DataType.MEDIUMINT.name, castNumber],
    [DataType.SMALLINT.name, castNumber],
    [DataType.TINYINT.name, castNumber],
    [DataType.DOUBLE.name, castNumber],
]);

function fixReturningOptions(options?: ReturningOptions) {
    if (
        options &&
        options.returning &&
        Array.isArray(options.returning) &&
        !options.returning.length
    ) {
        options.returning = false;
    }
}

/**
 * Overrides queryInterface behavior to add support of views definition
 *
 * @param queryInterface
 */
function override(queryInterface: QueryInterfaceOrigin): QueryInterface {
    const {
        insert,
        upsert,
        bulkInsert,
        update,
        bulkUpdate,
        bulkDelete,
        select,
        increment,
        rawSelect,
        queryGenerator,
    } = queryInterface as QueryInterface;
    const del = (queryInterface as QueryInterface).delete;

    /**
     * Inserts a new record
     */
    (queryInterface as QueryInterface).insert = function (
        instance: Model,
        tableName: string,
        values: object,
        options?: QueryOptions,
    ): Promise<object> {
        fixReturningOptions(options);

        return insert.call(this, instance, tableName, values, options);
    };

    /**
     * Inserts or Updates a record in the database
     */
    (queryInterface as QueryInterface).upsert = function (
        tableName: string,
        values: object,
        updateValues: object,
        model: typeof Model,
        options?: QueryOptions,
    ): Promise<object> {
        fixReturningOptions(options);

        return upsert.call(
            this,
            tableName,
            values,
            updateValues,
            model,
            options as any,
        );
    };

    /**
     * Inserts multiple records at once
     */
    (queryInterface as QueryInterface).bulkInsert = function (
        tableName: string,
        records: object[],
        options?: QueryOptions,
        attributes?: Record<string, ModelAttributeColumnOptions>,
    ): Promise<object> {
        fixReturningOptions(options);

        return (bulkInsert as any).call(
            this,
            tableName,
            records,
            options,
            attributes,
        );
    };

    /**
     * Updates a row
     */
    (queryInterface as any).update = function <M extends Model>(
        instance: M,
        tableName: TableName,
        values: object,
        identifier: WhereOptions,
        options?: QueryOptions,
    ): Promise<object> {
        fixReturningOptions(options);

        return update.call(
            this,
            instance,
            tableName,
            values,
            identifier,
            options,
        );
    };

    /**
     * Updates multiple rows at once
     */
    (queryInterface as QueryInterface).bulkUpdate = function (
        tableName: string,
        values: object,
        identifier: WhereOptions,
        options?: QueryOptions,
        attributes?: string[] | string,
    ): Promise<object> {
        fixReturningOptions(options);

        return bulkUpdate.call(
            this,
            tableName,
            values,
            identifier,
            options,
            attributes,
        );
    };

    /**
     * Deletes a row
     */
    (queryInterface as QueryInterface).delete = function (
        instance: Model | null,
        tableName: string,
        identifier: WhereOptions,
        options?: QueryOptions,
    ): Promise<object> {
        fixReturningOptions(options);

        return del.call(this, instance, tableName, identifier, options);
    };

    /**
     * Deletes multiple rows at once
     */
    (queryInterface as QueryInterface).bulkDelete = function (
        tableName: TableName,
        identifier: WhereOptions<any>,
        options?: QueryOptions,
        model?: ModelType,
    ): Promise<object> {
        fixReturningOptions(options);

        return bulkDelete.call(this, tableName, identifier, options, model);
    };

    /**
     * Increments a row value
     */
    (queryInterface as QueryInterface).increment = function (
        instance: Model,
        tableName: string,
        values: object,
        identifier: WhereOptions,
        options?: QueryOptions,
    ): Promise<object> {
        fixReturningOptions(options);

        return increment.call(
            this,
            instance,
            tableName,
            values,
            identifier,
            options,
        );
    };

    /**
     * Drops view from database
     *
     * @param viewName - view name to drop
     * @param options - drop operation options
     */
    (queryInterface as QueryInterface).dropView = function (
        viewName: string,
        options: DropOptions = {},
    ) {
        const dropViewSql = `DROP VIEW IF EXISTS "${
            viewName
        }"${options.cascade ? ' CASCADE' : ''}`;

        return this.sequelize.query(dropViewSql, this.sequelize.options);
    };

    /**
     * Creates view in a database. Makes sure given view name corresponds to
     * the name inside given create SQL query.
     *
     * @param viewName - view name to create
     * @param viewDefinition - raw sql query to create the view
     */
    (queryInterface as QueryInterface).createView = function (
        viewName: string,
        viewDefinition: string,
    ) {
        const rx = new RegExp(
            `\\s*create\\s+(or\\s+replace\\s+)?((temp|temporary)\\s+)?view\\s+"?${
                viewName
            }"?\\s+`,
            'i',
        );

        if (!rx.test(viewDefinition)) {
            throw new TypeError(
                'Given view definition does not match given view name',
            );
        }

        return this.sequelize.query(viewDefinition, this.sequelize.options);
    };

    /**
     * Returns selected rows
     */
    (queryInterface as QueryInterface).select = function (
        model: ModelType | null,
        tableName: TableName,
        options?: QueryOptionsWithWhere,
    ): Promise<object[]> {
        fixReturningOptions(options as any);

        return select.call(this, model, tableName, options);
    };

    /**
     * Increments a row value
     */
    (queryInterface as QueryInterface).increment = function (
        instance: Model,
        tableName: string,
        values: object,
        identifier: WhereOptions,
        options?: QueryOptions,
    ): Promise<object> {
        fixReturningOptions(options);

        return increment.call(
            this,
            instance,
            tableName,
            values,
            identifier,
            options,
        );
    };

    /**
     * Selects raw without parsing the string into an object
     */
    (queryInterface as QueryInterface).rawSelect = function (
        tableName: TableName,
        options: QueryOptionsWithWhere,
        attributeSelector: string | string[],
        model?: ModelType,
    ): Promise<string[]> {
        fixReturningOptions(options as any);

        return rawSelect.call(
            this,
            tableName,
            options,
            attributeSelector,
            model,
        );
    };

    /**
     * Override queryGenerator behavior for DynamicViews on select queries
     */
    const { selectQuery } = queryGenerator as any;

    // takes into account dynamic view can be included
    function fixIncludes(
        options: WithIncludeMap & IncludeOptions,
        sqlQuery: string,
        parentViewParams?: ViewParams,
        path: string = '',
    ): string {
        const model = options.model as unknown as typeof BaseModel;
        const modelOptions: InitOptions = ((model || ({} as any)).options ||
            ({} as any)) as InitOptions;

        path = path
            ? `${path}${ALIAS_PATH_DELIMITER}${options.as}`
            : options.as || '';

        if (
            modelOptions.isDynamicView &&
            (options.viewParams || parentViewParams)
        ) {
            const viewParams = Object.assign(
                {},
                parentViewParams || {},
                options.viewParams || {},
            );

            sqlQuery = sqlQuery.replace(
                `JOIN "${model.getTableName()}" AS "${path}"`,
                `JOIN (${model
                    .getViewDefinition(viewParams, true)
                    .replace(RX_SQL_END, '')}) AS "${path}"`,
            );
        }

        if (options.includeMap) {
            for (const prop of Object.keys(options.includeMap)) {
                sqlQuery = fixIncludes(
                    options.includeMap[prop],
                    sqlQuery,
                    parentViewParams,
                    path,
                );
            }
        }

        return sqlQuery;
    }

    (queryGenerator as any).selectQuery = (
        tableName: string,
        options: FindOptions,
        model: typeof BaseModel,
    ) => {
        const modelOptions: InitOptions = model.options as InitOptions;
        let sqlQuery = selectQuery.call(
            queryGenerator as any,
            tableName,
            options,
            model,
        );
        const viewParams = Object.assign({}, modelOptions.viewParams);

        if (modelOptions.isDynamicView && options.viewParams) {
            Object.assign(viewParams, options.viewParams);

            sqlQuery = sqlQuery.replace(
                `FROM "${tableName}" AS`,
                `FROM (${model
                    .getViewDefinition(viewParams, true)
                    .replace(RX_SQL_END, '')}) AS`,
            );
        }

        return fixIncludes(
            options as WithIncludeMap,
            sqlQuery,
            options.viewParams,
        );
    };

    return queryInterface as QueryInterface;
}

/**
 * Sequelize's own connection class, taught about views, column indices and the
 * widened `returning` option.
 *
 * @remarks
 * Returned by `database()`, which is how a service normally gets one. Four things
 * differ from the class it extends.
 *
 * Views are first-class: a model declared with `View` or `DynamicView` is created as
 * a view after every table exists, dropped as a view, and skipped by the table sync.
 * A dynamic view goes further — its definition carries `@{name}` placeholders, and
 * the select-query generator substitutes them into the statement at query time, so
 * one model can be read with different parameters, including when it is reached
 * through a join.
 *
 * Column indices declared with `ColumnIndex` or `NullableIndex` are created as part
 * of the same sync, which sequelize has no notion of at all.
 *
 * `returning` may name columns rather than being a boolean, both on the write methods
 * and on a raw `query()`.
 *
 * @example
 * ```typescript
 * const orm = database(dbConfig);       // a Sequelize, already connected
 *
 * await orm.sync();                     // tables, then views, then indices
 * await orm.sync({ withNoViews: true }); // tables and indices only
 * ```
 */
export class Sequelize extends SequelizeOrigin {
    /**
     * The query interface for this connection, with view support and the widened
     * `returning` option.
     *
     * @remarks
     * Sequelize's own interface is wrapped once, the first time this is called, and
     * the same wrapped object is returned afterwards. The wrapper adds `createView`
     * and `dropView`, makes every write method treat an empty `returning` array as
     * `false`, and teaches the select-query generator to substitute a dynamic view's
     * definition into the statement.
     *
     * @returns The wrapped query interface.
     */
    public override getQueryInterface(): QueryInterface {
        const self: any = this;

        super.getQueryInterface();

        if (typeof self.queryInterface.dropView !== 'function') {
            self.queryInterface = override(self.queryInterface);
        }

        return self.queryInterface;
    }

    /**
     * Defines a model from an attribute map rather than from a decorated class.
     *
     * @remarks
     * Sequelize's own `define()` builds on its `Model`; this one builds on
     * `BaseModel`, so a model defined this way gets the view handling, the widened
     * `returning` and the serialization of this package. Decorated classes registered
     * through `addModels()` are the usual route, and the one `database()` takes.
     *
     * @param modelName - Name to register the model under.
     * @param attributes - Column definitions, as sequelize's own `define` takes them.
     * @param options - Model options. `modelName` and `sequelize` are filled in.
     * @returns The generated model class.
     */
    public override define<TInstance, _TAttributes>(
        modelName: string,
        attributes: ModelAttributes,
        options?: ModelOptions,
    ): any {
        const opts: any = options || {};

        opts.modelName = modelName;
        opts.sequelize = this;

        const model = class extends BaseModel<TInstance> {};

        (model as any).init(attributes, opts);

        return model as any;
    }

    /**
     * Creates every table, then every view, then every column index.
     *
     * @remarks
     * Sequelize's own sync knows about tables only. This one runs it first, then
     * replaces the views declared with `View` or `DynamicView`, then creates the
     * indices declared with `ColumnIndex` or `NullableIndex`. Views come before
     * indices so an index declared on a materialized view has something to attach to,
     * and both come after the tables a view selects from.
     *
     * The three passes used to overlap. The index pass was started but never waited
     * for and its result was discarded, so this resolved while indices were still
     * being created, and a failure in that pass became an unhandled rejection —
     * fatal on any current Node — instead of rejecting here. The options were not
     * forwarded to the view pass either, which left `withoutDrop` doing nothing. All
     * three are fixed.
     *
     * @param options - Sequelize's own sync options, plus `withNoViews` and
     *   `withoutDrop`.
     * @returns The connection, once every pass has finished.
     */
    public override sync(options?: SyncOptions): Promise<any> {
        const withViews = !(options && options.withNoViews);

        return (super.sync(options) as unknown as Promise<any>).then(
            async result => {
                if (withViews) {
                    await this.syncViews(options);
                }

                await this.syncIndices(options);

                return result;
            },
        );
    }

    /**
     * Creates the column indices declared across every registered model.
     *
     * @remarks
     * Run by `sync()` once the tables and views are in place. Only models that
     * declare at least one index are visited, and the models are done concurrently.
     *
     * @param options - Passed to each model, which does not currently read it.
     * @returns Resolves once every index of every model exists.
     */
    public syncIndices(options?: SyncOptions): Promise<any> {
        return Promise.all(
            this.getModelsWithIndices().map(model =>
                model.syncIndices(options),
            ),
        );
    }

    /**
     * Replaces every model that is declared as a view.
     *
     * @remarks
     * Each view is dropped and created again unless `withoutDrop` is set, and the
     * views are done concurrently — so a view that selects from another view has no
     * ordering guarantee, and the drop of the one it depends on would fail anyway.
     * That combination is what `withoutDrop` is for.
     *
     * @param options - `withoutDrop` skips the drop; nothing else is read.
     * @returns Resolves once every view has been replaced.
     */
    public syncViews(options?: SyncOptions): Promise<any> {
        const views = this.getViews();

        return Promise.all(views.map(view => view.syncView(options)));
    }

    /**
     * The registered models that declare at least one column index.
     *
     * @returns Model classes with a non-empty `indices` option, in registration
     *   order.
     */
    public getModelsWithIndices() {
        const models: (typeof BaseModel)[] = [];

        (this as any).modelManager.models.forEach((model: any) => {
            if (
                model &&
                model.options &&
                model.options.indices &&
                model.options.indices.length
            ) {
                models.push(model);
            }
        });

        return models;
    }

    /**
     * The registered models that are declared as views.
     *
     * @remarks
     * A model counts as a view once `View` or `DynamicView` has put `treatAsView` in
     * its options, which is the same flag that makes the table sync skip it and
     * `drop()` issue `DROP VIEW`.
     *
     * @returns Model classes flagged as views, in registration order.
     */
    public getViews(): (typeof BaseModel)[] {
        const views: (typeof BaseModel)[] = [];

        (this as any).modelManager.models.forEach((model: any) => {
            if (model && model.options && model.options.treatAsView) {
                views.push(model);
            }
        });

        return views;
    }

    /**
     * Runs a raw statement, honouring a `returning` column list.
     *
     * @remarks
     * Given a non-empty `returning` array, the `RETURNING *` in the statement is
     * rewritten to name exactly those columns, and every returned model instance
     * remembers the list, so serializing it emits only those properties. Everything
     * else is sequelize's own `query()`.
     *
     * The rewrite is textual and looks for `RETURNING *` specifically, so a statement
     * that already names its columns is left alone — and one that has no `RETURNING`
     * at all is not given one.
     *
     * @param sqlQuery - The statement, or a statement with its bind values.
     * @param options - Query options, where `returning` may be a column list.
     * @returns Whatever sequelize's own `query()` returns for these options.
     */
    public override query(
        sqlQuery: string | { query: string; values: any[] },
        options?: QueryOptions | QueryOptionsWithType<QueryTypes.RAW>,
    ): Promise<any> {
        if (
            options &&
            Array.isArray((options as QueryOptions).returning) &&
            ((options as QueryOptions).returning as string[]).length
        ) {
            const sqlText = (
                typeof sqlQuery === 'string' ? sqlQuery : sqlQuery.query
            ).replace(
                RX_RETURNING,
                `RETURNING ${((options as QueryOptions).returning as string[])
                    .map(field => `"${field}"`)
                    .join(', ')}`,
            );

            if (typeof sqlQuery === 'string') {
                sqlQuery = sqlText;
            } else {
                sqlQuery.query = sqlText;
            }
        }

        const original = super.query;

        return original.call(this, sqlQuery, options).then((entities: any) => {
            if (!(entities && Array.isArray(entities) && entities.length)) {
                return entities;
            }

            for (const entity of entities) {
                // noinspection SuspiciousTypeOfGuard
                if (entity instanceof BaseModel && options) {
                    // noinspection TypeScriptUnresolvedVariable
                    (entity as any)._options.returning = (
                        options as QueryOptions
                    ).returning;
                }
            }

            return entities;
        });
    }
}

/**
 * The class every model in an `@imqueue` service extends.
 *
 * @remarks
 * Sequelize's own `Model` with four additions.
 *
 * Views: a model declared with `View` or `DynamicView` is created and dropped as a
 * view, skipped by the table sync, and has its numeric columns cast back to numbers
 * after every finder, since a view returns them as strings.
 *
 * Indices: `ColumnIndex` and `NullableIndex` declarations become `CREATE INDEX`
 * statements at sync time, which plain sequelize cannot express.
 *
 * Serialization: `toJSON()` honours the `returning` column list left behind by the
 * last write, and picks up associated instances that the loaded attributes do not
 * already cover.
 *
 * Associations as a graph: `toGraph()` walks them transitively, so a cycle can be
 * found before a query walks into it.
 *
 * @example
 * ```typescript
 * @Table
 * export class Lead extends BaseModel<Lead> {
 *     @PrimaryKey
 *     @AutoIncrement
 *     @Column(DataType.BIGINT)
 *     public readonly id: number;
 *
 *     @AllowNull(false)
 *     @Column(DataType.STRING)
 *     public name: string;
 *
 *     @CreatedBy()
 *     @Column(DataType.BIGINT)
 *     public createdBy: number;
 * }
 * ```
 */
export abstract class BaseModel<T> extends Model<BaseModel<T>> {
    /**
     * Drops this model's relation: `DROP VIEW` for a view, `DROP TABLE` otherwise.
     *
     * @param options - Sequelize's own drop options; `cascade` applies to both.
     * @returns The result of the drop statement.
     */
    public static override drop(options?: DropOptions): Promise<any> {
        const self: any = this;
        const method =
            self.options && self.options.treatAsView ? 'dropView' : 'dropTable';

        // noinspection TypeScriptUnresolvedVariable
        return self.QueryInterface[method](self.getTableName(), options);
    }

    /**
     * Creates this model's table, or does nothing when the model is a view.
     *
     * @remarks
     * A view is skipped deliberately: it normally selects from tables that do not
     * exist yet, so views are left to the second pass `Sequelize.sync()` runs once
     * every table is there.
     *
     * @param options - Sequelize's own sync options.
     * @returns Resolves when the table exists, or immediately for a view.
     */
    public static override sync(options?: SyncOptions): Promise<any> {
        if ((this as any).options && (this as any).options.treatAsView) {
            // all views skipped until all tables defined
            return Promise.resolve();
        }

        return super.sync(options) as unknown as Promise<any>;
    }

    /**
     * Creates this view, replacing whatever definition is in the database.
     *
     * @remarks
     * Drops the view first unless `withoutDrop` is set. That drop is why a view
     * another view selects from cannot be replaced this way, and why `withoutDrop`
     * exists.
     *
     * Only meaningful on a model declared with `View` or `DynamicView` — anything
     * else has no definition to create.
     *
     * @param options - `withoutDrop` skips the drop.
     * @returns The result of the create statement.
     */
    public static syncView(options?: SyncOptions): Promise<any> {
        const self: any = this;
        // noinspection TypeScriptUnresolvedVariable
        const queryInterface = self.QueryInterface || self.queryInterface;

        if (options && options.withoutDrop) {
            return queryInterface.createView(
                self.getTableName(),
                self.getViewDefinition(),
            );
        }

        return queryInterface
            .dropView(self.getTableName())
            .then(() =>
                queryInterface.createView(
                    self.getTableName(),
                    self.getViewDefinition(),
                ),
            );
    }

    /**
     * This view's SQL, with any dynamic parameters substituted in.
     *
     * @remarks
     * Parameters are merged in two layers: the defaults given to `DynamicView`, then
     * whatever is passed here. Each `@{name}` placeholder in the definition is
     * replaced with the escaped value, which is what makes it safe to pass a caller's
     * input — though only numbers and strings render as values, and everything else,
     * including a missing parameter, becomes `NULL`.
     *
     * @param viewParams - Values overriding the decorated defaults.
     * @param asQuery - Strips the leading create-view clause, leaving a statement
     *   that can be embedded as a subquery. This is how a dynamic view is spliced
     *   into a `FROM` or a join.
     * @returns The definition, whitespace-normalised and ending in a semicolon.
     */
    public static getViewDefinition(
        viewParams: ViewParams = {},
        asQuery: boolean = false,
    ) {
        const self: any = this;
        let viewDef: string = self.options.viewDefinition || '';

        viewParams = Object.assign(
            {},
            self.options.viewParams,
            viewParams || {},
        );

        if (self.options.isDynamicView) {
            (viewDef.match(RX_MATCHER) || []).forEach(param => {
                // noinspection JSUnusedLocalSymbols
                const [_, name] = param.match(RX_NAME_MATCHER) || ['', ''];
                const RX_PARAM = new RegExp(`@{${name}}`, 'g');

                viewDef = viewDef.replace(RX_PARAM, E(viewParams[name]) + '');
            });
        }

        if (asQuery) {
            viewDef = viewDef.replace(RX_CREATE_VIEW, '');
        }

        return sql(viewDef);
    }

    /**
     * Creates every column index declared on this model.
     *
     * @remarks
     * Reads the declarations left behind by `ColumnIndex` and `NullableIndex` and
     * creates them concurrently. A model that declares none resolves immediately —
     * it used to throw, which made this unsafe to call on anything but a model
     * `Sequelize.getModelsWithIndices()` had already picked out.
     *
     * @param _options - Accepted for symmetry with the other sync methods, not read.
     * @returns Resolves once every index of this model exists.
     */
    public static syncIndices(_options?: SyncOptions): Promise<any> {
        const indices: {
            column: string;
            options: ColumnIndexOptions;
        }[] = (this.options as any).indices || [];

        return Promise.all(
            indices.map((indexOptions, i) =>
                this.syncIndex(
                    indexOptions.column,
                    indexOptions.options,
                    i + 1,
                ),
            ),
        );
    }

    /**
     * Builds and runs the statements that create one column index.
     *
     * @remarks
     * Each `ColumnIndexOptions` field maps to a clause of the `CREATE INDEX`. The
     * index is dropped first unless `safe` is set, so the declaration in the code
     * always wins over what is in the database; with `safe`, an existing index is
     * left exactly as it is and only a missing one is created.
     *
     * Five of those options used to be placed where Postgres does not accept them —
     * `USING` ahead of `ON`, and `COLLATE`, the operator class, the sort order and
     * the nulls position after the closing parenthesis rather than inside it — so
     * `method`, `collation`, `opClass`, `order` and `nullsFirst` could not be used at
     * all. `include` was declared and never emitted. Both are fixed, and the reason
     * neither was noticed is the promise bug below: the statement failed, and the
     * rejection went nowhere.
     *
     * The two statements used to be attached to the same already-resolved promise
     * rather than chained onto each other, so they were issued together and this
     * returned before either had run — the create could reach the server ahead of the
     * drop, and a failure of either became an unhandled rejection rather than
     * rejecting here. They now run in order, and the returned promise waits for them.
     *
     * @param column - Column the index is declared on.
     * @param options - The declared index options.
     * @param position - Ordinal used to name the index when `name` is not given,
     *   which is what keeps two indices on one column from colliding.
     * @returns Resolves once the index exists.
     */
    public static syncIndex(
        column: string,
        options: ColumnIndexOptions,
        position: number,
    ) {
        const self: any = this;
        const indexName: string =
            options.name || `${this.getTableName()}_${column}_idx${position}`;
        // noinspection TypeScriptUnresolvedVariable
        const queryInterface = self.QueryInterface || self.queryInterface;
        const concurrently = options.concurrently ? ' CONCURRENTLY' : '';
        // Everything that describes the KEY belongs inside the parentheses, and
        // USING belongs before them: `ON "t" USING btree ("c" COLLATE x DESC)`.
        // Emitted after the closing paren — and USING ahead of ON — Postgres
        // rejects the statement outright, so `method`, `collation`, `opClass`,
        // `order` and `nullsFirst` could not be used at all. It went unnoticed
        // because this method discarded its own rejections.
        const key = [
            options.expression ? `(${options.expression})` : `"${column}"`,
            options.collation ? `COLLATE ${options.collation}` : '',
            options.opClass || '',
            options.order || '',
            options.nullsFirst === true
                ? 'NULLS FIRST'
                : options.nullsFirst === false
                  ? 'NULLS LAST'
                  : '',
        ]
            .filter(Boolean)
            .join(' ');
        const covered = options.include || [];
        const include = covered.length
            ? ` INCLUDE (${covered.map(name => `"${name}"`).join(', ')})`
            : '';
        let chain: Promise<any> = Promise.resolve();

        if (!options.safe) {
            chain = chain.then(() =>
                queryInterface.sequelize.query(
                    `DROP INDEX${concurrently} IF EXISTS "${indexName}"`,
                ),
            );
        }

        // noinspection TypeScriptUnresolvedVariable,PointlessBooleanExpressionJS
        return chain.then(() =>
            queryInterface.sequelize.query(
                `CREATE${options.unique ? ' UNIQUE' : ''} INDEX` +
                    `${concurrently}${options.safe ? ' IF NOT EXISTS' : ''}` +
                    ` "${indexName}" ON "${this.getTableName()}"` +
                    `${options.method ? ` USING ${options.method}` : ''}` +
                    ` (${key})${include}` +
                    `${
                        options.tablespace
                            ? ` TABLESPACE ${options.tablespace}`
                            : ''
                    }` +
                    `${options.predicate ? ` WHERE ${options.predicate}` : ''}`,
            ),
        );
    }

    // Make sure finders executed on views properly map numeric types
    /**
     * Search for multiple instances.
     *
     * @remarks
     * Delegates to Sequelize's own `findAll`, then re-maps numeric columns, which
     * a view returns as strings.
     *
     * @param options - Find options; `viewParams` applies to a dynamic view.
     * @returns The matching instances.
     */
    public static override findAll<M>(options?: FindOptions): Promise<M[]> {
        const method = super.findAll;
        const original = method.call(this as any, options) as Promise<any>;

        if (!(this as any).options.treatAsView) {
            return original;
        }

        return original.then((result: any[]) => {
            if (result && !Array.isArray(result)) {
                return (result as BaseModel<M>).fixNumbers() as any as M;
            } else if (result) {
                result.map((entity: any) => entity.fixNumbers() as M);
            }

            return result as any as M;
        }) as Promise<M[]>;
    }

    // noinspection JSAnnotator
    /**
     * Finds one instance by primary key.
     *
     * @remarks
     * Sequelize's own `findByPk` with one addition: on a model declared as a view, the
     * numeric columns of the result are cast back to numbers.
     *
     * @param identifier - Primary key value to look for.
     * @param options - Find options, minus `where`, which the key supplies.
     * @returns The instance, or `null` when no row matches.
     */
    public static override findByPk<M>(
        identifier?: Identifier,
        options?: Omit<FindOptions, 'where'>,
    ): Promise<M | null> {
        const method = super.findByPk;
        const original = method.call(
            this as any,
            identifier,
            options,
        ) as Promise<any>;

        if (!(this as any).options.treatAsView) {
            return original;
        }

        return original.then((result: any) => {
            if (result) {
                result.fixNumbers();
            }

            return result as any as M;
        });
    }

    // noinspection JSAnnotator
    /**
     * Finds the first instance matching the options.
     *
     * @remarks
     * Sequelize's own `findOne` with one addition: on a model declared as a view, the
     * numeric columns of the result are cast back to numbers.
     *
     * @param options - Find options; `viewParams` applies to a dynamic view.
     * @returns The instance, or `null` when no row matches.
     */
    public static override findOne<M>(
        options?: FindOptions,
    ): Promise<M | null> {
        const method = super.findOne;
        const original = method.call(this as any, options) as Promise<any>;

        if (!(this as any).options.treatAsView) {
            return original;
        }

        return original.then((result: any) => {
            if (result) {
                result.fixNumbers();
            }

            return result as any as M;
        });
    }

    /**
     * Forgets the `returning` column list, so serializing emits every loaded column
     * again.
     *
     * @remarks
     * A write that named its returning columns leaves that list on the instance, and
     * `toJSON()` honours it from then on. Call this when the same instance is reused
     * for something that should serialize in full.
     *
     * @returns This instance, for chaining.
     */
    public restoreSerialization() {
        // noinspection TypeScriptUnresolvedVariable
        delete (this as any)._options.returning;

        return this;
    }

    /**
     * Attaches related data to this instance as though it had been joined in.
     *
     * @remarks
     * Sets the property, and when a `returning` list is in force adds the name to it
     * so the property survives serialization. That is the point of it: data fetched
     * by a second query would otherwise be dropped by `toJSON()`.
     *
     * @param name - Property to set, normally an association name.
     * @param data - What to attach: an instance, an array of them, or anything else.
     * @returns This instance, for chaining.
     */
    public appendChild(name: string, data: any) {
        // noinspection TypeScriptUnresolvedVariable
        const returning = (this as any)._options.returning;

        if (
            returning &&
            Array.isArray(returning) &&
            !~returning.indexOf(name)
        ) {
            returning.push(name);
        }

        (this as any)[name] = data;

        return this;
    }

    /**
     * Serializes this instance, honouring the `returning` column list.
     *
     * @remarks
     * Sequelize's own `toJSON()` emits the loaded attributes. This one also picks up
     * an associated instance, or an array of them, that those attributes do not
     * already cover, and then — if the last write named the columns to return — drops
     * every property that was not named.
     *
     * @returns A plain object, ready to send over the wire.
     */
    public override toJSON(): any {
        const serialized: any = toJSON.call(this);
        const props = Object.keys(this);
        // noinspection TypeScriptUnresolvedVariable
        const returning: boolean | string[] = (this as any)._options.returning;

        for (const prop of props) {
            this.verifyProperty(prop, serialized);
        }

        if (Array.isArray(returning)) {
            const serializedProps = Object.keys(serialized);

            for (const prop of serializedProps) {
                if (!~(returning as string[]).indexOf(prop)) {
                    delete serialized[prop];
                }
            }
        }

        return serialized;
    }

    /**
     * Casts this instance's numeric columns back to numbers.
     *
     * @remarks
     * Numeric columns selected through a view arrive as strings, so the finders on
     * this class re-cast them after every select on a view, and this is the method
     * they use. It is public for the cases they do not cover, a raw query being the
     * common one.
     *
     * Only the columns the model declares are looked at, and the instance is changed
     * in place.
     *
     * @returns This instance, for chaining.
     */
    public fixNumbers(): BaseModel<T> {
        const model = this.sequelize.models[
            this.constructor.name
        ] as any as BaseModel<T>;
        const columns = Object.keys((model as any).rawAttributes);

        for (const column of columns) {
            const value = (this as any)[column];

            if (value === undefined || value === null) {
                continue;
            }

            const cast = NUMBERS_MAP.get(
                (model as any).rawAttributes[column].type.constructor.name,
            );

            if (cast) {
                (this as any)[column] = cast(value);
            }
        }

        return this;
    }

    /**
     * Makes sure given property properly serialized
     *
     * @param prop
     * @param serialized
     */
    private verifyProperty(prop: string, serialized: any) {
        // add more skipping props if needed...
        if (~['__eagerlyLoadedAssociations'].indexOf(prop)) {
            return;
        }

        const val = (this as any)[prop];

        if (!serialized[prop] && val !== this && val instanceof Model) {
            serialized[prop] = toJSON.call(val);
        }

        if (val instanceof Array) {
            this.verifyArray(val, prop, serialized);
        }
    }

    /**
     * Makes sure given array property properly serialized
     *
     * @param arr
     * @param prop
     * @param serialized
     */
    private verifyArray(arr: any[], prop: string, serialized: any) {
        if (!serialized[prop]) {
            serialized[prop] = [];
        }

        for (let i = 0; i < arr.length; i++) {
            const val = (this as any)[prop][i];

            if (val instanceof Model) {
                serialized[prop][i] = toJSON.call(val);
            }

            serialized[prop][i] =
                val && val.toJSON
                    ? val.toJSON()
                    : JSON.parse(JSON.stringify(val));
        }
    }

    /**
     * Builds a graph of this model's associations, following them transitively.
     *
     * @remarks
     * Every association becomes an edge, and a many-to-many contributes two: this
     * model to the through-model, and the through-model to the target. Each target is
     * then walked in turn, and an association already present as an edge is not
     * followed again, which is what stops a cycle from recursing forever.
     *
     * The reason to have it is to find those cycles before a query does — a cycle in
     * the graph is a query that can be asked to include itself.
     *
     * @param graph - Graph to add to. A fresh one by default, and passing the same
     *   one is what makes the recursive calls accumulate into a single graph.
     * @returns The graph, so the outermost call can use it.
     */
    public static toGraph(
        graph = new Graph<typeof BaseModel>(),
    ): Graph<typeof BaseModel> {
        if (!graph.hasVertex(this)) {
            graph.addVertex(this);
        }

        for (const field of Object.keys(this.associations)) {
            const relation = this.associations[field] as any;
            const { target, options } = relation;
            const through = options && options.through && options.through.model;

            if (through && graph.hasEdge(this, through)) {
                continue;
            }

            if (through) {
                graph.addEdge(this, through);
                through.toGraph(graph);

                if (target && graph.hasEdge(through, target)) {
                    continue;
                }

                if (target && !graph.hasVertex(target)) {
                    graph.addEdge(through, target);
                    target.toGraph(graph);
                }
            } else {
                if (target && graph.hasEdge(this, target)) {
                    continue;
                }

                if (target) {
                    graph.addEdge(this, target);
                    target.toGraph(graph);
                }
            }
        }

        return graph;
    }
}
