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
import { property } from '@imqueue/rpc';
import { type IRange } from './IRange.js';

/**
 * A range between two numbers, as an `@imqueue/rpc` type.
 *
 * @remarks
 * The numeric counterpart of {@link DateRange}, and used the same way: filter
 * `<column>Range` and `query.withRangeFilters` rewrites it onto `<column>`.
 *
 * @example
 * ```typescript
 * const filter = { priceRange: { start: 10, end: 100 } } as FilterInput;
 * ```
 */
export class NumericRange implements IRange {
    /** Lower bound of the range. */
    @property('number')
    public start: number;

    /** Upper bound of the range. */
    @property('number')
    public end: number;
}
