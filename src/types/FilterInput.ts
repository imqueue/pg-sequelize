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
import { Op } from 'sequelize';

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

export class FilterInput {
    @property(
        'FilterInput | Array<FilterInput|number|string|boolean|null>',
        true)
    public $and?:
        FilterInput | Array<FilterInput|number|string|boolean|null>;

    @property(
        'FilterInput | Array<FilterInput|number|string|boolean|null>',
        true)
    public $or?:
        FilterInput | Array<FilterInput|number|string|boolean|null>;

    @property('number', true)
    public $gt?: number;

    @property('number', true)
    public $gte?: number;

    @property('number', true)
    public $lt?: number;

    @property('number', true)
    public $lte?: number;

    @property('number | string', true)
    public $ne?: number | string;

    @property('number | string | boolean | null', true)
    public $eq?: number | string | boolean | null;

    @property('boolean', true)
    public $not?: boolean;

    @property('Array<number | string>', true)
    public $between?: Array<number | string>;

    @property('Array<number | string>', true)
    public $notBetween?: Array<number | string>;

    @property('Array<number | string | boolean | null>', true)
    public $in?: Array<number | string | boolean | null>;

    @property('Array<number | string | boolean | null>', true)
    public $notIn?: Array<number | string | boolean | null>;

    @property('string', true)
    public $like?: string;

    @property('string', true)
    public $notLike?: string;

    @property('string', true)
    public $iLike?: string;

    @property('string', true)
    public $notILike?: string;

    @property('string', true)
    public $regexp?: string;

    @property('string', true)
    public $notRegexp?: string;

    @property('string', true)
    public $iRegexp?: string;

    @property('string', true)
    public $notIRegexp?: string;

    @property('[number, number]', true)
    public $overlap?: [number, number];

    @property('number | [number, number]', true)
    public $contains?: number | [number, number];

    @property('[number, number]', true)
    public $contained?: [number, number];

    @property('number[] | string[]', true)
    public $any?: number[] | string[];

    @property('[number, number]', true)
    public $adjacent?: [number, number];

    @property('[number, number]', true)
    public $strictLeft?: [number, number];

    @property('[number, number]', true)
    public $strictRight?: [number, number];

    @property('[number, number]', true)
    public $noExtendRight?: [number, number];

    @property('[number, number]', true)
    public $noExtendLeft?: [number, number];
}
