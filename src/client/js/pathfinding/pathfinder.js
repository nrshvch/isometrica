/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 21.12.13
 * Time: 16:54
 * To change this template use File | Settings | File Templates.
 */
import BinaryHeap from "yabh";

function Pathfinder() {

}

Pathfinder.manhattan = function (x1, y1, x2, y2) {
    // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html

    var d1 = Math.abs(x2 - x1);
    var d2 = Math.abs(y2 - y1);
    return d1 + d2;
};

Pathfinder.reconstructPath = function (parents, current) {
    //console.log(parents,current.nodeId);
    if (parents[current.nodeId]) { //if current have parent
        var r = Pathfinder.reconstructPath(parents, parents[current.nodeId]);
        r.push(current);
        return r;
    } else
        return [current];
};

Pathfinder.search = function (start, end, heuristic) {
    var PARENTS = [],
        CLOSE = [],
        gScore = [],
        fScore = [],
        visited = [];

    var OPEN = new BinaryHeap(function (node) {
        return fScore[node.nodeId];
    });

    OPEN.push(start);
    visited[start.nodeId] = true;

    gScore[start.nodeId] = 0;
    fScore[start.nodeId] = heuristic(start, end, this);//Pathfinder.manhattan(start.host.x, start.host.y, end.host.x, end.host.y);

    var i, currentNode, gCurrent, neighbors, len, neighbor, tGScore, beenVisited;
    while (OPEN.size() > 0) {
        // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
        currentNode = OPEN.pop();

        // End case -- result has been found, return the traced path.
        if (currentNode === end)
            return Pathfinder.reconstructPath(PARENTS, currentNode);

        // Normal case -- move currentNode from open to closed, process each of its neighbors.
        //CLOSE.push(currentNode);
        CLOSE[currentNode.nodeId] = true;

        gCurrent = gScore[currentNode.nodeId];

        neighbors = currentNode.connectedNodes;
        len = neighbors.length;
        for (i = 0; i < len; i++) {
            neighbor = neighbors[i];

            if (CLOSE[neighbor.nodeId] === true) {
                // Not a valid node to process, skip to next neighbor.
                continue;
            }

            // The g score is the shortest distance from start to current node.
            // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
            tGScore = gCurrent + neighbor.cost;//1;//temporal. step = 1. Step between neighbour and currentNode
            beenVisited = visited[neighbor.nodeId];

            if (!beenVisited || tGScore < gScore[neighbor.nodeId]) {
                // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                PARENTS[neighbor.nodeId] = currentNode;
                gScore[neighbor.nodeId] = tGScore;
                fScore[neighbor.nodeId] = tGScore + heuristic(neighbor, end, this);//Pathfinder.manhattan(neighbor.host.x, neighbor.host.y, end.host.x, end.host.y);

                if (!beenVisited) {
                    // Pushing to heap will put it in proper place based on the 'f' value.
                    OPEN.push(neighbor);
                    visited[neighbor.nodeId] = true;
                }
                else {
                    // Already seen the node, but since it has been rescored we need to reorder it in the heap.
                    // yabh has no rescoreElement; re-inserting reorders it the same way (and is the same O(n),
                    // since the old rescoreElement also had to indexOf the node first).
                    OPEN.remove(neighbor);
                    OPEN.push(neighbor);
                }
            }
        }
    }

    return [];
};

/**
 * A* over tiles rather than nodes - for a grid that is not worth a node per
 * cell, like the roads cars drive on. Tiles are plain numbers, every step costs
 * the same.
 *
 * @param start {number}
 * @param end {number}
 * @param neighbours {function(number, number[])} fills the array with the tiles one can step to from the tile
 * @param heuristic {function(number, number)} estimated steps from one tile to the other
 * @param [limit] {number} gives up after looking at this many tiles
 * @returns {number[]} tiles from start to end, both included; empty when there is no way
 */
Pathfinder.searchTiles = function (start, end, neighbours, heuristic, limit) {
    var parents = new Map(),
        gScore = new Map(),
        closed = new Set(),
        next = [],
        seen = 0,
        current, gCurrent, neighbour, tGScore, known, i, path;

    //entries carry the score they were queued with - a tile queued again
    //with a better one must not change the score of the entry already in
    var open = new BinaryHeap(function (entry) {
        return entry.f;
    });

    gScore.set(start, 0);
    open.push({tile: start, f: heuristic(start, end)});

    while (open.size() > 0) {
        current = open.pop().tile;

        if (current === end) {
            path = [current];

            while (parents.has(current))
                path.push(current = parents.get(current));

            return path.reverse();
        }

        if (closed.has(current))
            continue;

        closed.add(current);

        if (limit !== undefined && ++seen > limit)
            break;

        gCurrent = gScore.get(current);
        next.length = 0;
        neighbours(current, next);

        for (i = 0; i < next.length; i++) {
            neighbour = next[i];

            if (closed.has(neighbour))
                continue;

            tGScore = gCurrent + 1;
            known = gScore.get(neighbour);

            if (known === undefined || tGScore < known) {
                parents.set(neighbour, current);
                gScore.set(neighbour, tGScore);

                //one already queued is queued again with its better score;
                //the stale entry is skipped once the tile is closed
                open.push({tile: neighbour, f: tGScore + heuristic(neighbour, end)});
            }
        }
    }

    return [];
};

export default Pathfinder;
