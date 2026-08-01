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

/**
 * Where a page starts and how big it is.
 *
 * @remarks
 * Turned into Sequelize's `offset`/`limit` by `query.toLimitOptions`, which treats
 * this input as advisory rather than authoritative — see the notes on each property.
 * A negative `limit` is the interesting case: it means "the last N rows", and it is
 * the only reason `count` exists.
 */
export class PaginationInput {
    /**
     * Rows to skip before the page starts.
     *
     * @remarks
     * Ignored when `limit` is absent or zero, since there is then no page to
     * position. With a negative `limit` and an `offset` of zero it is computed
     * instead — see `limit`.
     */
    @property('number')
    public offset: number;

    /**
     * Rows in the page. Negative counts back from the end of the set.
     *
     * @remarks
     * Zero, absent or non-numeric means no pagination at all: `toLimitOptions`
     * returns an empty options object and the query is left unbounded. That is a
     * quiet default worth knowing about — a caller who sends `limit: 0` expecting
     * "no rows" gets every row.
     *
     * A negative value takes the absolute value as the page size and, when `offset`
     * is zero, positions the window at the end of the set: `count - limit`, clamped
     * at zero. So `{ limit: -10, count: 1340 }` is the last ten rows. Without a
     * `count` the offset computes to a negative number and clamps to zero, giving
     * the FIRST ten rows rather than the last — the two properties go together.
     */
    @property('number')
    public limit: number;

    /**
     * Total rows in the set, used only to place a negative `limit`.
     *
     * @remarks
     * Nothing validates it against the real total, and it is ignored entirely for a
     * positive `limit`.
     */
    @property('number', true)
    public count?: number;
}
