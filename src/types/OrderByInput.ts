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
import { indexed } from '@imqueue/rpc';

/**
 * The two directions a column can be ordered in.
 *
 * @remarks
 * The values are the SQL keywords, so they can be handed to Sequelize as they are.
 */
export enum OrderDirection {
    /** Ascending — also what any unrecognised direction becomes. */
    asc = 'ASC',
    /** Descending. */
    desc = 'DESC',
}

/**
 * The `OrderDirection` values as an `@imqueue/rpc` type description.
 *
 * @remarks
 * `'ASC' | 'DESC'`, built from the enum so the description cannot drift from it.
 * Used in the `@indexed` description of {@link OrderByInput}, and available for your
 * own `@property` declarations that accept a direction.
 */
export const ENUM_ORDER_DIRECTION = `'${OrderDirection.asc}' | '${
    OrderDirection.desc
}'`;

/**
 * Which columns to order by, and in which direction.
 *
 * @remarks
 * Keyed by column name; `query.toOrderOptions` turns it into Sequelize's `order`
 * array, preserving the key order of the object, so the first key is the primary
 * sort.
 *
 * Direction values are coerced rather than validated: anything that does not read
 * as `desc`, case-insensitively, becomes ascending. That is deliberate — the value
 * arrives from a remote caller and ends up in SQL, so an unrecognised direction has
 * to become a safe default rather than being passed through. It does mean a typo
 * silently sorts the other way.
 *
 * Column names are NOT coerced, and they reach the query as given.
 *
 * @example
 * ```typescript
 * const orderBy: OrderByInput = { type: OrderDirection.asc, createdAt: OrderDirection.desc };
 * ```
 */
@indexed(() => `[fieldName: string]: ${ENUM_ORDER_DIRECTION}`)
export class OrderByInput {
    [fieldName: string]: OrderDirection;
}
