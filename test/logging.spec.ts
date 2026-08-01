/*!
 * @imqueue/pg-sequelize - Sequelize ORM refines for @imqueue
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
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { type ILogger } from '@imqueue/rpc';
import { database, query } from '../src/index.js';

// `database()` caches its Sequelize instance in module state, so the first call in
// this process is the only one that configures anything — which is exactly why this
// spec is its own file. `node --test` gives each file a fresh process.
const MODELS = mkdtempSync(join(tmpdir(), 'imq-sequelize-models-'));
const CONNECTION = 'postgres://user:pass@127.0.0.1:5432/nodb';

describe('database() logging configuration', () => {
    it('sends SQL to a caller-supplied logging function', () => {
        const seen: string[] = [];
        // A sequelize `logging` callback is a plain function, NOT an ILogger. It
        // used to be cast to one and put in the logger slot, so the first query to
        // be logged threw `TypeError: logger.log is not a function` — a crash in
        // the default configuration, since logging is on unless turned off.
        const orm = database({
            logger: console as ILogger,
            connectionString: CONNECTION,
            sequelize: {
                dialect: 'postgres',
                logging: (sql: string) => seen.push(sql),
            } as any,
            modelsPath: MODELS,
        });

        const installed = orm.options.logging as (
            sql: string,
            time?: number,
        ) => void;

        assert.equal(typeof installed, 'function');
        assert.doesNotThrow(() => installed('SELECT 1', 3));
        assert.equal(seen.length, 1, 'the callback should have been called');
        assert.match(seen[0], /SELECT 1/);
    });

    it('returns the same instance and ignores later options', () => {
        // Documented singleton behaviour: every call after the first returns the
        // cached instance and its argument is not looked at.
        const first = database();
        const second = database({
            logger: console as ILogger,
            connectionString: 'postgres://other@127.0.0.1:5432/other',
            sequelize: { dialect: 'postgres' } as any,
            modelsPath: MODELS,
        });

        assert.equal(first, second);
    });
});

describe('query.sql()', () => {
    it('refuses template substitutions instead of mangling the statement', () => {
        const id = 42;

        // `String(templateStringsArray)` joins the literal parts with commas, so
        // this used to yield `... id = ,` — wrong SQL, silently.
        assert.throws(
            () => query.sql`SELECT * FROM t WHERE id = ${id}`,
            /does not interpolate/,
        );
    });

    it('normalises a statement and keeps quoted whitespace', () => {
        assert.equal(query.sql('SELECT  1   FROM  t'), 'SELECT 1 FROM t;');
        assert.equal(query.sql`SELECT * FROM t`, 'SELECT * FROM t;');
        assert.equal(
            query.sql("SELECT 'a   b'  FROM  t"),
            "SELECT 'a   b' FROM t;",
        );
    });
});
