/*!
 * @imqueue/sequelize Public API Smoke Tests
 *
 * I'm Queue Software Project
 * Copyright (C) 2026  imqueue.com <support@imqueue.com>
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 * LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 * OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    AssociatedWith,
    ColumnIndex,
    DynamicView,
    Emittable,
    Graph,
    NullableIndex,
    View,
} from '../index.js';

describe('public API', () => {
    it('should expose the Graph class', () => {
        assert.equal(typeof Graph, 'function');
    });

    for (const [name, decorator] of Object.entries({
        AssociatedWith,
        ColumnIndex,
        DynamicView,
        Emittable,
        NullableIndex,
        View,
    })) {
        it(`should expose the ${name} decorator`, () => {
            assert.equal(typeof decorator, 'function');
        });
    }
});
