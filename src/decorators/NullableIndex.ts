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
import {
    type ColumnIndexOptions,
    type FunctionType,
    ColumnIndex,
} from './ColumnIndex.js';

/**
 * What {@link (NullableIndex:1) | NullableIndex} accepts: every {@link ColumnIndexOptions} field except
 * `expression`, which it sets itself.
 */
export type NullableColumnIndexOptions = Omit<ColumnIndexOptions, 'expression'>;

/**
 * Declares a pair of partial indices on a nullable column, one for the rows where it
 * is null and one for the rows where it is not.
 *
 * @remarks
 * Two narrow indices instead of one wide one. Each covers only its half of the table,
 * so `WHERE "col" IS NULL` and `WHERE "col" IS NOT NULL` each get an index sized to
 * the rows they actually match — which is the point on a column where one of the two
 * halves is much smaller than the other.
 *
 * Usable bare or as a factory, exactly like {@link (ColumnIndex:1) | ColumnIndex}. The factory form used
 * to build both halves from one options object that it mutated in place, and
 * {@link (ColumnIndex:1) | ColumnIndex} stores that object by reference — so both declarations ended up
 * pointing at the same object, both saying `IS NOT NULL`, and neither carrying a
 * predicate at all. What you got was two identical non-partial indices. It now builds
 * a fresh options object per half, keeps a predicate of your own by combining it with
 * the null test, and suffixes a name of your own so the two halves cannot collide.
 *
 * @param args - Nothing, when used bare. The options, when used as a factory.
 * @returns A property decorator, when used as a factory.
 * @example
 * ```typescript
 * @Table
 * export class Lead extends BaseModel<Lead> {
 *     @NullableIndex
 *     @Column(DataType.DATE)
 *     public closedAt: Date;
 *
 *     @NullableIndex({ name: 'lead_assignee', concurrently: true })
 *     @Column(DataType.BIGINT)
 *     public assigneeId: number;
 * }
 * ```
 */
export function NullableIndex(
    options: Partial<NullableColumnIndexOptions>,
): FunctionType;
/**
 * Declares the pair of partial indices with no options of their own.
 *
 * @remarks
 * The bare form. Each half is a partial index keyed on the null test itself, so it
 * serves `IS NULL` and `IS NOT NULL` lookups; use the factory form to add a method,
 * a name, or a predicate of your own.
 *
 * @param target - Model prototype the property belongs to.
 * @param propertyName - Nullable column to split.
 * @param propertyDescriptor - Unused; present because a decorator receives it.
 */
export function NullableIndex(
    target: any,
    propertyName: string,
    propertyDescriptor?: PropertyDescriptor,
): void;
export function NullableIndex(...args: any[]): FunctionType | void {
    if (args.length >= 2) {
        const [target, propertyName, propertyDescriptor] = args;

        annotate(target, propertyName, propertyDescriptor);

        return;
    }

    return (
        target: any,
        propertyName: string,
        propertyDescriptor?: PropertyDescriptor,
    ) => {
        annotate(target, propertyName, propertyDescriptor, args[0]);
    };
}

/**
 * Declares the two halves of the pair.
 *
 * @param target - Model prototype the property belongs to.
 * @param propertyName - Column the pair is declared on.
 * @param propertyDescriptor - Passed through to {@link (ColumnIndex:1) | ColumnIndex}.
 * @param options - Options to apply to both halves.
 */
function annotate(
    target: any,
    propertyName: string,
    propertyDescriptor?: PropertyDescriptor,
    options: Partial<NullableColumnIndexOptions> = {},
): void {
    for (const isNull of [true, false]) {
        const test = `"${propertyName}" IS ${isNull ? '' : 'NOT '}NULL`;
        // A fresh object per half: ColumnIndex keeps what it is given by
        // reference, so two halves sharing one object are two halves with
        // whatever the second one wrote.
        const half: Partial<ColumnIndexOptions> = {
            ...options,
            expression: test,
            // A predicate of the caller's own is kept rather than replaced —
            // splitting the rows is what this adds, not what it overrides.
            predicate: options.predicate
                ? `(${options.predicate}) AND ${test}`
                : test,
        };

        if (options.name) {
            half.name = `${options.name}${isNull ? '' : '_not'}_null`;
        }

        ColumnIndex(half)(target, propertyName, propertyDescriptor);
    }
}
