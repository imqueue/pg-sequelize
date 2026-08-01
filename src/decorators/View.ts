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
import 'reflect-metadata';
import { type ModelOptions } from 'sequelize';
import { addOptions, setModelName } from 'sequelize-typescript';

/**
 * Sequelize's model options, plus the SQL that defines the view.
 */
export interface IViewDefineOptions extends ModelOptions {
    /**
     * The complete create statement for the view.
     *
     * @remarks
     * Executed exactly as written, so it carries its own keywords — and writing it as
     * `CREATE OR REPLACE VIEW` is what makes `sync({ withoutDrop: true })` an option
     * later, which views that depend on each other need. The name it declares has to
     * match the model's table name; that is checked before anything runs.
     */
    viewDefinition: string;
}

/**
 * Declares a model to be a database view rather than a table.
 *
 * @remarks
 * Does for a view what `Table` does for a table, and sets the flag the rest of the
 * package keys off: the model is skipped by the table sync, created and dropped with
 * view statements, and has its numeric columns re-cast after every finder, since a
 * view returns them as strings.
 *
 * Two ordinary model options matter more here than they look. `freezeTableName` stops
 * sequelize pluralising the model name, which has to match the name inside the
 * definition. And `timestamps: false` stops it selecting `createdAt` and `updatedAt`,
 * which a view has no reason to have. A view model may also extend another model
 * instead of `BaseModel`, which is the shortest way to reuse a table's column
 * declarations for a view over the same columns.
 *
 * Declared columns are a subset of what the view selects: anything the view returns
 * and the model does not declare is simply not mapped.
 *
 * @param options - The definition SQL alone, or model options carrying it.
 * @returns A class decorator.
 * @throws TypeError when there is no definition, or it is blank. The string form used
 *   to skip that check, and an options object without the property threw an unhelpful
 *   error from reading it.
 * @example
 * ```typescript
 * @View({
 *     viewDefinition: `
 *         CREATE OR REPLACE VIEW "ProductRevenue" AS
 *         SELECT "productId" AS "id", SUM("payment") AS "revenue"
 *           FROM "Order"
 *          GROUP BY "productId"
 *     `,
 *     freezeTableName: true,
 *     timestamps: false,
 * })
 * export class ProductRevenue extends BaseModel<ProductRevenue> {
 *     @PrimaryKey
 *     @Column(DataType.BIGINT)
 *     declare public id: number;
 *
 *     @Column(DataType.DECIMAL(12, 2))
 *     declare public revenue: number;
 * }
 * ```
 */
export function View(options: IViewDefineOptions | string) {
    if (typeof options === 'string') {
        options = { viewDefinition: options };
    }

    if (!options || !options.viewDefinition || !options.viewDefinition.trim()) {
        throw new TypeError('View definition is missing!');
    }

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
