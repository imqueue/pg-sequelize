/*!
 * @imqueue/sequelize - Sequelize ORM refines for @imqueue
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
import { describe, it } from 'node:test';
import 'reflect-metadata';
import { type IMQRPCRequest, runWithRequest } from '@imqueue/rpc';
import { CreatedBy, DeletedBy, UpdatedBy } from '../src/index.js';

const USER_ID = 42;

function asUser<T>(fn: () => T): T {
    return runWithRequest(
        { metadata: { userId: USER_ID } } as unknown as IMQRPCRequest,
        fn,
    );
}

function decorated(decorator: (target: any, prop: string) => void) {
    class Model {}
    decorator(Model.prototype, 'stamped');

    return Model as any;
}

describe('decorators', () => {
    it('should register all hooks in sequelize-typescript metadata', () => {
        class Model {}
        CreatedBy(Model.prototype, 'createdBy');
        UpdatedBy(Model.prototype, 'updatedBy');
        DeletedBy(Model.prototype, 'deletedBy');

        const hooks: Array<{ hookType: string; methodName: string }> =
            Reflect.getMetadata('sequelize:hooks', Model) || [];
        const types = hooks.map(hook => hook.hookType).sort();

        assert.deepEqual(types, [
            'beforeBulkCreate',
            'beforeBulkCreate',
            'beforeBulkDestroy',
            'beforeBulkRestore',
            'beforeBulkUpdate',
            'beforeCreate',
            'beforeCreate',
            'beforeUpdate',
        ]);
    });

    describe('@CreatedBy', () => {
        it('should register create and bulk-create hooks once', () => {
            const model = decorated(CreatedBy);

            assert.equal(typeof model.__stampCreatedBy$stamped, 'function');
            assert.equal(
                typeof model.__stampCreatedByOnBulkCreate$stamped,
                'function',
            );

            const hook = model.__stampCreatedBy$stamped;
            CreatedBy(model.prototype, 'stamped');
            assert.equal(model.__stampCreatedBy$stamped, hook);
        });

        it('should stamp empty column with acting user on create', () => {
            const model = decorated(CreatedBy);
            const instance: any = {};

            asUser(() => model.__stampCreatedBy$stamped(instance));

            assert.equal(instance.stamped, USER_ID);
        });

        it('should not overwrite an explicitly set value', () => {
            const model = decorated(CreatedBy);
            const instance: any = { stamped: 7 };

            asUser(() => model.__stampCreatedBy$stamped(instance));

            assert.equal(instance.stamped, 7);
        });

        it('should be a no-op without an acting user', () => {
            const model = decorated(CreatedBy);
            const instance: any = {};

            model.__stampCreatedBy$stamped(instance);

            assert.equal(instance.stamped, undefined);
        });

        it('should stamp all bulk-created instances and extend fields', () => {
            const model = decorated(CreatedBy);
            const instances: any[] = [{}, { stamped: 7 }, {}];
            const options: any = { fields: ['other'] };

            asUser(() =>
                model.__stampCreatedByOnBulkCreate$stamped(instances, options),
            );

            assert.deepEqual(
                instances.map(instance => instance.stamped),
                [USER_ID, 7, USER_ID],
            );
            assert.ok(options.fields.includes('stamped'));
        });
    });

    describe('@UpdatedBy', () => {
        it(
            'should register create, bulk-create, update and bulk-update ' +
                'hooks',
            () => {
                const model = decorated(UpdatedBy);

                for (const hook of [
                    '__stampUpdatedByOnCreate$stamped',
                    '__stampUpdatedByOnBulkCreate$stamped',
                    '__stampUpdatedBy$stamped',
                    '__stampBulkUpdatedBy$stamped',
                ]) {
                    assert.equal(typeof model[hook], 'function', hook);
                }
            },
        );

        it('should set-if-empty on create', () => {
            const model = decorated(UpdatedBy);
            const kept: any = { stamped: 7 };
            const fresh: any = {};

            asUser(() => {
                model.__stampUpdatedByOnCreate$stamped(kept);
                model.__stampUpdatedByOnCreate$stamped(fresh);
            });

            assert.equal(kept.stamped, 7);
            assert.equal(fresh.stamped, USER_ID);
        });

        it('should always overwrite on instance update', () => {
            const model = decorated(UpdatedBy);
            const instance: any = { stamped: 7 };

            asUser(() => model.__stampUpdatedBy$stamped(instance));

            assert.equal(instance.stamped, USER_ID);
        });

        it(
            'should inject the column into bulk update attributes and ' +
                'fields',
            () => {
                const model = decorated(UpdatedBy);
                const options: any = {
                    attributes: { name: 'new' },
                    fields: ['name'],
                };

                asUser(() => model.__stampBulkUpdatedBy$stamped(options));

                assert.equal(options.attributes.stamped, USER_ID);
                assert.ok(options.fields.includes('stamped'));
            },
        );

        it('should be a no-op on bulk update without an acting user', () => {
            const model = decorated(UpdatedBy);
            const options: any = {
                attributes: { name: 'new' },
                fields: ['name'],
            };

            model.__stampBulkUpdatedBy$stamped(options);

            assert.equal(options.attributes.stamped, undefined);
            assert.equal(options.fields.includes('stamped'), false);
        });
    });

    describe('@DeletedBy', () => {
        function fakeModel() {
            const model = decorated(DeletedBy);
            const calls: Array<{ values: any; options: any }> = [];

            model.update = async (values: any, options: any) => {
                calls.push({ values, options });
            };

            return { model, calls };
        }

        it('should stamp rows with a sibling silent update on destroy', async () => {
            const { model, calls } = fakeModel();
            const where = { id: 1 };
            const transaction = { fake: true };

            await asUser(() =>
                model.__stampBulkDeletedBy$stamped({
                    where,
                    transaction,
                }),
            );

            assert.equal(calls.length, 1);
            assert.deepEqual(calls[0].values, { stamped: USER_ID });
            assert.equal(calls[0].options.where, where);
            assert.equal(calls[0].options.transaction, transaction);
            assert.equal(calls[0].options.hooks, false);
            assert.equal(calls[0].options.silent, true);
        });

        it('should be a no-op on destroy without an acting user', async () => {
            const { model, calls } = fakeModel();

            await model.__stampBulkDeletedBy$stamped({ where: { id: 1 } });

            assert.equal(calls.length, 0);
        });

        it(
            'should clear the column on restore, including soft-deleted ' +
                'rows',
            async () => {
                const { model, calls } = fakeModel();
                const where = { id: 1 };

                await model.__clearBulkDeletedBy$stamped({ where });

                assert.equal(calls.length, 1);
                assert.deepEqual(calls[0].values, { stamped: null });
                assert.equal(calls[0].options.paranoid, false);
                assert.equal(calls[0].options.hooks, false);
                assert.equal(calls[0].options.silent, true);
            },
        );

        it(
            'should resolve the model from the hook call context (late ' +
                'binding for base-class usage)',
            async () => {
                const model = decorated(DeletedBy);
                const calls: any[] = [];
                // emulate sequelize calling the inherited hook with a concrete
                // subclass as `this`
                const subclass = {
                    update: async (values: any, options: any) => {
                        calls.push({ values, options });
                    },
                };

                await asUser(() =>
                    model.__stampBulkDeletedBy$stamped.call(subclass, {
                        where: { id: 2 },
                    }),
                );

                assert.equal(calls.length, 1);
                assert.deepEqual(calls[0].values, { stamped: USER_ID });
            },
        );
    });
});
