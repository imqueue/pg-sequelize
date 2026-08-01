/*!
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
import 'reflect-metadata';
import { addOptions, setModelName } from 'sequelize-typescript';
import { type IViewDefineOptions } from './View.js';

/**
 * Values for a dynamic view's placeholders, keyed by placeholder name.
 *
 * @remarks
 * Values are typed as strings and rendered as quoted SQL constants, so a numeric
 * placeholder arrives as a quoted number and relies on Postgres casting it. They are
 * escaped on the way in, which is what makes it safe for one to carry a caller's
 * input.
 */
export interface ViewParams {
    [name: string]: string;
}

/**
 * Options for a view whose definition is parameterised.
 */
export interface IDynamicViewDefineOptions extends IViewDefineOptions {
    /**
     * A value for every placeholder the definition names.
     *
     * @remarks
     * These are the defaults. A query may override any of them through
     * `FindOptions.viewParams`, and what it does not override falls back to here.
     * Every placeholder must appear in this map, which is checked when the class is
     * defined.
     */
    viewParams: ViewParams;
    /**
     * The create statement, with placeholders in it.
     *
     * @remarks
     * Same as the static case except that `@{name}` placeholders are substituted
     * before the statement is used.
     */
    viewDefinition: string;
    /**
     * Marks the model as a dynamic view. Set by the decorator, not by you.
     */
    isDynamicView?: boolean;
}

/**
 * The placeholder pattern as a source string: `@{name}`, where the name is letters,
 * digits and underscores.
 *
 * @remarks
 * Exported so a service can compile its own matcher — to validate a definition of its
 * own, say — rather than hard-coding the syntax a second time.
 */
export const MATCHER = '@\\{([a-z0-9_]+?)\\}';

/** {@link MATCHER} compiled to find every placeholder in a definition. */
export const RX_MATCHER = new RegExp(MATCHER, 'gi');

/** {@link MATCHER} compiled to pull the name out of a single placeholder. */
export const RX_NAME_MATCHER = new RegExp(MATCHER, 'i');

/**
 * Declares a model to be a view whose definition is parameterised per query.
 *
 * @remarks
 * Everything `View` does, plus placeholders. The definition may carry `@{name}`
 * markers, every finder accepts `viewParams` to fill them, and the select-query
 * generator substitutes them and splices the resulting statement into the query — as
 * the `FROM` target, or as a joined subquery when the view is reached through an
 * `include`. One model then serves a family of views that differ only by a constant,
 * which is the alternative to defining one view per variant in a migration.
 *
 * Every placeholder must have a default in `viewParams`. That is checked while the
 * class is being defined, so a missing one is an error at import rather than a
 * malformed statement at query time.
 *
 * Values are escaped, so a parameter can carry a caller's input. Anything that is not
 * a number or a string becomes `NULL`.
 *
 * @param options - Model options carrying the definition and the parameter defaults.
 * @returns A class decorator.
 * @throws TypeError when the definition is missing or blank, or when it names a
 *   placeholder that `viewParams` does not.
 * @example
 * ```typescript
 * @DynamicView({
 *     viewDefinition: `
 *         CREATE OR REPLACE VIEW "ProductRevenue" AS
 *         SELECT "productId" AS "id", SUM("payment") AS "revenue"
 *           FROM "Order"
 *          WHERE "currency" = @{currency}
 *          GROUP BY "productId"
 *     `,
 *     viewParams: { currency: 'USD' },
 *     freezeTableName: true,
 *     timestamps: false,
 * })
 * export class ProductRevenue extends BaseModel<ProductRevenue> {
 *     @PrimaryKey
 *     @Column(DataType.BIGINT)
 *     declare public id: number;
 * }
 *
 * // the same model, read in another currency
 * const rows = await ProductRevenue.findAll({
 *     viewParams: { currency: 'EUR' },
 * });
 * ```
 */
export function DynamicView(options: IDynamicViewDefineOptions) {
    if (!options || !options.viewDefinition || !options.viewDefinition.trim()) {
        throw new TypeError('View definition is missing!');
    }

    // we are dynamic, no choice here!
    options.isDynamicView = true;

    const viewDef = options.viewDefinition || '';
    const viewParams = options.viewParams || {};

    (viewDef.match(RX_MATCHER) || []).forEach(param => {
        const [, name] = param.match(RX_NAME_MATCHER) || ['', ''];

        if (typeof viewParams[name] !== 'string') {
            throw new TypeError(
                `View definition contains param '${
                    name
                }', but it was not provided`,
            );
        }
    });

    return (target: any) => annotate(target, options as IViewDefineOptions);
}

/**
 * Registers the model under its own name and records the view options on it.
 *
 * @param target - Model class being decorated.
 * @param options - View definition options, marked as a view in place.
 */
function annotate(target: any, options: IViewDefineOptions): void {
    Object.assign(options, { treatAsView: true });

    setModelName(target.prototype, options.modelName || target.name);
    addOptions(target.prototype, options);
}
