/*!
 * @imqueue/sequelize - Sequelize ORM refines for @imqueue
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

/**
 * Type guard helpers, inlined from @imqueue/js (only the handful this
 * package actually uses), preserving the original semantics exactly.
 */

/**
 * Returns true if a given value is not undefined or null, false otherwise
 *
 * @param {any} value
 * @return {boolean}
 */
export function isDefined(value: any): boolean {
    return typeof value !== 'undefined' && value !== null;
}

/**
 * Returns true if a given value is defined and is truthy
 *
 * @param {any} value
 * @return {boolean}
 */
export function isOk(value: any): boolean {
    return !!(isDefined(value) && value);
}

/**
 * Returns true if a given value is object-like (arrays included,
 * functions excluded)
 *
 * @param {any} obj
 * @return {boolean}
 */
export function isObject(obj: any): boolean {
    return typeof obj !== 'function' && Object(obj) === obj;
}

/**
 * Checks if a given value is Array
 *
 * @param {any} value
 * @return {boolean}
 */
export function isArray(value: any): boolean {
    return Array.isArray(value);
}

/**
 * Returns true if a given value is null, undefined, serializes to an empty
 * string or is an object without own enumerable keys
 *
 * @param {any} value
 * @return {boolean}
 */
export function isEmpty(value: any): boolean {
    return (
        !isDefined(value) ||
        `${value}` === '' ||
        (isObject(value) && !Object.keys(value).length)
    );
}

/**
 * Recursively checks if property contains value.
 * If no - it will be deleted from object
 *
 * @param {any} obj
 * @returns {boolean}
 */
export function clearObject(obj: any): boolean {
    let empty = true;

    for (const [key, value] of Object.entries(obj)) {
        empty = isEmpty(value)
            ? true
            : isObject(value)
              ? clearObject(value) || isEmpty(value)
              : false;

        if (empty) {
            delete obj[key];
            empty = false;
        }
    }

    return empty;
}
