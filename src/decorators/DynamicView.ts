/*!
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
import { addOptions, setModelName } from 'sequelize-typescript';
import { IViewDefineOptions } from './View';

/**
 * Key/Value parameter store
 */
export interface ViewParams {
    [name: string]: string;
}
export interface IDynamicViewDefineOptions extends IViewDefineOptions {
    viewParams: ViewParams;
    viewDefinition: string;
    isDynamicView?: boolean;
}

export const MATCHER = '@\\{([a-z0-9_]+?)\\}';
export const RX_MATCHER = new RegExp(MATCHER, 'gi');
export const RX_NAME_MATCHER = new RegExp(MATCHER, 'i');

// noinspection JSUnusedGlobalSymbols
/**
 * Decorator factory: @View
 *
 * Adding view support for sequelize models, making sure views
 * could be defined in a safe way without a problems with sync/drop ops, etc.
 * This decorator simply annotate a model entity the same way @Table does,
 * adding extra option "treatAsView" which is utilized by a BaseModel
 * class to override native behavior of sequelize models.
 *
 * @param {IViewDefineOptions | string} options - view definition options
 * @return {() => any} - view annotation decorator
 */
export function DynamicView(
    options: IDynamicViewDefineOptions,
) {
    if (!options || !options.viewDefinition.trim()) {
        throw new TypeError('View definition is missing!');
    }

    // we are dynamic, no choice here!
    options.isDynamicView = true;

    const viewDef = options.viewDefinition || '';
    const viewParams = options.viewParams || {};

    (viewDef.match(RX_MATCHER) || []).forEach(param => {
        const [, name] = (param.match(RX_NAME_MATCHER) || ['', '']);

        if (typeof viewParams[name] !== 'string') {
            throw new TypeError(
                `View definition contains param '${
                    name}', but it was not provided`,
            );
        }
    });

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
