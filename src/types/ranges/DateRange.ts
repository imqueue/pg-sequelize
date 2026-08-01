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
 * A range between two dates, as an `@imqueue/rpc` type.
 *
 * @remarks
 * Accepts a `Date` or an ISO-8601 string on either bound, because a remote caller
 * has only the string — a `Date` does not survive JSON.
 *
 * Used through the `Range`-suffix convention rather than by naming the column
 * directly: filter `<column>Range` and `query.withRangeFilters` moves it onto
 * `<column>`. Passing both forms for one column throws a `TypeError` rather than
 * silently preferring one.
 *
 * @example
 * ```typescript
 * // reservations whose `duration` column falls inside the window
 * const filter = {
 *     durationRange: { start: '2026-08-01', end: '2026-08-31' },
 * } as FilterInput;
 * ```
 */
export class DateRange implements IRange {
    /** Start of the range — a `Date`, or an ISO-8601 string from a remote caller. */
    @property('string | Date')
    public start: string | Date;

    /** End of the range — a `Date`, or an ISO-8601 string from a remote caller. */
    @property('string | Date')
    public end: string | Date;
}
