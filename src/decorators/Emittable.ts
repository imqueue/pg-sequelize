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
import 'reflect-metadata';

/**
 * Placeholder for change notifications, which are not implemented.
 *
 * @remarks
 * The intent was to attach a trigger that publishes row changes through Postgres
 * `NOTIFY`. The body is empty: applying this to a model does nothing whatever, and
 * nothing about a model changes by carrying it. It is unfinished work that happens to
 * be exported, not a switch that is off.
 *
 * What exists today: `@imqueue/pg-pubsub` is the `LISTEN`/`NOTIFY` client, and
 * `@imqueue/pg-prisma` ships the change-notify triggers for the Prisma stack.
 *
 * @param _target - The model class, which is ignored.
 */
export function Emittable(_target: any) {
    // todo: implement
}
