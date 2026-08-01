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
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BaseModel, query } from '../src/index.js';

describe('query.E()', () => {
    it('doubles single quotes so a value cannot end the constant', () => {
        // Unescaped, the second value closed the string constant and left the
        // rest of it as SQL — the injection this exists to prevent.
        assert.equal(query.E("O'Brien"), "'O''Brien'");
        assert.equal(query.E("x' OR '1'='1"), "'x'' OR ''1''=''1'");
    });

    it('renders a number as itself and everything else as NULL', () => {
        assert.equal(query.E(42), 42);
        assert.equal(query.E(''), "''");
        assert.equal(query.E(null), 'NULL');
        assert.equal(query.E(undefined), 'NULL');
        assert.equal(query.E(true), 'NULL');
        assert.equal(query.E(new Date(0)), 'NULL');
    });
});

describe('query.L()', () => {
    it('interpolates template substitutions in order', () => {
        const owner = 3;
        // The parts used to be joined with commas and the values dropped, so
        // this came out as `... owner = , AND "name" = `.
        const literal = query.L`
            (SELECT COUNT(*) FROM "T" WHERE owner = ${query.E(owner)}
                AND "name" = ${query.E("O'Brien")}) = 0
        ` as any;

        assert.match(literal.val, /owner = 3\b/);
        assert.match(literal.val, /"name" = 'O''Brien'/);
        assert.equal(literal.val.includes(','), false);
    });

    it('passes a plain string through unchanged', () => {
        const literal = query.L('"deletedAt" IS NULL') as any;

        assert.equal(literal.val, '"deletedAt" IS NULL');
    });
});

describe('BaseModel.getViewDefinition()', () => {
    const DEFINITION =
        'CREATE VIEW "V" AS SELECT * FROM "T" WHERE tenant = @{tenant}';

    // A stand-in for a @DynamicView-decorated model: the method reads nothing
    // but `options`, so no database and no model registry are needed.
    function view(viewParams: Record<string, string>) {
        return {
            options: {
                isDynamicView: true,
                viewDefinition: DEFINITION,
                viewParams,
            },
        };
    }

    function definitionOf(...args: any[]): string {
        return (BaseModel as any).getViewDefinition.apply(
            view(args.shift()),
            args,
        );
    }

    it('escapes parameter values substituted into the definition', () => {
        // viewParams can arrive with a find() call, so in a service they can be
        // caller-supplied — this is the path E() had to be fixed for.
        assert.match(
            definitionOf({ tenant: "acme' OR '1'='1" }),
            /tenant = 'acme'' OR ''1''=''1'/,
        );
    });

    it('takes call-time parameters over the decorated defaults', () => {
        assert.match(
            definitionOf({ tenant: 'default' }, { tenant: 'override' }),
            /tenant = 'override'/,
        );
    });

    it('leaves a missing parameter as NULL rather than as the placeholder', () => {
        assert.match(definitionOf({}), /tenant = NULL/);
    });

    it('strips the CREATE VIEW head when asked for a subquery', () => {
        // Removing the head leaves the space that separated it from the body;
        // every caller embeds the result as `FROM (...) AS`, so it is harmless.
        const subQuery = definitionOf({ tenant: 'acme' }, {}, true);

        assert.equal(subQuery.trim().startsWith('SELECT'), true);
        assert.equal(subQuery.includes('CREATE'), false);
    });
});
