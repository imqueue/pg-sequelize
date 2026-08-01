/*!
 * @imqueue/sequelize - Sequelize ORM refines for @imqueue
 *
 * Copyright (c) 2019, imqueue.com <support@imqueue.com>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 * LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 * OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 */
import { DEFAULT_IMQ_SERVICE_OPTIONS, type ILogger } from '@imqueue/rpc';
import { createRequire } from 'node:module';
import { styleText } from 'node:util';
import { readdirSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { type SequelizeOptions } from 'sequelize-typescript';
import { Sequelize } from './BaseModel.js';
import { isDefined, isOk } from './helpers/js.js';

/* models exports! */
export * from './Graph.js';
export * from './BaseModel.js';
export * from './helpers/index.js';
export * from './decorators/index.js';
export * from './types/index.js';

const JS_EXT_RX = /\.js$/;

/**
 * Returns all files list from a given directory
 *
 * @param dir
 */
function walk(dir: string) {
    let results: string[] = [];

    for (let file of readdirSync(dir)) {
        file = resolve(dir, file);

        const stat = statSync(file);

        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    }

    return results;
}

/**
 * Everything {@link database} needs on its first call.
 *
 * @remarks
 * Only the first `database()` call reads this, so treat it as start-up config rather
 * than something to vary per call. Note also that `database()` WRITES to the object
 * it is given — it fills in `connectionString` from the environment and replaces
 * `sequelize.logging` — so a config exported as a module constant and passed at every
 * call site does not stay as written.
 */
export interface IMQORMOptions {
    /**
     * Where SQL statements are logged.
     *
     * @remarks
     * Falls back to the `@imqueue/rpc` service default, then to `console`, so it can
     * be left out. `@imqueue/async-logger` is the usual choice.
     */
    logger: ILogger;
    /**
     * Postgres connection string.
     *
     * @remarks
     * Optional only because {@link DB_CONN_STR} can supply it. With neither,
     * `database()` throws.
     */
    connectionString?: string;
    /**
     * Options passed through to the Sequelize constructor.
     *
     * @remarks
     * `logging` is the one property `database()` overwrites — see {@link database}
     * for what each value means.
     */
    sequelize: SequelizeOptions;
    /**
     * Directory holding the COMPILED model files.
     *
     * @remarks
     * Walked recursively for `.js` files, so point it at build output rather than at
     * `.ts` sources. Each file must export a symbol named exactly after the file —
     * `Lead.js` must export `Lead` — because that is how the loader picks the model
     * out of the module. A mismatch hands Sequelize `undefined` instead of a model.
     */
    modelsPath: string;
}

/**
 * `DB_CONN_STR` from the environment, read once when this module loads.
 *
 * @remarks
 * The fallback {@link database} uses when {@link IMQORMOptions.connectionString} is
 * absent. Because it is captured at import time, changing `process.env` later has no
 * effect on it.
 */
export const DB_CONN_STR = process.env.DB_CONN_STR;

/**
 * Whether logged SQL is reformatted across multiple lines. Off by default.
 *
 * @remarks
 * Set `SQL_PRETTIFY` to a positive number to enable. Read once at import, so it is a
 * deployment setting rather than something to toggle at runtime. Affects logging
 * only — never the SQL that is executed.
 */
export const SQL_PRETTIFY = +(process.env.SQL_PRETTIFY || 0) > 0;

/**
 * Whether logged SQL carries ANSI colour. Off by default.
 *
 * @remarks
 * Set `SQL_COLORIZE` to a positive number to enable. Worth leaving off wherever logs
 * are collected rather than read in a terminal, since the escape sequences end up in
 * the stored line. Independent of {@link SQL_PRETTIFY}.
 */
export const SQL_COLORIZE = +(process.env.SQL_COLORIZE || 0) > 0;

import { format as sqlFormat } from 'sql-formatter';
const RX_SQL_NUM_LAYOUT = /\s+(['"]?\d+['"]?,?)\r?\n/g;
const RX_SQL_NUM_END = /(\d+['"]?)\s+(\))/g;
const RX_BRK_DBL_AND = /&\s+&/g;
const RX_BRK_CAST = /\s+(\[|::)(\s+)?/g;
const RX_BRK_POCKETS = /(\$)\s+(\d)/g;
const RX_SQL_PREFIX = /Execut(ed|ing) \(default\):/;

/**
 * Reformats a SQL string for logging, when {@link SQL_PRETTIFY} is on.
 *
 * @remarks
 * A pass-through when prettifying is off, so it is always safe to call. Otherwise
 * `sql-formatter` does the work and a handful of substitutions tidy up what it does
 * to Postgres-specific syntax — casts, `&&`, and bind-parameter markers, which the
 * formatter would otherwise break across lines.
 *
 * For logs only. It is not a parser and the result is not guaranteed to be
 * executable.
 *
 * @param sql - Statement as sequelize reports it.
 * @returns The reformatted statement, or `sql` unchanged when prettifying is off.
 */
export function formatSql(sql: string): string {
    return SQL_PRETTIFY
        ? sqlFormat(sql)
              .replace(RX_SQL_NUM_LAYOUT, '$1 ')
              .replace(RX_SQL_NUM_END, '$1$2')
              .replace(RX_BRK_DBL_AND, '&&')
              .replace(RX_BRK_CAST, '$1')
              .replace(RX_BRK_POCKETS, '$1$2')
        : sql;
}

/**
 * A sequelize `logging` callback: the SQL, and the timing when benchmarking is on.
 */
export type SqlLoggingFunction = (sql: string, time?: number) => void;

/**
 * Builds the sequelize `logging` callback, honouring `SQL_PRETTIFY` and
 * `SQL_COLORIZE`.
 *
 * @remarks
 * Accepts either an `ILogger` or a plain callback, and that distinction is
 * load-bearing rather than convenience: a caller who sets
 * `sequelize.logging` to their own function used to have it swapped for this one
 * with the function itself in the logger slot, so the first query to be logged threw
 * `TypeError: logger.log is not a function`. Both shapes now receive the formatted
 * SQL.
 *
 * @param sink - Where to write: a logger, or a callback in sequelize's own shape.
 * @returns The callback to hand to sequelize as `options.logging`.
 */
const logging =
    (sink: ILogger | SqlLoggingFunction) =>
    (sql: string, time?: number): void => {
        const message = SQL_COLORIZE
            ? `${styleText(['bold', 'yellow'], 'SQL Query:')} ${styleText(
                  'cyan',
                  formatSql(sql.replace(RX_SQL_PREFIX, '')),
              )}`
            : `SQL Query: ${formatSql(sql.replace(RX_SQL_PREFIX, ''))}`;

        if (typeof sink === 'function') {
            sink(message, time);

            return;
        }

        sink.log(
            message,
            typeof time === 'number' ? `executed in ${time} ms` : '',
        );
    };

let orm: Sequelize;

/**
 * Connects to the database, loads the models, and returns the Sequelize instance.
 *
 * @remarks
 * A process-wide singleton. The first call does all the work; every call after it
 * returns the cached instance and DOES NOT LOOK AT ITS ARGUMENT — so passing a
 * different config later is silently ignored rather than reconnecting. That is why
 * services can import `database` anywhere and call `database(dbConfig)` freely, and
 * also why there is no way to swap the connection once it is up.
 *
 * The first call resolves its configuration in this order:
 *
 * - `connectionString`, or {@link DB_CONN_STR} from the environment. Neither throws.
 * - `logger`, or the `@imqueue/rpc` service default, or `console`.
 * - `sequelize.logging`: left alone if explicitly falsy, so `false` disables logging;
 *   otherwise replaced with this package's formatter, honouring {@link SQL_PRETTIFY}
 *   and {@link SQL_COLORIZE}. A function you supply is wrapped rather than discarded,
 *   and receives the formatted SQL.
 *
 * Models are then discovered by walking `modelsPath` for compiled `.js` files and
 * taking the export whose name matches the filename — see
 * {@link IMQORMOptions.modelsPath}, since a mismatch there fails in a way the error
 * does not explain. The require is synchronous and CommonJS-scoped, which is what
 * makes the models loadable from an ESM package.
 *
 * @param options - Required on the first call, ignored on every later one.
 * @returns The single Sequelize instance for this process, with models registered.
 * @throws TypeError when the first call has no options, or when no connection string
 *   can be resolved from either the options or the environment.
 * @example
 * ```typescript
 * // config.ts — built once at start-up
 * export const dbConfig: IMQORMOptions = {
 *     logger,
 *     connectionString: process.env.DB_CONN_STR || '',
 *     sequelize: toSequelizeConfig(process.env.DB_CONN_STR, process.env.DB_DIALECT),
 *     modelsPath: './src/orm/models',
 * };
 *
 * // anywhere in the service — the first call wins, the rest are free
 * const orm = database(dbConfig);
 * ```
 */
export function database(options?: IMQORMOptions): Sequelize {
    if (typeof orm !== 'undefined') {
        return orm;
    } else if (typeof options === 'undefined') {
        throw new TypeError(
            'First call of database() must provide valid options!',
        );
    }

    if (!options.connectionString) {
        if (!DB_CONN_STR) {
            throw new TypeError(
                'Either environment DB_CONN_STR should be set or ' +
                    'connectionString property given!',
            );
        }

        options.connectionString = DB_CONN_STR;
    }

    if (!options.connectionString) {
        throw new TypeError('Database connection string is required!');
    }

    if (!options.logger) {
        options.logger =
            DEFAULT_IMQ_SERVICE_OPTIONS.logger || (console as ILogger);
    }

    // A caller-supplied function is a logging SINK, not a logger object — it has
    // no `.log`, so casting it to ILogger threw on the first query that got
    // logged. It is still wrapped rather than used raw, so SQL_PRETTIFY and
    // SQL_COLORIZE keep working for this path too.
    options.sequelize.logging =
        !isDefined(options.sequelize.logging) || isOk(options.sequelize.logging)
            ? logging(
                  typeof options.sequelize.logging === 'function'
                      ? (options.sequelize.logging as SqlLoggingFunction)
                      : options.logger,
              )
            : (options.sequelize.logging as boolean);

    orm = new Sequelize(options.connectionString as string, options.sequelize);

    // model files are loaded synchronously with a CommonJS require
    // scoped to this module: consumer model builds are CJS today, and
    // require(esm) covers them if they migrate (Node >= 22.12)
    const requireModel = createRequire(import.meta.url);

    orm.addModels(
        walk(resolve(options.modelsPath))
            .filter(name => JS_EXT_RX.test(name))
            .map(
                filename =>
                    requireModel(filename)[
                        filename.split(sep).reverse()[0].replace(JS_EXT_RX, '')
                    ],
            ),
    );

    options.logger.log('Database models initialized...');

    return orm;
}
