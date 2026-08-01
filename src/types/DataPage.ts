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
 * One page of results together with the size of the whole set.
 *
 * @remarks
 * The envelope a paginated service method returns, so a caller that asked for 20
 * rows can still render "20 of 1,340" without a second round trip. Nothing in this
 * package produces one — it is a shape for your own service methods to declare and
 * fill, which is why `data` is whatever you put in it rather than an array.
 *
 * @example
 * ```typescript
 * @expose()
 * public async listReservations(
 *     page?: PaginationInput,
 * ): Promise<DataPage<Reservation[]>> {
 *     const { rows, count } = await Reservation.findAndCountAll(
 *         query.toLimitOptions(page),
 *     );
 *
 *     return { total: count, data: rows };
 * }
 * ```
 */
export interface DataPage<T> {
    /** Rows matching the query in total, ignoring the page window. */
    total: number;
    /** The page itself. */
    data: T;
}
