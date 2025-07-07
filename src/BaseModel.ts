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
 * This modules provides several additional features on top of
 * original Sequelize ORM implementation:
 *  1. Support of views. To define a model as a view in database, use
 *     @View(CREATE_VIEW_SQL: string) decorator factory
 *     @example
 *     ~~~typescript
 *     @View(
 *       `CREATE OR REPLACE VIEW "ProductRevenue" AS
 *        SELECT "productId" as "id", SUM("payment") as "revenue"
 *        FROM "Order" GROUP BY "productId"`
 *     )
 *     export class ProductRevenue extends BaseModel<ProductRevenue> {
 *         @Column(DataType.BIGINT)
 *         @PrimaryKey
 *         public readonly id: number;
 *
 *         @Column(DataType.NUMBER({ decimals: 2, precision: 12 }}))
 *         public readonly revenue: number;
 *     }
 *     ~~~
 *     All views would be automatically synced after all tables synced, when
 *     Sequelize.sync() called.
 *
 *  2. Support of { returning: [field1, field2, ...] } instead of
 *     { returning: boolean }. This gives an ability to fetch and return only
 *     requested properties during insert/update operations. By the way it
 *     would require to cast the proper options type passed to corresponding
 *     sequelize operation. Those types have been mimic in this module, so
 *     them should be exported from it:
 *     @example
 *     ~~~typescript
 *     import { SaveOptions, Scope, UpdateOptions } from './orm';
 *     //
 *     // ... init models and somewhere inside async function:
 *     //
 *     const scope = new Scope({
 *       name: 'test',
 *       description: 'Test Scope',
 *       schema: {},
 *     });
 *     // take into account type casting to prevent TS errors:
 *     await scope.save({ returning: ['id', 'name'] } as SaveOptions);
 *     console.log(JSON.stringify(scope)); // {"id":2,"name":"test"}
 *     // or
 *     const [count, scopes] = await Scope.update({ name: "TEST" }, {
 *       where: { id: 2 },
 *       // take into account type casting to prevent TS errors:
 *       returning: ['id', 'name'] as UpdateOptions,
 *     });
 *     console.log(JSON.stringify(scopes)); // {"id":2,"name":"TEST"}
 *     ~~~
 *     This behavior gives an ability to reduce data exchange between DB and
 *     application as well as between app and external source as far as
 *     serialized model will contain only requested data (if any remote source
 *     applicable).
 *     So, whenever you found TS error about returning option on your code,
 *     simply cast options to the same type name as error states, but import
 *     this type from this module.
 */
import { Graph } from './Graph';

export * from 'sequelize-typescript';

import {
    Attributes,
    BuildOptions as BuildOptionsOrigin,
    BulkCreateOptions as BulkCreateOptionsOrigin,
    CreateOptions as CreateOptionsOrigin,
    DropOptions,
    FindOptions as FindOptionsOrigin,
    Identifier, IncludeOptions,
    InitOptions as InitOptionsOrigin, ModelAttributeColumnOptions,
    ModelAttributes,
    ModelOptions,
    QueryInterface as QueryInterfaceOrigin,
    QueryOptions as QueryOptionsOrigin,
    QueryOptionsWithType,
    QueryOptionsWithWhere,
    QueryTypes,
    SaveOptions as InstanceSaveOptionsOrigin,
    SyncOptions as SyncOptionsOrigin, TableName,
    UpdateOptions as UpdateOptionsOrigin,
    UpsertOptions as UpsertOptionsOrigin,
    WhereOptions,
    Model,
} from 'sequelize';
import {
    DataType,
    ModelType,
    Sequelize as SequelizeOrigin,
} from 'sequelize-typescript';
import {
    ColumnIndexOptions,
    IDynamicViewDefineOptions,
    RX_MATCHER,
    RX_NAME_MATCHER,
    ViewParams,
} from './decorators';
import { query } from './helpers';
import sql = query.sql;
import E = query.E;

export type Modify<T, R> = Pick<T, Exclude<keyof T, keyof R>> & R;

/**
 * Original toJSON method from sequelize's Model class.
 */
const toJSON = Model.prototype.toJSON;
const RX_CREATE_VIEW = new RegExp('create\\s+(or\\s+replace\\s+)?' +
    '(materialized\\s+)?view\\s+(.*?)\\s+as', 'i');
const RX_SQL_END = /;$/;
const RX_RETURNING = /returning\s+\*/i;
const ALIAS_PATH_DELIMITER = '->';

/**
 * Extends original SyncOptions from Sequelize to add view support
 */
export interface SyncOptions extends SyncOptionsOrigin {
    treatAsView?: boolean;
    withNoViews?: boolean;
    withoutDrop?: boolean;
}
export interface FindOptions extends FindOptionsOrigin {
    viewParams?: ViewParams;
}
export interface InitOptions
    extends InitOptionsOrigin, IDynamicViewDefineOptions {}
export interface ReturningOptions {
    returning?: boolean | string[];
}
export interface WithIncludeMap extends InitOptions {
    includeMap?: {
        [propertyName: string]: WithIncludeMap & IncludeOptions & FindOptions;
    };
    includeNames?: string[];
    parent: WithIncludeMap;
}
// noinspection JSUnusedGlobalSymbols
export type IModelClass<T extends BaseModel<T>> = new () => T;

// noinspection JSUnusedGlobalSymbols
export type UpsertOptions =
    Modify<UpsertOptionsOrigin, ReturningOptions>;
// noinspection JSUnusedGlobalSymbols
export type BuildOptions =
    Modify<BuildOptionsOrigin, ReturningOptions>;
// noinspection JSUnusedGlobalSymbols
export type BulkCreateOptions =
    Modify<BulkCreateOptionsOrigin, ReturningOptions>;
// noinspection JSUnusedGlobalSymbols
export type QueryOptions =
    Modify<QueryOptionsOrigin, ReturningOptions>;
// noinspection JSUnusedGlobalSymbols
export type UpdateOptions =
    Modify<UpdateOptionsOrigin, ReturningOptions>;
// noinspection JSUnusedGlobalSymbols
export type CreateOptions =
    Modify<CreateOptionsOrigin, ReturningOptions>;
// noinspection JSUnusedGlobalSymbols
export type SaveOptions =
    Modify<InstanceSaveOptionsOrigin, ReturningOptions>;

/**
 * Extends original QueryInterface from sequelize to add support of create/drop
 * views.
 */
export interface QueryInterface extends QueryInterfaceOrigin {
    sequelize: Sequelize;
    dropView(viewName: string, options?: DropOptions): Promise<any>;
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
    if (options &&
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
 * @param {QueryInterface} queryInterface
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
        queryGenerator: QueryGenerator,
    } = queryInterface as QueryInterface;
    const del = (queryInterface as QueryInterface).delete;

    /**
     * Inserts a new record
     */
    (queryInterface as QueryInterface).insert = function(
        instance: Model,
        tableName: string,
        values: object,
        options?: QueryOptions,
    ): Promise<object> {
        fixReturningOptions(options);

        return insert.call(this,
            instance, tableName, values, options);
    };

    /**
     * Inserts or Updates a record in the database
     */
    (queryInterface as QueryInterface).upsert = function(
        tableName: string,
        values: object,
        updateValues: object,
        model: typeof Model,
        options?: QueryOptions
    ): Promise<object> {
        fixReturningOptions(options);

        return upsert.call(this,
            tableName, values, updateValues, model, options);
    };

    /**
     * Inserts multiple records at once
     */
    (queryInterface as QueryInterface).bulkInsert = function(
        tableName: string,
        records: object[],
        options?: QueryOptions,
        attributes?: Record<string, ModelAttributeColumnOptions<Model<any, any>>>,
    ): Promise<object> {
        fixReturningOptions(options);

        return bulkInsert.call(this,
            tableName, records, options, attributes);
    };

    /**
     * Updates a row
     */
    (queryInterface as QueryInterface).update = function <M extends Model<any, any>>(
        instance: M,
        tableName: TableName,
        values: object,
        identifier: WhereOptions<Attributes<M>>,
        options?: QueryOptions
    ): Promise<object> {
        fixReturningOptions(options);

        return update.call(this,
            instance as M, tableName, values, identifier, options);
    };

    /**
     * Updates multiple rows at once
     */
    (queryInterface as QueryInterface).bulkUpdate = function(
        tableName: string,
        values: object,
        identifier: WhereOptions,
        options?: QueryOptions,
        attributes?: string[] | string
    ): Promise<object> {
        fixReturningOptions(options);

        return bulkUpdate.call(this,
            tableName, values, identifier, options, attributes);
    };

    /**
     * Deletes a row
     */
    (queryInterface as QueryInterface).delete = function(
        instance: Model | null,
        tableName: string,
        identifier: WhereOptions,
        options?: QueryOptions,
    ): Promise<object> {
        fixReturningOptions(options);

        return del.call(this,
            instance, tableName, identifier, options);
    };

    /**
     * Deletes multiple rows at once
     */
    (queryInterface as QueryInterface).bulkDelete = function(
        tableName: string,
        identifier: WhereOptions,
        options?: QueryOptions,
        model?: ModelType<any, any>,
    ): Promise<object> {
        fixReturningOptions(options);

        return bulkDelete.call(this,
            tableName, identifier, options, model);
    };

    /**
     * Increments a row value
     */
    (queryInterface as QueryInterface).increment = function(
        instance: Model,
        tableName: string,
        values: object,
        identifier: WhereOptions,
        options?: QueryOptions
    ): Promise<object> {
        fixReturningOptions(options);

        return increment.call(this,
            instance, tableName, values, identifier, options);
    };

    /**
     * Drops view from database
     *
     * @param {string} viewName - view name to drop
     * @param {DropOptions} [options] - drop operation options
     */
    (queryInterface as QueryInterface).dropView = function(
        viewName: string,
        options: DropOptions = {},
    ) {
        const dropViewSql = `DROP VIEW IF EXISTS "${
            viewName}"${options.cascade ? ' CASCADE' : ''}`;

        return this.sequelize.query(
            dropViewSql,
            this.sequelize.options,
        );
    };

    /**
     * Creates view in a database. Makes sure given view name corresponds to
     * the name inside given create SQL query.
     *
     * @param {string} viewName - view name to create
     * @param {string} viewDefinition - raw sql query to create the view
     */
    (queryInterface as QueryInterface).createView = function(
        viewName: string,
        viewDefinition: string,
    ) {
        const rx = new RegExp(
            `\\s*create\\s+(or\\s+replace\\s+)?(temp|temporary\s+)?view\\s+"?${
                viewName
            }"?\\s+`,
            'i',
        );

        if (!rx.test(viewDefinition)) {
            throw new TypeError(
                'Given view definition does not match given view name',
            );
        }

        return this.sequelize.query(
            viewDefinition,
            this.sequelize.options,
        );
    };

    /**
     * Returns selected rows
     */
    (queryInterface as QueryInterface).select = function(
        model: ModelType<any, any>,
        tableName: string,
        options?: QueryOptionsWithWhere,
    ): Promise<object[]> {
        fixReturningOptions(options as any);

        return select.call(this, model, tableName, options);
    };

    /**
     * Increments a row value
     */
    (queryInterface as QueryInterface).increment = function(
        instance: Model,
        tableName: string,
        values: object,
        identifier: WhereOptions,
        options?: QueryOptions
    ): Promise<object> {
        fixReturningOptions(options);

        return increment.call(this,
            instance, tableName, values, identifier, options);
    };

    /**
     * Selects raw without parsing the string into an object
     */
    (queryInterface as QueryInterface).rawSelect = function(
        tableName: string,
        options: QueryOptionsWithWhere,
        attributeSelector: string | string[],
        model?: ModelType<any, any>
    ): Promise<string[]> {
        fixReturningOptions(options as any);

        return rawSelect.call(this,
            tableName, options, attributeSelector, model);
    };

    /**
     * Override QueryGenerator behavior for DynamicViews on select queries
     */
    const { selectQuery } = QueryGenerator as any;

    // takes into account dynamic view can be included
    function fixIncludes(
        options: WithIncludeMap & IncludeOptions,
        sqlQuery: string,
        parentViewParams?: ViewParams,
        path: string = '',
    ): string {
        const model: typeof BaseModel = options.model as
            unknown as typeof BaseModel;
        const modelOptions: InitOptions = (
            (model || {} as any).options || {} as any
        ) as InitOptions;

        path = path
            ? `${path}${ALIAS_PATH_DELIMITER}${options.as}`
            : (options.as || '');

        if (modelOptions.isDynamicView && (
            options.viewParams || parentViewParams
        )) {

            const viewParams = Object.assign({},
                parentViewParams || {},
                options.viewParams || {},
            );

            sqlQuery = sqlQuery.replace(
                `JOIN "${model.getTableName()}" AS "${path}"`,
                `JOIN (${model.getViewDefinition(viewParams, true)
                    .replace(RX_SQL_END, '')
                }) AS "${path}"`,
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

    (QueryGenerator as any).selectQuery = (
        tableName: string,
        options: FindOptions,
        model: typeof BaseModel,
    ) => {
        const modelOptions: InitOptions = model.options as InitOptions;
        let sqlQuery = selectQuery.call(
            QueryGenerator as any,
            tableName, options, model,
        );
        const viewParams = Object.assign({}, modelOptions.viewParams);

        if (modelOptions.isDynamicView && options.viewParams) {
            Object.assign(viewParams, options.viewParams);

            sqlQuery = sqlQuery.replace(
                `FROM "${tableName}" AS`,
                `FROM (${model.getViewDefinition(viewParams, true)
                    .replace(RX_SQL_END, '')
                }) AS`,
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
 * Overriding sequelize behavior to support views
 */
export class Sequelize extends SequelizeOrigin {

    /**
     * Returns an instance of QueryInterface.
     * Supports views.
     *
     * @return {QueryInterface}
     */
    public getQueryInterface(): QueryInterface {
        const self: any = this;

        super.getQueryInterface();

        if (typeof self.queryInterface.dropView !== 'function') {
            self.queryInterface = override(self.queryInterface);
        }

        return self.queryInterface;
    }

    /**
     * Overrides original sequelize define method. Supports views.
     *
     * @param {string} modelName
     * @param {ModelAttributes} attributes
     * @param {ModelOptions} [options]
     * @return {typeof BaseModel<TInstance>}
     */
    public define<TInstance, TAttributes>(
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
     * Sync all defined models to the DB. Including views!
     *
     * @param {SyncOptions} [options]
     * @return {Promise<any>}
     */
    public sync(options?: SyncOptions): Promise<any> {
        const withViews = !options || (options && !options.withNoViews);
        const syncResult = super.sync(options);

        syncResult.then(async result => {
            await this.syncIndices(options);
            return result;
        });

        return withViews ? syncResult.then(() => this.syncViews()) : syncResult;
    }

    /**
     * Synchronizes indices defined for models
     *
     * @param {SyncOptions} options
     * @return {Promise<any>}
     */
    public syncIndices(options?: SyncOptions): Promise<any> {
        return Promise.all(this.getModelsWithIndices().map(model =>
            model.syncIndices(options)));
    }

    /**
     * Syncs all defined views to the DB.
     *
     * @return {Promise<any>}
     */
    public syncViews(options?: SyncOptions): Promise<any> {
        const views = this.getViews();

        return Promise.all(views.map((view) => view.syncView(options)));
    }

    public getModelsWithIndices() {
        const models: typeof BaseModel[] = [];

        (this as any).modelManager.models.forEach((model: any) => {
            if (model && model.options &&
                model.options.indices && model.options.indices.length
            ) {
                models.push(model);
            }
        });

        return models;
    }

    /**
     * Returns list of all defined as views models.
     *
     * @return {Array<typeof BaseModel>}
     */
    public getViews(): typeof BaseModel[] {
        const views: typeof BaseModel[] = [];

        (this as any).modelManager.models.forEach((model: any) => {
            if (model && model.options && model.options.treatAsView) {
                views.push(model);
            }
        });

        return views;
    }

    /**
     * Overriding native query() method to support { returning: string[] }
     * option for queries in a proper way
     *
     * @param {string | { query: string, values: any[] }} sqlQuery
     * @param {QueryOptions} options
     */
    public query(
        sqlQuery: string | { query: string, values: any[] },
        options?: QueryOptions | QueryOptionsWithType<QueryTypes.RAW>,
    ): Promise<any> {
        if (options &&
            Array.isArray((options as QueryOptions).returning) &&
            ((options as QueryOptions).returning as string[]).length
        ) {
            const sqlText = (typeof sqlQuery === 'string'
                ? sqlQuery
                : sqlQuery.query
            ).replace(RX_RETURNING, `RETURNING ${
                ((options as QueryOptions).returning as string[])
                    .map(field => `"${field}"`).join(', ')
            }`);

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
 * Base Model class extends native sequelize Model class
 */
export abstract class BaseModel<T> extends Model<BaseModel<T>> {

    /**
     // noinspection JSUnusedGlobalSymbols
     * Override native drop method to add support of view drops
     *
     * @param {DropOptions} options
     * @return {Promise<any>}
     */
    public static drop(options?: DropOptions): Promise<any> {
        const self: any = this;
        const method = self.options && self.options.treatAsView
            ? 'dropView'
            : 'dropTable';

        // noinspection TypeScriptUnresolvedVariable
        return self.QueryInterface[method](
            self.getTableName(),
            options,
        );
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Sync this Model to the DB, that is create the table. Upon success, the
     * callback will be called with the model instance (this).
     * Supports views.
     *
     * @param {SyncOptions} [options]
     */
    public static async sync(options?: SyncOptions): Promise<any> {
        if ((this as any).options && (this as any).options.treatAsView) {
            // all views skipped until all tables defined
            return Promise.resolve();
        }

        return super.sync(options);
    }

    /**
     * Syncs view to the DB.
     *
     * @param {SyncOptions} [options]
     * @return {Promise<any>}
     */
    public static syncView(options?: SyncOptions): Promise<any> {
        const self: any = this;

        if (options && options.withoutDrop) {
            // noinspection TypeScriptUnresolvedVariable
            return self.QueryInterface.createView(
                self.getTableName(),
                self.getViewDefinition(),
            );
        }

        // noinspection TypeScriptUnresolvedVariable
        return self.QueryInterface.dropView(self.getTableName())
            .then(() => self.QueryInterface.createView(
                self.getTableName(),
                self.getViewDefinition(),
            ));
    }

    /**
     * Returns view definition SQL string.
     *
     * @param {ViewParams} [viewParams]
     * @param {boolean} [asQuery]
     * @return {string}
     */
    public static getViewDefinition(
        viewParams: ViewParams = {},
        asQuery: boolean = false,
    ) {
        const self: any = this;
        let viewDef: string = self.options.viewDefinition || '';

        viewParams = Object.assign({},
            self.options.viewParams,
            viewParams || {},
        );

        if (self.options.isDynamicView) {
            (viewDef.match(RX_MATCHER) || []).forEach((param: string) => {
                // noinspection JSUnusedLocalSymbols
                const [_, name] = (param.match(RX_NAME_MATCHER) || ['', '']);
                const RX_PARAM = new RegExp(`@\{${name}\}`, 'g');

                viewDef = viewDef.replace(RX_PARAM, E(viewParams[name]) + '');
            });
        }

        if (asQuery) {
            viewDef = viewDef.replace(RX_CREATE_VIEW, '');
        }

        return sql(viewDef);
    }

    /**
     * Synchronizes configured indices on this model
     *
     * @param {SyncOptions} options
     * @return {Promise<any>}
     */
    public static syncIndices(options?: SyncOptions): Promise<any> {
        const indices: {
            column: string;
            options: ColumnIndexOptions;
        }[] = (this.options as any).indices;

        return Promise.all(indices.map((indexOptions, i) =>
            this.syncIndex(indexOptions.column, indexOptions.options, i + 1)));
    }

    /**
     * Builds and executes index definition SQL query for the given
     * column and options. Position is used for auto index naming when
     * index name is auto-generated
     *
     * @param {string} column
     * @param {ColumnIndexOptions} options
     * @param {number} position
     * @return {Promise<any>}
     */
    public static syncIndex(
        column: string,
        options: ColumnIndexOptions,
        position: number,
    ) {
        const self: any = this;
        const indexName: string = options.name ||
            `${this.getTableName()}_${column}_idx${position}`;
        const chain = Promise.resolve(true);

        if (!options.safe) {
            // noinspection TypeScriptUnresolvedVariable
            chain.then(() => self.QueryInterface.sequelize.query(`
                DROP INDEX${options.concurrently
                ? ' CONCURRENTLY' : ''} IF EXISTS "${indexName}"
            `));
        }

        // tslint:disable-next-line:max-line-length
        // noinspection TypeScriptUnresolvedVariable,PointlessBooleanExpressionJS
        chain.then(() => self.QueryInterface.sequelize.query(`
                CREATE${options.unique
            ? ' UNIQUE' : ''} INDEX${options.concurrently
            ? ' CONCURRENTLY' : ''}${options.safe
            ? ' IF NOT EXISTS' : ''} "${indexName}"${options.method
            ? ` USING ${options.method}` : ''} ON "${
            this.getTableName()}" (${options.expression
            ? `(${options.expression})` : `"${column}"`})${options.collation
            ? ` COLLATE ${options.collation}` : ''}${options.opClass
            ? ` ${options.opClass}` : ''}${options.order
            ? ` ${options.order}` : ''}${options.nullsFirst === true
            ? ' NULLS FIRST' : (options.nullsFirst === false
                ? ' NULLS LAST' : '')}${options.tablespace
            ? ` TABLESPACE ${options.tablespace}` : ''}${
            options.predicate
                ? ` WHERE ${options.predicate}` : ''}
            `));

        return chain;
    }

    // Make sure finders executed on views properly map numeric types
    /**
     * Search for multiple instances.
     *
     * @see {Sequelize#query}
     */
    public static findAll<M>(
        options?: FindOptions,
    ): Promise<M[]> {
        const method = super.findAll;
        const original =  method.call(this, options);

        if (!(this as any).options.treatAsView) {
            return original;
        }

        return original.then((result: any[]) => {
            if (result && !Array.isArray(result)) {
                return (result as BaseModel<M>).fixNumbers() as any as M;
            } else if (result) {
                result.map((entity: any) =>
                    entity.fixNumbers() as M);
            }

            return result as any as M;
        });
    }

    // noinspection JSAnnotator
    /**
     * Search for a single instance by its primary key. This applies LIMIT 1,
     * so the listener will always be called with a single instance.
     */
    public static findByPk<M>(
        identifier?: Identifier,
        options?: Omit<FindOptions, 'where'>,
    ): Promise<M | null> {
        const method = super.findByPk;
        const original =  method.call(this, identifier, options);

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
     * Search for a single instance. This applies LIMIT 1, so the listener will
     * always be called with a single instance.
     */
    public static findOne<M>(
        options?: FindOptions,
    ): Promise<M | null> {
        const method = super.findOne;
        const original =  method.call(this, options);

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

    // noinspection JSUnusedGlobalSymbols
    /**
     * Restores native serialization state, clearing returning options
     * saved during insert/update query execution
     *
     * @return {BaseModel}
     */
    public restoreSerialization() {
        // noinspection TypeScriptUnresolvedVariable
        delete (this as any)._options.returning;

        return this;
    }

    /**
     * Appends child node to this entity as if it was joined through query
     *
     * @param {string} name
     * @param {any} data
     * @return {BaseModel}
     */
    public appendChild(name: string, data: any) {
        // noinspection TypeScriptUnresolvedVariable
        const returning = (this as any)._options.returning;

        if (returning &&
            Array.isArray(returning) &&
            !~returning.indexOf(name)
        ) {
            returning.push(name);
        }

        (this as any)[name] = data;

        return this;
    }

    /**
     * Serializes this model instance to JSON
     */
    public toJSON(): any {
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

    // noinspection JSUnusedGlobalSymbols
    /**
     * Casts numeric types to numbers for this model if it
     * was not properly done during query selection and mapping.
     * This may occurs sometimes when dealing with Views
     *
     * @return {BaseModel}
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
     * @access private
     * @param {string} prop
     * @param {any} serialized
     */
    private verifyProperty(prop: string, serialized: any) {
        // add more skipping props if needed...
        if (~['__eagerlyLoadedAssociations'].indexOf(prop)) {
            return ;
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
     * @access private
     * @param {Array<any>} arr
     * @param {string} prop
     * @param {any} serialized
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

            serialized[prop][i] = val && val.toJSON
                ? val.toJSON()
                : JSON.parse(JSON.stringify(val));
        }
    }

    /**
     * Returns graph representation of the model associations.
     * This would allow to traverse model association paths and detect
     * cycles.
     *
     * @param {Graph<typeof BaseModel>} [graph]
     * @return {Graph<typeof BaseModel>}
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
