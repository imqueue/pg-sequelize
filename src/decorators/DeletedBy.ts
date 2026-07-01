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
import { currentMetadata } from '@imqueue/rpc';
import { BeforeBulkDestroy, BeforeBulkRestore } from 'sequelize-typescript';

// noinspection JSUnusedGlobalSymbols
/**
 * Stamps the decorated column with the acting user id on soft-delete (and clears
 * it on restore), taken from the in-flight IMQ request metadata
 * (`currentMetadata()?.userId`). Mirrors `@DeletedAt`: set on delete, cleared on
 * restore, and a delete touches neither `updatedAt` nor an `@UpdatedBy` column.
 *
 * A property decorator for paranoid models, reusable on any field. Soft-delete
 * runs through `Model.destroy`, which Sequelize turns into a `deletedAt`-only
 * UPDATE whose value hash is built internally and is unreachable from any hook.
 * So instead of mutating that statement, the `beforeBulkDestroy` hook stamps the
 * column with a sibling UPDATE over the same still-live rows (same `where`, same
 * transaction) just before the soft-delete sets `deletedAt`; `beforeBulkRestore`
 * does the inverse, clearing it as `deletedAt` is cleared.
 *
 * `hooks: false` avoids hook re-entrancy and keeps the delete from bumping an
 * `@UpdatedBy` column; `silent: true` keeps it from bumping `updatedAt`, so the
 * delete writes exactly `deletedBy` + `deletedAt` (like the native paranoid
 * delete writes only `deletedAt`). No-op when there is no acting user.
 *
 * @param {any} target - the decorated model's prototype
 * @param {string} propertyName - the decorated column property name
 * @return {void}
 */
export function DeletedBy(target: any, propertyName: string): void {
    const ctor = target.constructor;
    const bulkHook = `__stampBulkDeletedBy$${propertyName}`;
    const restoreHook = `__clearBulkDeletedBy$${propertyName}`;

    if (ctor[bulkHook]) {
        return;
    }

    ctor[bulkHook] = async function (options: any): Promise<void> {
        const userId = currentMetadata()?.userId;

        if (userId == null || !options || !options.where) {
            return;
        }

        await ctor.update(
            { [propertyName]: userId },
            {
                where: options.where,
                transaction: options.transaction,
                hooks: false,
                silent: true,
            },
        );
    };

    ctor[restoreHook] = async function (options: any): Promise<void> {
        if (!options || !options.where) {
            return;
        }

        await ctor.update(
            { [propertyName]: null },
            {
                where: options.where,
                transaction: options.transaction,
                paranoid: false,
                hooks: false,
                silent: true,
            },
        );
    };

    BeforeBulkDestroy(ctor, bulkHook);
    BeforeBulkRestore(ctor, restoreHook);
}
