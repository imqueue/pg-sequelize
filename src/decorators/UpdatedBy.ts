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
import {
    BeforeBulkUpdate,
    BeforeCreate,
    BeforeUpdate,
} from 'sequelize-typescript';

// noinspection JSUnusedGlobalSymbols
/**
 * Stamps the decorated column with the acting user id on INSERT and UPDATE,
 * taken from the in-flight IMQ request metadata (`currentMetadata()?.userId`).
 *
 * A property decorator, reusable on any model field. It mirrors `@UpdatedAt`:
 *  - on INSERT it is set to the creating actor (just as `updatedAt` is set equal
 *    to `createdAt` on insert), without overwriting an explicit value;
 *  - on UPDATE it always overwrites with the current actor — "last modified by"
 *    must reflect who actually ran the update and not be caller-spoofable.
 *
 * Three hooks are registered, because models are written in three ways:
 *  - INSERT                            -> `beforeCreate` (set-if-empty)
 *  - instance `save()` / `update()`   -> `beforeUpdate` (receives the instance)
 *  - static `Model.update(values, …)` -> `beforeBulkUpdate` (receives options;
 *    the values to write live on `options.attributes`, and Sequelize filters the
 *    written columns down to `options.fields`, computed before this hook from the
 *    caller's values — so an injected field is dropped unless also added there).
 *
 * No-op when there is no acting user (system / unattributed writes).
 *
 * @param {any} target - the decorated model's prototype
 * @param {string} propertyName - the decorated column property name
 * @return {void}
 */
export function UpdatedBy(target: any, propertyName: string): void {
    const ctor = target.constructor;
    const createHook = `__stampUpdatedByOnCreate$${propertyName}`;
    const singleHook = `__stampUpdatedBy$${propertyName}`;
    const bulkHook = `__stampBulkUpdatedBy$${propertyName}`;

    if (ctor[singleHook]) {
        return;
    }

    ctor[createHook] = function (instance: any): void {
        const userId = currentMetadata()?.userId;

        if (userId != null && instance[propertyName] == null) {
            instance[propertyName] = userId;
        }
    };

    ctor[singleHook] = function (instance: any): void {
        const userId = currentMetadata()?.userId;

        if (userId != null) {
            instance[propertyName] = userId;
        }
    };

    ctor[bulkHook] = function (options: any): void {
        const userId = currentMetadata()?.userId;

        if (userId == null || !options || !options.attributes) {
            return;
        }

        options.attributes[propertyName] = userId;

        if (Array.isArray(options.fields)
            && !options.fields.includes(propertyName)
        ) {
            options.fields.push(propertyName);
        }
    };

    BeforeCreate(ctor, createHook);
    BeforeUpdate(ctor, singleHook);
    BeforeBulkUpdate(ctor, bulkHook);
}
