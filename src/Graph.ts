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
/**
 * A graph as adjacency lists: each vertex mapped to the vertices it points at.
 */
export type GraphMap<T> = Map<T, T[]>;

/**
 * Called once per vertex during a traversal.
 *
 * @remarks
 * Returning `false` prunes the walk at that vertex — its own edges are not
 * followed — rather than ending the traversal. Anything else, `undefined`
 * included, carries on. The second argument is the live visited map, so a
 * callback can see what has already been reached, and add to it to steer the
 * walk away from a vertex it does not want visited.
 */
export type GraphForeachCallback<T> = (
    vertex: T,
    visited: Map<T, boolean>,
) => false | void;

/**
 * A directed, unweighted graph with depth-first traversal and cycle detection.
 *
 * @remarks
 * Small on purpose. It exists so model associations can be walked as a graph —
 * `BaseModel.toGraph()` builds one — and the question worth asking of that graph is
 * whether it has a cycle, because a cycle is a chain of `include`s that can be asked
 * to include itself.
 *
 * Directed, despite what this said for a long time: an edge is recorded only on the
 * vertex it starts from, so `addEdge(a, b)` does not make `hasEdge(b, a)` true. The
 * cycle detection is the standard directed-graph one, with a recursion stack
 * alongside the visited set, and it would be wrong for an undirected graph.
 *
 * Vertices are used as `Map` keys, so identity is what distinguishes them — model
 * classes work, structurally equal objects do not.
 *
 * @example
 * ```typescript
 * const graph = Lead.toGraph();
 *
 * if (graph.isCycled()) {
 *     // some association path leads back to where it started
 * }
 * ```
 */
export class Graph<T> {
    /** The adjacency lists backing this graph. */
    private list: GraphMap<T> = new Map<T, T[]>();

    /**
     * Adds vertices with no edges.
     *
     * @remarks
     * Not idempotent: a vertex that is already present has its edges RESET, so guard
     * with {@link Graph.hasVertex} when a vertex may already be there. Adding an edge
     * from an unknown vertex adds it for you, which is the usual way one appears.
     *
     * @param vertex - Vertices to add.
     * @returns This graph, for chaining.
     */
    public addVertex(...vertex: T[]): Graph<T> {
        for (const v of vertex) {
            this.list.set(v, []);
        }

        return this;
    }

    /**
     * Removes vertices along with the edges leading out of them.
     *
     * @remarks
     * Edges pointing AT a removed vertex are left behind, so other vertices can go on
     * naming one that is gone — and a walk that follows such an edge simply finds no
     * further edges rather than failing.
     *
     * @param vertex - Vertices to remove.
     * @returns This graph, for chaining.
     */
    public delVertex(...vertex: T[]): Graph<T> {
        for (const v of vertex) {
            this.list.delete(v);
        }

        return this;
    }

    /**
     * Adds edges from one vertex to others.
     *
     * @remarks
     * Directed: only `fromVertex` records them. It is added to the graph first if it
     * is not there yet, while the targets are not — an edge may point at a vertex the
     * graph does not otherwise know. Duplicate edges are kept as duplicates.
     *
     * @param fromVertex - Vertex the edges start from.
     * @param toVertex - Vertices they point at.
     * @returns This graph, for chaining.
     */
    public addEdge(fromVertex: T, ...toVertex: T[]): Graph<T> {
        let edges = this.list.get(fromVertex);

        if (!edges) {
            this.addVertex(fromVertex);
            edges = this.list.get(fromVertex) as T[];
        }

        edges.push(...toVertex);

        return this;
    }

    /**
     * Removes edges from one vertex to others.
     *
     * @remarks
     * Every occurrence of each target is removed, so a duplicated edge goes entirely.
     * A vertex with no edges, or one that is not in the graph, is left alone.
     *
     * @param fromVertex - Vertex to remove edges from.
     * @param toVertex - Vertices to stop pointing at.
     * @returns This graph, for chaining.
     */
    public delEdge(fromVertex: T, ...toVertex: T[]): Graph<T> {
        const edges = this.list.get(fromVertex);

        if (!(edges && edges.length)) {
            return this;
        }

        for (const vertex of toVertex) {
            while (~edges.indexOf(vertex)) {
                edges.splice(edges.indexOf(vertex), 1);
            }
        }

        return this;
    }

    /**
     * Whether one vertex points at another.
     *
     * @remarks
     * Directed, so the order of the arguments matters: this asks about an edge from
     * `vertex` to `edge` and says nothing about the other direction.
     *
     * @param vertex - Vertex the edge would start from.
     * @param edge - Vertex it would point at.
     * @returns `true` when that edge is present.
     */
    public hasEdge(vertex: T, edge: T): boolean {
        return !!~(this.list.get(vertex) || []).indexOf(edge);
    }

    /**
     * Whether a vertex is in this graph.
     *
     * @remarks
     * By identity, since vertices are `Map` keys. A vertex that is only pointed at by
     * an edge and never added is not in the graph.
     *
     * @param vertex - Vertex to look for.
     * @returns `true` when the graph holds it.
     */
    public hasVertex(vertex: T): boolean {
        return this.list.has(vertex);
    }

    /**
     * Visits every vertex once, depth first.
     *
     * @remarks
     * Walks from each vertex in turn, sharing one visited set across all of them — so
     * the callback sees each vertex exactly once no matter how many paths reach it,
     * and a disconnected part of the graph is covered too. A callback returning
     * `false` prunes that branch; the traversal moves on to the next vertex rather
     * than stopping.
     *
     * @param callback - Called once per vertex.
     * @returns This graph, for chaining.
     */
    public forEach(callback: GraphForeachCallback<T>): Graph<T> {
        const visited = new Map<T, boolean>();

        for (const node of this.list.keys()) {
            this.walk(node, callback, visited);
        }

        return this;
    }

    /**
     * Walks depth first from one vertex.
     *
     * @remarks
     * Follows edges as far as they go, marking each vertex as it arrives and never
     * arriving twice, which is what makes it safe on a cyclic graph. Passing a visited
     * map of your own both continues an earlier walk and lets you exclude vertices by
     * marking them before starting.
     *
     * @param vertex - Vertex to start from.
     * @param callback - Called once per vertex reached; returning `false` prunes.
     * @param visited - Vertices already reached. A fresh map by default.
     * @returns This graph, for chaining.
     */
    public walk(
        vertex: T,
        callback?: GraphForeachCallback<T>,
        visited = new Map<T, boolean>(),
    ): Graph<T> {
        if (!visited.get(vertex)) {
            visited.set(vertex, true);

            if (callback && callback(vertex, visited) === false) {
                return this;
            }

            for (const neighbor of this.list.get(vertex) || []) {
                this.walk(neighbor, callback, visited);
            }
        }

        return this;
    }

    /**
     * Every vertex reachable from one vertex, in the order a depth-first walk finds
     * them.
     *
     * @remarks
     * The reachable SET, not the longest path — each vertex appears once however many
     * routes lead to it, and the starting vertex is the first entry. Reading it as a
     * path is what makes a cyclic graph look as though it terminates.
     *
     * @param vertex - Vertex to start from.
     * @returns An iterator over the reachable vertices.
     */
    public path(vertex: T): IterableIterator<T> {
        const visited = new Map<T, boolean>();

        this.walk(vertex, undefined, visited);

        return visited.keys();
    }

    /**
     * Whether any path in this graph leads back to where it started.
     *
     * @remarks
     * Checks from every vertex, so a cycle in a part of the graph nothing else reaches
     * is still found. A self-edge counts. For model associations this is the question
     * that matters: a cycle is an `include` chain that can be asked to include itself.
     *
     * @returns `true` when the graph contains a cycle.
     */
    public isCycled(): boolean {
        const visited = new Map<T, boolean>();
        const stack = new Map<T, boolean>();

        for (const node of this.list.keys()) {
            if (this.detectCycle(node, visited, stack)) {
                return true;
            }
        }

        return false;
    }

    /**
     * The vertices in this graph, in insertion order.
     *
     * @returns An iterator over the vertices.
     */
    public vertices(): IterableIterator<T> {
        return this.list.keys();
    }

    /**
     * Looks for a cycle reachable from one vertex.
     *
     * @remarks
     * Depth-first with a recursion stack beside the visited set: reaching a vertex
     * that is still on the stack means the path has come back on itself, whereas
     * reaching one that is merely visited means it was explored already and holds no
     * cycle. The stack entry is cleared on the way out, which is what keeps two
     * separate paths through one vertex from reading as a cycle.
     *
     * @param vertex - Vertex to search from.
     * @param visited - Vertices explored in this run, added to as it goes.
     * @param stack - Vertices on the current path.
     * @returns `true` when a cycle is reachable from `vertex`.
     */
    private detectCycle(
        vertex: T,
        visited: Map<T, boolean>,
        stack: Map<T, boolean>,
    ): boolean {
        if (!visited.get(vertex)) {
            visited.set(vertex, true);
            stack.set(vertex, true);

            for (const currentNode of this.list.get(vertex) || []) {
                if (
                    (!visited.get(currentNode) &&
                        this.detectCycle(currentNode, visited, stack)) ||
                    stack.get(currentNode)
                ) {
                    return true;
                }
            }
        }

        stack.set(vertex, false);

        return false;
    }
}
