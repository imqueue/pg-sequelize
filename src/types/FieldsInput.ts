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
 * Which fields to return, nested to match the shape of the relations.
 *
 * @remarks
 * Selection is by KEY PRESENCE, not by value — the single most important thing to
 * know about this type, and the opposite of what `false` suggests. A key names a
 * field to return; `false` means return that column and nothing further; a nested
 * `FieldsInput` on a relation includes the relation and selects within it. So
 * `{ id: false }` DOES return `id`. Omit a field entirely to leave it out, and pass
 * no map at all to get everything the model declares.
 *
 * A value other than `false` is also read as a filter for that column by
 * `query.autoQuery`, which is why the declared value type is `false | FieldsInput`:
 * the two roles are told apart by that `false`.
 *
 * The recursion is what makes it worth a type of its own — one map describes a whole
 * object graph, so a caller asking for a reservation with only its car's id does not
 * need one argument per level. `query.createEntity` threads the nested map down to
 * each related model as it goes, and `autoQuery` turns each nested level into a
 * Sequelize `include`.
 *
 * Note that `autoQuery` MUTATES the map it is given: a column named in the `order`
 * that the map does not mention is added to it as `false`, so ordering cannot break
 * the selection. Do not share one map across calls and expect it to stay as written.
 *
 * It is a class rather than an interface because `@indexed` describes it to
 * `@imqueue/rpc`, which needs a runtime value to attach the description to.
 *
 * @example
 * ```typescript
 * // the reservation with its type and id, and its car's id and model
 * const fields: FieldsInput = {
 *     id: false,
 *     type: false,
 *     car: { id: false, model: false },
 * };
 * ```
 */
@indexed(() => `[fieldName: string]: false | ${FieldsInput.name}`)
export class FieldsInput {
    [fieldName: string]: false | FieldsInput;
}
