import type { CommitInfo } from '@/types';

export interface GraphNode {
  commitId: string;
  lane: number;
  parentIds: string[];
  x: number;
  y: number;
}

export interface GraphEdge {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  maxLane: number;
}

/** Color palette for swim lanes */
const LANE_COLORS = [
  '#4078c0',
  '#6cc644',
  '#bd2c00',
  '#c9510c',
  '#6e5494',
  '#0086b3',
  '#795548',
  '#e91e63',
];

/**
 * Returns the lane color for a given lane index.
 * Wraps around if the lane exceeds the palette size.
 */
export function getLaneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length];
}

/** Horizontal spacing between swim lanes (px) */
const LANE_WIDTH = 20;

/** Vertical spacing between commit rows (px) */
const ROW_HEIGHT = 32;

/**
 * Calculate the graph layout for a list of commits.
 *
 * Commits are expected to be in reverse chronological order (newest first),
 * which is the standard output of `git log`.
 *
 * The algorithm works as follows:
 *   1. Process commits top-to-bottom (newest to oldest).
 *   2. Each commit is assigned a swim lane. The first commit gets lane 0.
 *   3. When a commit has multiple parents (merge commit), the first parent
 *      stays in the same lane; additional parents are resolved to their
 *      existing reservation or allocated a new lane.
 *   4. When a commit is the only remaining child of a lane's reservation,
 *      the lane is freed for reuse.
 */
export function calculateGraphLayout(commits: CommitInfo[]): GraphLayout {
  if (commits.length === 0) {
    return { nodes: [], edges: [], maxLane: 0 };
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Maps a commit id to the lane it is expected to appear in.
  // A reservation is created when we see a parent id that hasn't been
  // processed yet.
  const reservations = new Map<string, number>();

  // Track which lanes are currently in use.
  const activeLanes = new Set<number>();

  // Quickly look up commit row index by id (for edge drawing).
  const commitRowMap = new Map<string, number>();

  /**
   * Find the smallest non-negative integer lane that is not currently
   * active. This keeps the graph compact.
   */
  function allocateLane(): number {
    let lane = 0;
    while (activeLanes.has(lane)) {
      lane++;
    }
    activeLanes.add(lane);
    return lane;
  }

  let maxLane = 0;

  for (let row = 0; row < commits.length; row++) {
    const commit = commits[row];
    let lane: number;

    // If this commit was reserved by a child commit, use that lane.
    if (reservations.has(commit.id)) {
      lane = reservations.get(commit.id)!;
      reservations.delete(commit.id);
    } else {
      // New branch head -- allocate a fresh lane.
      lane = allocateLane();
    }

    activeLanes.add(lane);

    if (lane > maxLane) {
      maxLane = lane;
    }

    const x = lane * LANE_WIDTH;
    const y = row * ROW_HEIGHT;

    nodes.push({
      commitId: commit.id,
      lane,
      parentIds: commit.parent_ids,
      x,
      y,
    });

    commitRowMap.set(commit.id, row);

    // Process parents
    const parentIds = commit.parent_ids;

    if (parentIds.length === 0) {
      // Root commit -- free the lane since there's nothing further up.
      activeLanes.delete(lane);
    }

    for (let pi = 0; pi < parentIds.length; pi++) {
      const parentId = parentIds[pi];

      if (pi === 0) {
        // First parent: stays in the same lane.
        if (!reservations.has(parentId)) {
          reservations.set(parentId, lane);
        } else {
          // Another child already reserved a lane for this parent.
          // Free the current lane since we won't continue down it.
          activeLanes.delete(lane);
        }
      } else {
        // Additional parents (merge sources).
        if (!reservations.has(parentId)) {
          const mergeLane = allocateLane();
          reservations.set(parentId, mergeLane);
          if (mergeLane > maxLane) {
            maxLane = mergeLane;
          }
        }
      }
    }

    // Free lanes that no longer have any pending reservations pointing to
    // them, except the lanes still reserved for upcoming commits.
    const reservedLanes = new Set(reservations.values());
    for (const activeLane of [...activeLanes]) {
      if (!reservedLanes.has(activeLane)) {
        // Keep the lane only if a future commit is expected in it.
        // Since we only free lanes not in reservedLanes, the logic is:
        // after handling this commit's parents, if no reservation points
        // to this lane, free it.
        // But we need to be careful: the current commit's lane should stay
        // active if it has a first parent reservation.
        // This is already handled above.
      }
    }
  }

  // Second pass: generate edges now that all node positions are known.
  const nodeMap = new Map<string, GraphNode>();
  for (const node of nodes) {
    nodeMap.set(node.commitId, node);
  }

  for (const node of nodes) {
    for (let pi = 0; pi < node.parentIds.length; pi++) {
      const parentId = node.parentIds[pi];
      const parentNode = nodeMap.get(parentId);

      if (parentNode) {
        // Determine edge color: use the parent's lane color for merge
        // edges (pi > 0), child lane for first parent.
        const edgeLane = pi === 0 ? node.lane : parentNode.lane;
        const color = getLaneColor(edgeLane);

        edges.push({
          from: { x: node.x, y: node.y },
          to: { x: parentNode.x, y: parentNode.y },
          color,
        });
      }
    }
  }

  return { nodes, edges, maxLane };
}

export { LANE_WIDTH, ROW_HEIGHT, LANE_COLORS };
