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
import { property } from '@imqueue/rpc';
import { Op } from 'sequelize';

/**
 * Maps each `$`-prefixed filter operator to the Sequelize `Op` symbol it means.
 *
 * @remarks
 * This mapping is the reason {@link FilterInput} exists at all. Sequelize's
 * operators are ES symbols, and a symbol cannot be serialized — so a filter built
 * with `Op.gt` on a client would arrive at the service as an empty object. The
 * remote caller sends the string `$gt` instead, and `query.toWhereOptions` swaps in
 * the symbol on this side.
 *
 * Only the operators listed here are translated. Any other key is passed through as
 * written, on the assumption that it is a column name — so a mistyped `$gtt` becomes
 * a filter on a column called `$gtt` rather than an error.
 */
export const FILTER_OPS = {
    $and: Op.and,
    $or: Op.or,
    $gt: Op.gt,
    $gte: Op.gte,
    $lt: Op.lt,
    $lte: Op.lte,
    $ne: Op.ne,
    $eq: Op.eq,
    $not: Op.not,
    $between: Op.between,
    $notBetween: Op.notBetween,
    $in: Op.in,
    $notIn: Op.notIn,
    $like: Op.like,
    $notLike: Op.notLike,
    $iLike: Op.iLike,
    $notILike: Op.notILike,
    $regexp: Op.regexp,
    $notRegexp: Op.notRegexp,
    $iRegexp: Op.iRegexp,
    $notIRegexp: Op.notIRegexp,
    $overlap: Op.overlap,
    $contains: Op.contains,
    $contained: Op.contained,
    $any: Op.any,
    $adjacent: Op.adjacent,
    $strictLeft: Op.strictLeft,
    $strictRight: Op.strictRight,
    $noExtendRight: Op.noExtendRight,
    $noExtendLeft: Op.noExtendLeft,
};

/**
 * A where clause as plain, serializable JSON.
 *
 * @remarks
 * Gives a remote caller the same expressive power Sequelize offers locally —
 * comparison, set membership, pattern matching, regular expressions and range
 * operators, nested arbitrarily through `$and` and `$or`. Every operator is a
 * `$`-prefixed string rather than a symbol, because symbols do not survive the wire;
 * {@link FILTER_OPS} does the translation on arrival.
 *
 * Two things follow from how `query.toWhereOptions` walks it. Keys are read
 * recursively, so a value that is itself an object is treated as a nested filter and
 * only a non-object value ends the walk. And any key that is NOT a known operator is
 * kept verbatim as a column name — which is what lets you mix columns and operators
 * in one object, and also means a typo becomes a column rather than a complaint.
 *
 * The declared property types are the common cases rather than hard limits; the
 * runtime walk does not enforce them.
 *
 * @example
 * ```typescript
 * // type is 'fast' or 'std', and the reservation was created this year
 * const filter = {
 *     $or: [{ type: 'fast' }, { type: 'std' }],
 *     createdAt: { $gte: '2026-01-01' },
 * } as FilterInput;
 * ```
 */
export class FilterInput {
    /** Every nested condition must hold (SQL `AND`). */
    @property(
        'FilterInput | Array<FilterInput|number|string|boolean|null>',
        true,
    )
    public $and?:
        | FilterInput
        | Array<FilterInput | number | string | boolean | null>;

    /** At least one nested condition must hold (SQL `OR`). */
    @property(
        'FilterInput | Array<FilterInput|number|string|boolean|null>',
        true,
    )
    public $or?:
        | FilterInput
        | Array<FilterInput | number | string | boolean | null>;

    /** Greater than. */
    @property('number', true)
    public $gt?: number;

    /** Greater than or equal to. */
    @property('number', true)
    public $gte?: number;

    /** Less than. */
    @property('number', true)
    public $lt?: number;

    /** Less than or equal to. */
    @property('number', true)
    public $lte?: number;

    /** Not equal to. */
    @property('number | string', true)
    public $ne?: number | string;

    /** Equal to. With `null`, becomes `IS NULL`. */
    @property('number | string | boolean | null', true)
    public $eq?: number | string | boolean | null;

    /** Negates the nested condition (SQL `NOT`). */
    @property('boolean', true)
    public $not?: boolean;

    /** Within the inclusive `[low, high]` pair (SQL `BETWEEN`). */
    @property('Array<number | string>', true)
    public $between?: Array<number | string>;

    /** Outside the inclusive `[low, high]` pair. */
    @property('Array<number | string>', true)
    public $notBetween?: Array<number | string>;

    /** One of the listed values (SQL `IN`). An empty list matches nothing. */
    @property('Array<number | string | boolean | null>', true)
    public $in?: Array<number | string | boolean | null>;

    /** None of the listed values (SQL `NOT IN`). */
    @property('Array<number | string | boolean | null>', true)
    public $notIn?: Array<number | string | boolean | null>;

    /** Case-sensitive pattern match, `%` and `_` as wildcards (SQL `LIKE`). */
    @property('string', true)
    public $like?: string;

    /** Fails a case-sensitive pattern match. */
    @property('string', true)
    public $notLike?: string;

    /** Case-insensitive pattern match (Postgres `ILIKE`). */
    @property('string', true)
    public $iLike?: string;

    /** Fails a case-insensitive pattern match. */
    @property('string', true)
    public $notILike?: string;

    /** Matches a POSIX regular expression (Postgres `~`). */
    @property('string', true)
    public $regexp?: string;

    /** Fails a POSIX regular expression (Postgres `!~`). */
    @property('string', true)
    public $notRegexp?: string;

    /** Matches a regular expression, case-insensitively (Postgres `~*`). */
    @property('string', true)
    public $iRegexp?: string;

    /** Fails a case-insensitive regular expression (Postgres `!~*`). */
    @property('string', true)
    public $notIRegexp?: string;

    /** Ranges share at least one value (Postgres `&&`). */
    @property('[number, number]', true)
    public $overlap?: [number, number];

    /** The column's range contains this value or range (Postgres `@>`). */
    @property('number | [number, number]', true)
    public $contains?: number | [number, number];

    /** The column's range is contained by this one (Postgres `<@`). */
    @property('[number, number]', true)
    public $contained?: [number, number];

    /** Equals any element of the array (Postgres `= ANY`). */
    @property('number[] | string[]', true)
    public $any?: number[] | string[];

    /** Ranges touch without overlapping (Postgres `-|-`). */
    @property('[number, number]', true)
    public $adjacent?: [number, number];

    /** Range lies entirely to the left of this one (Postgres `<<`). */
    @property('[number, number]', true)
    public $strictLeft?: [number, number];

    /** Range lies entirely to the right of this one (Postgres `>>`). */
    @property('[number, number]', true)
    public $strictRight?: [number, number];

    /** Range does not extend past this one's right bound (Postgres `&<`). */
    @property('[number, number]', true)
    public $noExtendRight?: [number, number];

    /** Range does not extend past this one's left bound (Postgres `&>`). */
    @property('[number, number]', true)
    public $noExtendLeft?: [number, number];
}
