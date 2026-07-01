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
import { BeforeCreate } from 'sequelize-typescript';

// noinspection JSUnusedGlobalSymbols
/**
 * Stamps the decorated column with the acting user id on INSERT, taken from the
 * in-flight IMQ request metadata (`currentMetadata()?.userId`) — so the id never
 * travels through method arguments and cannot be spoofed by a caller.
 *
 * A property decorator, reusable on any model field. It registers a per-field
 * `beforeCreate` hook on the owning model. The hook is a no-op when there is no
 * acting user (system / unattributed writes) and never overwrites a value the
 * application set explicitly.
 *
 * Mechanism: a property decorator receives the prototype, but Sequelize hook
 * decorators must target a static method on the constructor, so a generated
 * static method is attached to `target.constructor` and registered through the
 * public `@BeforeCreate`. Hooks are installed by sequelize-typescript's
 * `installHooks` during `Sequelize#addModels`.
 *
 * @param {any} target - the decorated model's prototype
 * @param {string} propertyName - the decorated column property name
 * @return {void}
 */
export function CreatedBy(target: any, propertyName: string): void {
    const ctor = target.constructor;
    const hookName = `__stampCreatedBy$${propertyName}`;

    if (ctor[hookName]) {
        return;
    }

    ctor[hookName] = function (instance: any): void {
        const userId = currentMetadata()?.userId;

        if (userId != null && instance[propertyName] == null) {
            instance[propertyName] = userId;
        }
    };

    BeforeCreate(ctor, hookName);
}
