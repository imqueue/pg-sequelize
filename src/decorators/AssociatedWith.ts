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
 * Describes the association a filter field stands for.
 */
export interface IAssociated {
    /** The model on the other side of the association. */
    model: any;
    /**
     * The input class describing that model's own filter fields.
     *
     * @remarks
     * Read recursively, so a filter can nest as deep as the input classes do.
     */
    input: any;
    /**
     * Association name on the model, when it differs from the field name.
     *
     * @remarks
     * Recorded and then never read: nothing in this package consumes it today, so
     * the field name and the association name have to match. Left in place because
     * removing it from the public type would break callers that set it.
     */
    modelFieldName?: string;
}

/**
 * Marks a field of a filter input as standing for an association rather than for a
 * column.
 *
 * @remarks
 * This is what lets a caller's filter reach through a relation. `query.toWhereOptions`
 * instantiates the input class, and any property it finds carrying one of these
 * descriptors becomes a required `include` on the associated model, with the nested
 * filter resolved against that model's own input class — recursively, so the nesting
 * can go as deep as the input classes do. Without it the nested object would be
 * treated as a column filter and produce a where clause on a column that does not
 * exist.
 *
 * Declare the field with `declare`, and do not instantiate the input class yourself.
 * The descriptor lives on the prototype as a read-only, non-enumerable property, so a
 * real field declaration would shadow it with `undefined` under
 * `useDefineForClassFields` and the association would be silently ignored — and an
 * assignment to it throws in strict mode. These classes are descriptions of a wire
 * shape, not containers for one.
 *
 * The thunk is resolved on first read rather than at decoration time, which is what
 * makes it worth being a thunk: input classes and models routinely import each other,
 * and a decorator body runs while those modules are still initialising, so resolving
 * eagerly could capture `undefined` as the model. First read happens on the first
 * query, by which point every module is loaded.
 *
 * @param cb - Returns the association descriptor.
 * @returns A property decorator.
 * @example
 * ```typescript
 * export class PaymentListInput {
 *     @property(() => `number[] | ${FilterInput.name}`, true)
 *     declare public amount?: number[] | FilterInput;
 *
 *     @property('PaymentTypeListInput', true)
 *     @AssociatedWith(() => ({
 *         model: PaymentType,
 *         input: PaymentTypeListInput,
 *     }))
 *     declare public paymentType?: PaymentTypeListInput;
 * }
 *
 * // A filter of { paymentType: { name: 'card' } } now becomes a required join on
 * // PaymentType with the name filter applied there.
 * const options = query.toWhereOptions(filter, PaymentListInput);
 * ```
 */
export function AssociatedWith(cb: () => IAssociated) {
    return (target: any, key: string) => {
        let resolved: { model: any; input: any; key: string } | undefined;
        let done = false;

        Object.defineProperty(target, key, {
            get() {
                if (!done) {
                    done = true;

                    const association = cb();

                    if (association) {
                        resolved = {
                            model: association.model,
                            input: association.input,
                            key: association.modelFieldName || key,
                        };
                    }
                }

                return resolved;
            },
        });

        return target;
    };
}
