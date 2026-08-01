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
import { addOptions, getOptions } from 'sequelize-typescript';
/**
 * The property decorator a decorator factory hands back.
 *
 * @remarks
 * Loose on purpose: it stands for the decorator returned by {@link (ColumnIndex:1) | ColumnIndex} and
 * {@link (NullableIndex:1) | NullableIndex} when either is called with options, whose exact parameter list
 * differs between TypeScript's legacy and current decorator emit.
 */
export type FunctionType = (...args: any[]) => any;

/**
 * The index methods Postgres offers, for {@link ColumnIndexOptions.method}.
 *
 * @remarks
 * Postgres uses `BTREE` when nothing is given, and it is the only method with an
 * ordered key — so it is the one to want unless the data has a shape another method
 * is built for.
 */
export enum IndexMethod {
    /** Balanced tree: equality, ranges and ordering. Postgres's default. */
    BTREE = 'BTREE',
    /** Hash: equality only, and smaller than a btree for that alone. */
    HASH = 'HASH',
    /** Generalised search tree: geometric types, ranges, full-text. */
    GIST = 'GIST',
    /** Space-partitioned GiST: quadtrees, tries and other unbalanced trees. */
    SPGIST = 'SPGIST',
    /** Inverted index: containment in arrays, `jsonb` and full-text. */
    GIN = 'GIN',
    /** Block range: huge tables whose values track their physical order. */
    BRIN = 'BRIN',
}

/**
 * Sort direction of an index key, for {@link ColumnIndexOptions.order}.
 *
 * @remarks
 * Rarely worth setting on its own, since a btree can be read backwards — it earns its
 * keep when several keys sort in mixed directions, which a single-direction index
 * cannot serve.
 */
export enum SortOrder {
    /** Ascending, which is Postgres's default. */
    ASC = 'ASC',
    /** Descending. */
    DESC = 'DESC',
}

/**
 * The clauses of the `CREATE INDEX` statement that a {@link (ColumnIndex:1) | ColumnIndex} declaration
 * turns into.
 *
 * @remarks
 * Every field is optional in practice — both decorators take a `Partial` of this, and
 * an empty object declares a plain btree index on the column. The names follow
 * Postgres's own `CREATE INDEX` syntax, and the values of the raw-SQL fields are
 * emitted as written.
 */
export interface ColumnIndexOptions {
    /**
     * Name of the index.
     *
     * @remarks
     * Defaults to the table, the column and the declaration's position on the model,
     * so two indices on one column cannot collide. Naming it yourself is what makes
     * it recognisable later in `EXPLAIN` output and in `pg_indexes`.
     */
    name: string;
    /** Index method. Postgres uses `BTREE` when this is left out. */
    method: IndexMethod;
    /**
     * Builds the index without locking writes out of the table.
     *
     * @remarks
     * Applied to the drop as well as the create. Postgres refuses to run either
     * inside a transaction, and a concurrent build that fails leaves an invalid
     * index behind to be dropped by hand — the price of not blocking a live table.
     */
    concurrently: boolean;
    /**
     * `true` sorts nulls first, `false` sorts them last, and leaving it out follows
     * Postgres.
     *
     * @remarks
     * Postgres's own default depends on the direction: nulls last for `ASC`, first
     * for `DESC`. Set it only to match an `ORDER BY` that asks for the other one.
     */
    nullsFirst: boolean;
    /** Sort direction of the index key. */
    order: SortOrder;
    /**
     * Restricts the index to the rows this SQL condition matches.
     *
     * @remarks
     * A partial index: smaller and cheaper to maintain, and used only where the
     * planner can prove a query's own condition implies this one. Raw SQL, emitted
     * as written, so the quoting is yours to get right.
     */
    predicate: string;
    /**
     * Indexes this SQL expression rather than the column.
     *
     * @remarks
     * For filtering on a computed value — `lower("email")` being the standard case,
     * which nothing but an expression index can serve. Raw SQL, and it replaces the
     * column as the key rather than joining it.
     */
    expression: string;
    /**
     * Extra columns to carry in the index without indexing them.
     *
     * @remarks
     * A covering index, so the planner can answer from the index alone instead of
     * visiting the table. Btree only. Declared but never emitted in earlier
     * versions.
     */
    include: string[];
    /** Collation of the index key, where it differs from the column's own. */
    collation: string;
    /**
     * Operator class for the key.
     *
     * @remarks
     * How the method compares values: `text_pattern_ops` to make `LIKE 'x%'`
     * indexable, `jsonb_path_ops` for a narrower GIN index. Emitted as written.
     */
    opClass: string;
    /** Tablespace to build the index in, instead of the database default. */
    tablespace: string;
    /**
     * Leaves an index that already exists alone rather than rebuilding it.
     *
     * @remarks
     * Turns the pass into `CREATE INDEX IF NOT EXISTS` with no drop in front of it,
     * so an existing index survives even if its declaration has changed since. The
     * default rebuilds on every sync, which is always correct and always costs a
     * full build.
     */
    safe: boolean;
    /** Rejects duplicate values, enforcing uniqueness through the index. */
    unique: boolean;
}

/**
 * Declares an index on a model column, with Postgres's own index options.
 *
 * @remarks
 * `Index` from `sequelize-typescript` is re-exported here and covers the ordinary
 * cases through sequelize's own sync. This declares the index as a `CREATE INDEX`
 * statement instead, which is what makes the Postgres-specific clauses reachable —
 * partial indices, expression keys, operator classes, concurrent builds, covering
 * columns. `Sequelize.sync()` runs them after the tables and views are in place.
 *
 * Declarations accumulate, so a column can carry several, and each is named by its
 * position unless you name it.
 *
 * @param options - The clauses to build into the statement.
 * @returns A property decorator.
 * @example
 * ```typescript
 * @Table
 * export class Lead extends BaseModel<Lead> {
 *     // case-insensitive lookups, over live rows only
 *     @ColumnIndex({
 *         expression: 'lower("email")',
 *         predicate: '"deletedAt" IS NULL',
 *         unique: true,
 *     })
 *     @Column(DataType.STRING)
 *     public email: string;
 * }
 * ```
 */
export function ColumnIndex(options: Partial<ColumnIndexOptions>): FunctionType;
/**
 * Declares a plain btree index on a model column.
 *
 * @remarks
 * The bare form of the decorator, equivalent to calling it with no options. Use the
 * factory form for anything Postgres-specific.
 *
 * @param target - Model prototype the property belongs to.
 * @param propertyName - Column to index.
 * @param propertyDescriptor - Unused; present because a decorator receives it.
 */
export function ColumnIndex(
    target: any,
    propertyName: string,
    propertyDescriptor?: PropertyDescriptor,
): void;
export function ColumnIndex(...args: any[]): FunctionType | void {
    if (args.length >= 2) {
        const [target, propertyName, propertyDescriptor] = args;

        return annotate(target, propertyName, propertyDescriptor);
    }

    return (
        target: any,
        propertyName: string,
        propertyDescriptor?: PropertyDescriptor,
    ) => {
        annotate(target, propertyName, propertyDescriptor, args[0]);
    };
}

/**
 * Appends one index declaration to the model's options.
 *
 * @param target - Model prototype the property belongs to.
 * @param propertyName - Column to index.
 * @param propertyDescriptor - Unused; present because a decorator receives it.
 * @param options - The clauses to record for this index.
 */
function annotate(
    target: any,
    propertyName: string,
    propertyDescriptor?: PropertyDescriptor,
    options: Partial<ColumnIndexOptions> = {},
): void {
    // Optional, because there may be no options bag yet. TypeScript applies
    // property decorators BEFORE class decorators, so on an ordinary model this
    // runs before `@Table` has created one, and reading `.indices` off undefined
    // threw at import time — which made this decorator unusable exactly where it
    // was meant to be used.
    const indices = (getOptions(target) as any)?.indices || [];
    addOptions(target, {
        indices: [
            ...indices,
            {
                column: propertyName,
                options,
            },
        ],
    } as any);
}
