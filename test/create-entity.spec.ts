/*!
 * @imqueue/pg-sequelize - Sequelize ORM refines for @imqueue
 *
 * I'm Queue Software Project
 * Copyright (C) 2026  imqueue.com <support@imqueue.com>
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
import { beforeEach, describe, it } from 'node:test';
import { type ILogger } from '@imqueue/rpc';
import { type BaseModel, database, query } from '../src/index.js';

// `database()` caches its Sequelize instance in module state and doCreateEntity
// takes its transactions from there, so the instance has to be stubbed for the
// whole process — hence a spec of its own, `node --test` giving each file one.
const MODELS = mkdtempSync(join(tmpdir(), 'imq-sequelize-create-entity-'));
const CONNECTION = 'postgres://user:pass@127.0.0.1:5432/nodb';

const orm: any = database({
    logger: console as ILogger,
    connectionString: CONNECTION,
    sequelize: { dialect: 'postgres', logging: false },
    modelsPath: MODELS,
});

/** What a transaction did, in the order it happened. */
let finishes: string[];

/**
 * Stands in for a sequelize `Transaction`, recording which end of the lifecycle
 * it was finished on instead of talking to a connection.
 */
function fakeTransaction(): any {
    return {
        commit: async () => void finishes.push('commit'),
        rollback: async () => void finishes.push('rollback'),
    };
}

/** A model whose `save()` resolves, or rejects with `failure` when given. */
function stubModel(failure?: Error, associations: any = {}): typeof BaseModel {
    return class Stub {
        static associations = associations;
        static rawAttributes = {
            id: { primaryKey: true },
            name: {},
        };

        constructor(input: any) {
            Object.assign(this, input);
        }

        appendChild(property: string, child: any): void {
            (this as any)[property] = child;
        }

        async save(): Promise<void> {
            if (failure) {
                throw failure;
            }
        }
    } as unknown as typeof BaseModel;
}

/** A parent model with one has-one relation named `child`, pointing at `target`. */
function withChild(
    target: typeof BaseModel,
    failure?: Error,
): typeof BaseModel {
    return stubModel(failure, {
        child: { target, options: { as: 'child' } },
    });
}

describe('query.createEntity() transaction lifecycle', () => {
    beforeEach(() => {
        finishes = [];
        orm.transaction = async () => fakeTransaction();
    });

    it('commits the transaction it opened when the insert succeeds', async () => {
        await query.createEntity(stubModel(), { name: 'x' });

        assert.deepEqual(finishes, ['commit']);
    });

    it('rolls back the transaction it opened when the insert fails', async () => {
        // Without the rollback the transaction stays open and sequelize never
        // hands its pooled connection back, so `pool.max` failed inserts (5 by
        // default) exhaust the pool and every later query in the process fails
        // with SequelizeConnectionAcquireTimeoutError.
        const failure = new Error(
            'duplicate key value violates unique constraint',
        );

        await assert.rejects(
            () => query.createEntity(stubModel(failure), { name: 'x' }),
            failure,
        );
        assert.deepEqual(finishes, ['rollback']);
    });

    it('rethrows the original error when the rollback itself fails', async () => {
        const failure = new Error(
            'null value in column violates not-null constraint',
        );

        orm.transaction = async () => ({
            commit: async () => void finishes.push('commit'),
            rollback: async () => {
                finishes.push('rollback');

                throw new Error('rollback failed');
            },
        });

        await assert.rejects(
            () => query.createEntity(stubModel(failure), { name: 'x' }),
            failure,
        );
        assert.deepEqual(finishes, ['rollback']);
    });

    it('finishes the shared transaction once when a relation create succeeds', async () => {
        // The nested call inherits doCommit=true and must still leave the
        // transaction alone — carrying a `parent` is what excludes it.
        await query.createEntity(withChild(stubModel()), {
            name: 'x',
            child: { name: 'y' },
        });

        assert.deepEqual(finishes, ['commit']);
    });

    it('rolls back once, from the owner, when a relation create fails', async () => {
        const failure = new Error(
            'insert on table violates foreign key constraint',
        );

        await assert.rejects(
            () =>
                query.createEntity(withChild(stubModel(failure)), {
                    name: 'x',
                    child: { name: 'y' },
                }),
            failure,
        );
        // One entry, not two: the nested call must not roll back a transaction
        // it does not own, or the owner's rollback would then throw on an
        // already-finished transaction.
        assert.deepEqual(finishes, ['rollback']);
    });

    it('leaves a caller-supplied transaction alone on success', async () => {
        orm.transaction = async () => {
            throw new Error('should not open a transaction of its own');
        };

        await query.createEntity(
            stubModel(),
            { name: 'x' },
            undefined,
            fakeTransaction(),
        );

        assert.deepEqual(finishes, []);
    });

    it('leaves a caller-supplied transaction alone on failure', async () => {
        // The caller owns both ends of the lifecycle here — rolling it back from
        // inside would finish a transaction the caller is still using.
        const failure = new Error(
            'duplicate key value violates unique constraint',
        );

        orm.transaction = async () => {
            throw new Error('should not open a transaction of its own');
        };

        await assert.rejects(
            () =>
                query.createEntity(
                    stubModel(failure),
                    { name: 'x' },
                    undefined,
                    fakeTransaction(),
                ),
            failure,
        );
        assert.deepEqual(finishes, []);
    });
});
