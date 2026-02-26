import { type Component, createSignal, createMemo, createEffect, For, Show } from "solid-js";
import Cloud from "lucide-solid/icons/cloud";
import TagIcon from "lucide-solid/icons/tag";
import type { CommitInfo } from "@/types";
import {
  calculateGraphLayout,
  LANE_WIDTH,
  ROW_HEIGHT,
  type GraphNode,
  type GraphEdge,
} from "./GraphCalculator";

export interface CommitGraphProps {
  commits: CommitInfo[];
  onSelectCommit?: (commit: CommitInfo) => void;
  selectedCommitId?: string;
  branchTips?: Record<string, string[]>;
}

const RENDER_BATCH = 300;
const NODE_RADIUS = 5;
const GRAPH_PAD_LEFT = 15;
const TEXT_PAD_LEFT = 8;
const MIN_GRAPH_WIDTH = 48;

/** Seed colors defined as [hue, saturation] pairs.
 *  Lightness is chosen at runtime based on active theme. */
const SEED_HS: [number, number][] = [
  [160, 60], // emerald
  [217, 91], // blue
  [271, 91], // purple
  [330, 81], // pink
  [188, 95], // cyan
  [239, 84], // indigo
  [173, 80], // teal
  [292, 91], // fuchsia
  [84, 81], // lime
  [350, 89], // rose
  [189, 94], // sky
  [25, 95], // orange
];

function isDarkTheme(): boolean {
  return document.documentElement.getAttribute("data-theme") !== "light";
}

/** Resolve a seed color to an HSL string with theme-appropriate lightness. */
function seedColor(index: number): string {
  const [h, s] = SEED_HS[index];
  const l = isDarkTheme() ? 60 : 42;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function getSeedColors(): string[] {
  return SEED_HS.map((_, i) => seedColor(i));
}

/** Generate an HSL color using golden-angle spacing for maximum distinction. */
function generateColor(index: number): string {
  const goldenAngle = 137.508;
  const hue = (index * goldenAngle) % 360;
  const l = isDarkTheme() ? 60 : 42;
  return `hsl(${Math.round(hue)}, 65%, ${l}%)`;
}

/** Cache maps branch key → color index (seed index or negative for generated).
 *  We cache the index, not the color string, so theme changes work correctly. */
const branchIndexCache = new Map<string, number>();
// Negative indices represent generated colors: -1 → generateColor(0), -2 → generateColor(1), etc.

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getLocalBranchName(branchName: string): string {
  const slashIdx = branchName.indexOf("/");
  return slashIdx >= 0 ? branchName.slice(slashIdx + 1) : branchName;
}

function isRemoteBranch(branchName: string): boolean {
  return branchName.includes("/");
}

function resolveColorByIndex(idx: number): string {
  return idx >= 0 ? seedColor(idx) : generateColor(-(idx + 1));
}

function getBranchColor(branchName: string): string {
  const key = getLocalBranchName(branchName);
  const cached = branchIndexCache.get(key);
  if (cached !== undefined) return resolveColorByIndex(cached);

  // Hash-based seed index for deterministic color per name
  const baseIdx = hashString(key) % SEED_HS.length;
  const usedIndices = new Set(branchIndexCache.values());

  // Try hash-based index, then scan for unused seed slot
  if (!usedIndices.has(baseIdx)) {
    branchIndexCache.set(key, baseIdx);
    return seedColor(baseIdx);
  }
  for (let i = 1; i < SEED_HS.length; i++) {
    const candidate = (baseIdx + i) % SEED_HS.length;
    if (!usedIndices.has(candidate)) {
      branchIndexCache.set(key, candidate);
      return seedColor(candidate);
    }
  }
  // All seeds taken — find unused generated color index
  let gi = 0;
  while (usedIndices.has(-(gi + 1))) gi++;
  branchIndexCache.set(key, -(gi + 1));
  return generateColor(gi);
}

/** Tag badge uses a fixed amber/gold color */
const TAG_COLOR = "#F59E0B";

import { shortHash, formatRelativeTime } from "@/utils/format";

const formatTime = formatRelativeTime;

const CommitGraph: Component<CommitGraphProps> = (props) => {
  const [renderLimit, setRenderLimit] = createSignal(RENDER_BATCH);
  let scrollRef: HTMLDivElement | undefined;

  const visibleCommits = createMemo(() => props.commits.slice(0, renderLimit()));
  const layout = createMemo(() => calculateGraphLayout(visibleCommits()));

  const graphWidth = createMemo(() => {
    const maxLane = layout().maxLane;
    const calculated = GRAPH_PAD_LEFT + (maxLane + 1) * LANE_WIDTH + TEXT_PAD_LEFT;
    return Math.max(MIN_GRAPH_WIDTH, calculated);
  });

  const commitMap = createMemo(() => {
    const map = new Map<string, CommitInfo>();
    for (const c of props.commits) map.set(c.id, c);
    return map;
  });

  /** Map commitId → GraphNode for quick lookup */
  const graphNodeMap = createMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const node of layout().nodes) map.set(node.commitId, node);
    return map;
  });

  /** Pick the best branch name from a list of ref names (prefer local, skip tags). */
  function pickBranchName(refNames: string[]): string | undefined {
    const sorted = [...refNames].sort();
    const local = sorted.find((n) => !n.startsWith("tag:") && !isRemoteBranch(n));
    const any = sorted.find((n) => !n.startsWith("tag:"));
    return local ?? any;
  }

  /** Build commitId → color mapping by walking first-parent chains from branch tips.
   *  Each commit is colored by the branch it belongs to. Orphan commits (not reachable
   *  from any branch tip via first-parent) get a muted fallback color. */
  const nodeColor = createMemo(() => {
    const colorMap = new Map<string, string>();
    const tips = props.branchTips ?? {};
    const nodes = layout().nodes;
    const nMap = graphNodeMap();

    // Build row index for sorting tips by position (oldest = highest row first)
    const nodeRowMap = new Map<string, number>();
    for (let i = 0; i < nodes.length; i++) {
      nodeRowMap.set(nodes[i].commitId, i);
    }

    // Collect branch tip entries, sorted oldest-first (highest row number first).
    // Processing oldest tips first ensures that older branches (e.g. master) own
    // the lower portion of the graph, and newer branches only color their unique commits.
    const tipEntries = Object.entries(tips)
      .map(([commitId, refNames]) => ({ commitId, refNames, row: nodeRowMap.get(commitId) ?? 0 }))
      .sort((a, b) => b.row - a.row);

    // Step 1: Pre-color all branch tip commits so they always win
    for (const { commitId, refNames } of tipEntries) {
      const name = pickBranchName(refNames);
      if (name) colorMap.set(commitId, getBranchColor(name));
    }

    // Step 2: Walk first-parent chains from each tip, coloring uncolored commits
    for (const { commitId, refNames } of tipEntries) {
      const name = pickBranchName(refNames);
      if (!name) continue;
      const color = getBranchColor(name);

      let currentId = commitId;
      while (currentId) {
        const node = nMap.get(currentId);
        if (!node || node.parentIds.length === 0) break;
        const parentId = node.parentIds[0];
        if (colorMap.has(parentId)) break;
        colorMap.set(parentId, color);
        currentId = parentId;
      }
    }

    // Muted fallback for commits not reachable from any branch tip
    const fallbackL = isDarkTheme() ? 45 : 55;
    const fallbackColor = `hsl(220, 15%, ${fallbackL}%)`;

    return (commitId: string): string => {
      return colorMap.get(commitId) ?? fallbackColor;
    };
  });

  function edgePath(edge: GraphEdge): string {
    const x1 = edge.from.x + GRAPH_PAD_LEFT + NODE_RADIUS;
    const y1 = edge.from.y + ROW_HEIGHT / 2;
    const x2 = edge.to.x + GRAPH_PAD_LEFT + NODE_RADIUS;
    const y2 = edge.to.y + ROW_HEIGHT / 2;

    // Straight vertical line for same-lane edges
    if (x1 === x2) return `M ${x1} ${y1} L ${x2} ${y2}`;

    // Orthogonal path with rounded corners for cross-lane edges
    const maxR = 10;
    const r = Math.min(maxR, Math.abs(x2 - x1) / 2, (y2 - y1) / 4);
    const stepY = y1 + ROW_HEIGHT * 0.45;
    const dx = x2 > x1 ? 1 : -1;

    return [
      `M ${x1} ${y1}`,
      `L ${x1} ${stepY - r}`,
      `Q ${x1} ${stepY} ${x1 + dx * r} ${stepY}`,
      `L ${x2 - dx * r} ${stepY}`,
      `Q ${x2} ${stepY} ${x2} ${stepY + r}`,
      `L ${x2} ${y2}`,
    ].join(" ");
  }

  function handleScroll() {
    if (!scrollRef) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef;
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      if (renderLimit() < props.commits.length) {
        setRenderLimit((prev) => Math.min(prev + RENDER_BATCH, props.commits.length));
      }
    }
  }

  function handleRowClick(commitId: string) {
    const commit = commitMap().get(commitId);
    if (commit && props.onSelectCommit) props.onSelectCommit(commit);
  }

  createEffect(() => {
    const _ = props.commits.length;
    setRenderLimit(RENDER_BATCH);
  });

  const totalSvgHeight = createMemo(() => visibleCommits().length * ROW_HEIGHT);

  return (
    <Show
      when={props.commits.length > 0}
      fallback={
        <div
          style={{
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            height: "100%",
            color: "var(--gs-text-muted)",
            "font-family": '"Geist Sans", sans-serif',
            "font-size": "14px",
          }}
        >
          No commits found
        </div>
      }
    >
      <div
        ref={scrollRef}
        style={{ width: "100%", height: "100%", overflow: "auto" }}
        onScroll={handleScroll}
      >
        <div style={{ position: "relative" }}>
          {/* SVG edges layer */}
          <svg
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              width: `${graphWidth()}px`,
              height: `${totalSvgHeight()}px`,
              "pointer-events": "none",
            }}
          >
            <For each={layout().edges}>
              {(edge) => (
                <path
                  d={edgePath(edge)}
                  stroke={edge.zLayer === 2 ? nodeColor()(edge.toId) : nodeColor()(edge.fromId)}
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  fill="none"
                />
              )}
            </For>
          </svg>

          {/* Commit rows */}
          <For each={layout().nodes}>
            {(node) => {
              const commit = () => commitMap().get(node.commitId);
              const isSelected = () => props.selectedCommitId === node.commitId;
              let dotRef: SVGGElement | undefined;

              return (
                <div
                  data-commit-id={node.commitId}
                  style={{
                    display: "flex",
                    "align-items": "center",
                    height: `${ROW_HEIGHT}px`,
                    cursor: "pointer",
                    "border-bottom": "1px solid var(--gs-border-primary)",
                    "background-color": isSelected() ? "#FF840008" : "transparent",
                    transition: "background-color 0.1s",
                  }}
                  onClick={() => handleRowClick(node.commitId)}
                  onMouseEnter={(e) => {
                    if (!isSelected()) {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor =
                        "var(--gs-accent-subtle)";
                    }
                    if (dotRef) dotRef.style.transform = "scale(1.4)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected()) {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = "";
                    }
                    if (dotRef) dotRef.style.transform = "";
                  }}
                >
                  {/* Graph cell */}
                  <div
                    style={{
                      "flex-shrink": "0",
                      position: "relative",
                      width: `${graphWidth()}px`,
                      height: `${ROW_HEIGHT}px`,
                    }}
                  >
                    <svg
                      style={{
                        position: "absolute",
                        top: "0",
                        left: "0",
                        width: `${graphWidth()}px`,
                        height: `${ROW_HEIGHT}px`,
                      }}
                    >
                      <g
                        ref={dotRef}
                        style={{
                          "transform-origin": `${node.x + GRAPH_PAD_LEFT + NODE_RADIUS}px ${ROW_HEIGHT / 2}px`,
                          transition: "transform 0.15s ease",
                        }}
                      >
                        {node.parentIds.length > 1 ? (
                          (() => {
                            // Merge node: both ring and inner dot use the merge-source
                            // (second parent / incoming branch) color.
                            const mergeParent = graphNodeMap().get(node.parentIds[1]);
                            const mergeSourceColor = mergeParent
                              ? nodeColor()(mergeParent.commitId)
                              : nodeColor()(node.commitId);
                            return (
                              <>
                                <circle
                                  cx={node.x + GRAPH_PAD_LEFT + NODE_RADIUS}
                                  cy={ROW_HEIGHT / 2}
                                  r={4.5}
                                  fill="var(--gs-bg-primary, #0A0A0A)"
                                  stroke={mergeSourceColor}
                                  stroke-width="2.5"
                                />
                                <circle
                                  cx={node.x + GRAPH_PAD_LEFT + NODE_RADIUS}
                                  cy={ROW_HEIGHT / 2}
                                  r={2}
                                  fill={mergeSourceColor}
                                />
                              </>
                            );
                          })()
                        ) : (
                          /* Normal node: solid circle */
                          <circle
                            cx={node.x + GRAPH_PAD_LEFT + NODE_RADIUS}
                            cy={ROW_HEIGHT / 2}
                            r={NODE_RADIUS}
                            fill={nodeColor()(node.commitId)}
                          />
                        )}
                      </g>
                    </svg>
                  </div>

                  {/* Text cell */}
                  <Show when={commit()}>
                    {(c) => {
                      const branches = () => props.branchTips?.[c().id] ?? [];
                      return (
                        <div
                          style={{
                            flex: "1",
                            display: "flex",
                            "align-items": "center",
                            gap: "16px",
                            overflow: "hidden",
                            "padding-right": "20px",
                          }}
                        >
                          {/* Commit info */}
                          <div
                            style={{
                              flex: "1",
                              display: "flex",
                              "flex-direction": "column",
                              gap: "4px",
                              "min-width": "0",
                            }}
                          >
                            <span
                              style={{
                                "font-family": '"Geist Sans", sans-serif',
                                "font-size": "13px",
                                "font-weight": isSelected() ? "500" : "normal",
                                color: isSelected()
                                  ? "var(--gs-text-primary)"
                                  : "var(--gs-text-secondary)",
                                overflow: "hidden",
                                "text-overflow": "ellipsis",
                                "white-space": "nowrap",
                              }}
                              title={c().summary}
                            >
                              {c().summary}
                            </span>
                            <div style={{ display: "flex", "align-items": "center", gap: "10px" }}>
                              <span
                                style={{
                                  "font-family":
                                    '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
                                  "font-size": "11px",
                                  "font-weight": isSelected() ? "500" : "normal",
                                  color: isSelected() ? "#FF8400" : "var(--gs-text-muted)",
                                  "flex-shrink": "0",
                                }}
                              >
                                {shortHash(c().id)}
                              </span>
                              <span
                                style={{
                                  "font-family": '"Geist Sans", sans-serif',
                                  "font-size": "11px",
                                  color: "var(--gs-text-muted)",
                                  overflow: "hidden",
                                  "text-overflow": "ellipsis",
                                  "white-space": "nowrap",
                                }}
                              >
                                {c().author_name}
                              </span>
                              <span
                                style={{
                                  "font-family": '"Geist Sans", sans-serif',
                                  "font-size": "11px",
                                  color: "var(--gs-text-muted)",
                                  "flex-shrink": "0",
                                }}
                              >
                                {formatTime(c().timestamp)}
                              </span>
                            </div>
                          </div>

                          {/* Ref badges (branches + tags) */}
                          <Show when={branches().length > 0}>
                            <div
                              style={{
                                display: "flex",
                                "align-items": "center",
                                gap: "6px",
                                "flex-shrink": "0",
                              }}
                            >
                              <For each={branches()}>
                                {(refName) => {
                                  const isTag = refName.startsWith("tag:");
                                  const isRemote = !isTag && isRemoteBranch(refName);
                                  const localName = isRemote
                                    ? getLocalBranchName(refName)
                                    : refName;
                                  const color = isTag ? TAG_COLOR : getBranchColor(refName);

                                  // If remote branch has a matching local branch on the same commit,
                                  // only show the cloud icon (no text)
                                  const hasLocalCounterpart =
                                    isRemote &&
                                    branches().some(
                                      (b) =>
                                        !b.startsWith("tag:") &&
                                        !isRemoteBranch(b) &&
                                        b === localName,
                                    );
                                  const displayName = isTag
                                    ? refName.slice(4)
                                    : hasLocalCounterpart
                                      ? ""
                                      : isRemote
                                        ? localName
                                        : refName;

                                  return (
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        "align-items": "center",
                                        gap: "4px",
                                        height: "22px",
                                        padding: hasLocalCounterpart ? "0 5px" : "0 8px",
                                        "border-radius": "11px",
                                        "background-color": color + "18",
                                        color: color,
                                        "font-family":
                                          '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
                                        "font-size": "10px",
                                        "font-weight": "500",
                                        "max-width": hasLocalCounterpart ? "none" : "120px",
                                        "white-space": "nowrap",
                                      }}
                                      title={isTag ? refName.slice(4) : refName}
                                    >
                                      {isTag && (
                                        <span style={{ display: "flex", "flex-shrink": "0" }}>
                                          <TagIcon size={10} />
                                        </span>
                                      )}
                                      {isRemote && (
                                        <span style={{ display: "flex", "flex-shrink": "0" }}>
                                          <Cloud size={10} />
                                        </span>
                                      )}
                                      {displayName && (
                                        <span
                                          style={{
                                            overflow: "hidden",
                                            "text-overflow": "ellipsis",
                                            "white-space": "nowrap",
                                            "min-width": "0",
                                          }}
                                        >
                                          {displayName}
                                        </span>
                                      )}
                                    </span>
                                  );
                                }}
                              </For>
                            </div>
                          </Show>
                        </div>
                      );
                    }}
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </Show>
  );
};

export default CommitGraph;
