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
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BaseModel, Sequelize } from '../src/index.js';

const CONNECTION = 'postgres://user:pass@127.0.0.1:5432/nodb';

/** Long enough that a pass which is not awaited finishes after the assertion. */
function tick(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 5));
}

/**
 * Replaces the table sync inherited from sequelize, so none of this needs a
 * database. Defined on the parent prototype because that is where `super.sync`
 * looks it up.
 */
async function withoutTableSync(fn: () => Promise<void>): Promise<void> {
    const parent: any = Object.getPrototypeOf(Sequelize.prototype);
    const owned = Object.prototype.hasOwnProperty.call(parent, 'sync');
    const original = parent.sync;

    parent.sync = function (this: unknown) {
        return Promise.resolve(this);
    };

    try {
        await fn();
    } finally {
        if (owned) {
            parent.sync = original;
        } else {
            delete parent.sync;
        }
    }
}

function connection(): any {
    return new Sequelize(CONNECTION, { dialect: 'postgres' } as any);
}

describe('Sequelize.sync()', () => {
    it('runs views then indices, and waits for both', async () => {
        const order: string[] = [];

        await withoutTableSync(async () => {
            const orm = connection();

            orm.getViews = () => [
                {
                    syncView: async (options: any) => {
                        // The options used to be dropped on the way here, so
                        // sync({ withoutDrop: true }) did nothing at all.
                        order.push(`view:${options && options.withoutDrop}`);
                    },
                },
            ];
            orm.getModelsWithIndices = () => [
                {
                    syncIndices: async () => {
                        await tick();
                        order.push('index');
                    },
                },
            ];

            await orm.sync({ withoutDrop: true });
        });

        // The index pass used to be started and thrown away, so 'index'
        // landed after this assertion — when it landed at all.
        assert.deepEqual(order, ['view:true', 'index']);
    });

    it('skips the view pass but still creates indices', async () => {
        const order: string[] = [];

        await withoutTableSync(async () => {
            const orm = connection();

            orm.getViews = () => {
                order.push('view');

                return [];
            };
            orm.getModelsWithIndices = () => [
                {
                    syncIndices: async () => {
                        order.push('index');
                    },
                },
            ];

            await orm.sync({ withNoViews: true });
        });

        assert.deepEqual(order, ['index']);
    });

    it('rejects when the index pass fails', async () => {
        await withoutTableSync(async () => {
            const orm = connection();

            orm.getViews = () => [];
            orm.getModelsWithIndices = () => [
                {
                    syncIndices: async () => {
                        throw new Error('index boom');
                    },
                },
            ];

            // Unawaited, this was an unhandled rejection — fatal on any
            // current Node rather than a failed sync().
            await assert.rejects(() => orm.sync(), /index boom/);
        });
    });
});

describe('BaseModel.syncIndex()', () => {
    function target() {
        const statements: string[] = [];
        const started: string[] = [];
        const finished: string[] = [];
        const model: any = {
            getTableName: () => 'Lead',
            queryInterface: {
                sequelize: {
                    query: async (statement: string) => {
                        const tag = /DROP/i.test(statement) ? 'drop' : 'create';

                        statements.push(statement);
                        started.push(tag);
                        await tick();
                        finished.push(tag);

                        return [];
                    },
                },
            },
        };

        return { model, statements, started, finished };
    }

    function syncIndex(model: any, ...args: any[]): Promise<any> {
        return (BaseModel as any).syncIndex.apply(model, args);
    }

    it('drops before creating, and waits for both', async () => {
        const { model, started, finished } = target();

        await syncIndex(model, 'email', {}, 1);

        // Both statements used to be attached to the same resolved promise, so
        // they were issued together and this resolved before either finished:
        // `finished` was empty here, and the create could beat the drop.
        assert.deepEqual(started, ['drop', 'create']);
        assert.deepEqual(finished, ['drop', 'create']);
    });

    it('names the index after the column and position', async () => {
        const { model, statements } = target();

        await syncIndex(model, 'email', {}, 3);

        assert.equal(
            statements.every(statement =>
                statement.includes('"Lead_email_idx3"'),
            ),
            true,
        );
    });

    it('honours a given name over the generated one', async () => {
        const { model, statements } = target();

        await syncIndex(model, 'email', { name: 'lead_email_lower' }, 1);

        assert.equal(
            statements.every(statement =>
                statement.includes('"lead_email_lower"'),
            ),
            true,
        );
    });

    it('creates if not exists and skips the drop when safe', async () => {
        const { model, statements, finished } = target();

        await syncIndex(model, 'email', { safe: true }, 1);

        assert.deepEqual(finished, ['create']);
        assert.match(statements[0], /IF NOT EXISTS/);
    });

    it('builds the declared clauses into the statement', async () => {
        const { model, statements } = target();

        await syncIndex(
            model,
            'email',
            {
                unique: true,
                concurrently: true,
                method: 'BTREE',
                order: 'DESC',
                nullsFirst: false,
                predicate: '"deletedAt" IS NULL',
            },
            1,
        );

        const create = statements[1];

        assert.match(create, /CREATE UNIQUE INDEX CONCURRENTLY/);
        assert.match(create, /USING BTREE/);
        assert.match(create, /DESC NULLS LAST/);
        assert.match(create, /WHERE "deletedAt" IS NULL/);
    });

    it('indexes the expression instead of the column when given one', async () => {
        const { model, statements } = target();

        await syncIndex(model, 'email', { expression: 'lower("email")' }, 1);

        assert.match(statements[1], /\(\(lower\("email"\)\)\)/);
    });

    it('rejects when a statement fails', async () => {
        const { model } = target();

        model.queryInterface.sequelize.query = async () => {
            throw new Error('index boom');
        };

        await assert.rejects(
            () => syncIndex(model, 'email', {}, 1),
            /index boom/,
        );
    });
});

describe('BaseModel.syncIndices()', () => {
    it('resolves when the model declares no indices', async () => {
        // It used to read `.indices` straight off the options and call .map()
        // on undefined, so this threw synchronously out of a method that
        // otherwise returns a promise.
        await (BaseModel as any).syncIndices.call({ options: {} });
    });
});
