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
import { ColumnIndexOptions, FunctionType, ColumnIndex } from './ColumnIndex';

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

export type NullableColumnIndexOptions = Omit<ColumnIndexOptions, 'expression'>;

// noinspection JSUnusedGlobalSymbols
export function NullableIndex(
    options: Partial<NullableColumnIndexOptions>,
): FunctionType;
// noinspection JSUnusedGlobalSymbols
export function NullableIndex(
    target: any,
    propertyName: string,
    propertyDescriptor?: PropertyDescriptor,
): void;
// noinspection JSUnusedGlobalSymbols
export function NullableIndex(...args: any[]): FunctionType | void {
    if (args.length >= 2) {
        const [target, propertyName, propertyDescriptor] = args;
        const nullPredicate = `"${propertyName}" IS NULL`;
        const notNullPredicate = `"${propertyName}" IS NOT NULL`;

        ColumnIndex({
            expression: nullPredicate,
            predicate: nullPredicate,
        })(target, propertyName, propertyDescriptor);
        ColumnIndex({
            expression: notNullPredicate,
            predicate: notNullPredicate,
        })(target, propertyName, propertyDescriptor);

        return;
    }

    return (
        target: any,
        propertyName: string,
        propertyDescriptor?: PropertyDescriptor,
    ) => {
        ColumnIndex(Object.assign(args[0], {
            expression: `"${propertyName}" IS NULL`
        }))(target, propertyName, propertyDescriptor);
        ColumnIndex(Object.assign(args[0], {
            expression: `"${propertyName}" IS NOT NULL`
        }))(target, propertyName, propertyDescriptor);
    };
}
