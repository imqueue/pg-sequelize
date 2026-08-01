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
import { indexed } from '@imqueue/rpc';

/**
 * A free-form object, describable to `@imqueue/rpc`.
 *
 * @remarks
 * For the places where the shape genuinely is not known ahead of time — a `jsonb`
 * column, a settings blob, a passthrough payload. `@indexed` gives it an RPC
 * description, which a bare `Record<string, any>` cannot have: the RPC layer builds
 * its service description from decorated classes, so an anonymous type would arrive
 * at the client as nothing at all.
 *
 * Reach for it only when that is true. Every property typed this way is one the
 * generated client cannot check.
 */
@indexed(() => `[property: string]: any`)
export class JsonObject {
    [property: string]: any;
}
