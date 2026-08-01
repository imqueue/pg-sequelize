/*!
 * @imqueue/pg-sequelize - Sequelize ORM refines for @imqueue
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
/**
 * The shape every range filter shares: a start and an end.
 *
 * @remarks
 * `query.withRangeFilters` recognises a range by exactly these two keys, in either
 * order, on a filter property whose name ends in `Range`. So the property NAMES are
 * the contract — an object with any other key set is left alone and filtered as an
 * ordinary value.
 *
 * The convention it implements: a caller filters `durationRange` and the helper
 * rewrites it onto the real `duration` column. Sending both `duration` and
 * `durationRange` is an error rather than a merge — see
 * {@link DateRange} for the worked example.
 *
 * Deliberately untyped at `any`, so a range of anything Postgres supports can
 * implement it; {@link DateRange} and {@link NumericRange} are the two the package
 * ships.
 */
export interface IRange {
    /** Lower bound of the range. */
    start: any;
    /** Upper bound of the range. */
    end: any;
}
