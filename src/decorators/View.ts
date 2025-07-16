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
import 'reflect-metadata';
import { ModelOptions } from 'sequelize';
import { addOptions, setModelName } from 'sequelize-typescript';

export interface IViewDefineOptions extends ModelOptions {
    viewDefinition: string;
}

// noinspection JSUnusedGlobalSymbols
/**
 * Decorator factory: @View
 *
 * Adding view support for sequelize models, making sure views
 * could be defined in a safe way without a problems with sync/drop ops,
 * etc.
 * This decorator simply annotate a model entity the same way @Table does,
 * adding extra option "treatAsView" which is utilized by a BaseModel
 * class to override native behavior of sequelize models.
 *
 * @param {IViewDefineOptions | string} options - view definition options
 * @return {(...args: any[] => any)} - view annotation decorator
 */
export function View(options: IViewDefineOptions | string) {
    if (typeof options === 'string') {
        options = { viewDefinition: options };
    } else if (!options || !options.viewDefinition.trim()) {
        throw new TypeError('View definition is missing!');
    }

    return (target: any) => annotate(target, options as IViewDefineOptions);
}

/**
 * Does the job to define the view table
 *
 * @param {any} target - model class
 * @param {IViewDefineOptions} options - view definition options
 */
function annotate(target: any, options: IViewDefineOptions): void {
    Object.assign(options, { treatAsView: true });

    setModelName(target.prototype, options.modelName || target.name);
    addOptions(target.prototype, options);
}
