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
import { addOptions, getOptions } from 'sequelize-typescript';
export type FunctionType = (...args: any[]) => any;

export enum IndexMethod {
    // noinspection JSUnusedGlobalSymbols
    BTREE = 'BTREE',
    HASH = 'HASH',
    GIST = 'GIST',
    SPGIST = 'SPGIST',
    GIN = 'GIN',
    BRIN = 'BRIN',
}

export enum SortOrder {
    // noinspection JSUnusedGlobalSymbols
    ASC = 'ASC',
    DESC = 'DESC',
}

export interface ColumnIndexOptions {
    name: string;
    method: IndexMethod;
    concurrently: boolean;
    nullsFirst: boolean;
    order: SortOrder;
    predicate: string;
    expression: string;
    include: string[];
    collation: string;
    opClass: string;
    tablespace: string;
    safe: boolean;
    unique: boolean;
}

export function ColumnIndex(options: Partial<ColumnIndexOptions>): FunctionType;
export function ColumnIndex(
    target: any,
    propertyName: string,
    propertyDescriptor?: PropertyDescriptor,
): void;
export function ColumnIndex(...args: any[]): FunctionType | void {
    if (args.length >= 2) {
        const [target, propertyName, propertyDescriptor] = args;

        return annotate(target, propertyName, propertyDescriptor);
    }

    return (
        target: any,
        propertyName: string,
        propertyDescriptor?: PropertyDescriptor,
    ) => {
        annotate(target, propertyName, propertyDescriptor, args[0]);
    };
}

function annotate(
    target: any,
    propertyName: string,
    propertyDescriptor?: PropertyDescriptor,
    options: Partial<ColumnIndexOptions> = {},
): void {
    const indices = (getOptions(target) as any).indices || [];
    addOptions(target, {
        indices: [...indices, {
            column: propertyName,
            options,
        }],
    } as any);
}


