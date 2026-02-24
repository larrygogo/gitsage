import {
  type JSX,
  type Component,
  createSignal,
  createMemo,
  createEffect,
  For,
  Show,
} from 'solid-js';
import type { CommitInfo } from '@/types';
import {
  calculateGraphLayout,
  getLaneColor,
  LANE_WIDTH,
  ROW_HEIGHT,
  type GraphNode,
  type GraphEdge,
} from './GraphCalculator';

export interface CommitGraphProps {
  commits: CommitInfo[];
  onSelectCommit?: (commit: CommitInfo) => void;
  selectedCommitId?: string;
}

/** Number of commits to render at a time for performance */
const RENDER_BATCH = 300;

/** Radius of the commit node circle */
const NODE_RADIUS = 4;

/** Left padding before the first lane */
const GRAPH_PAD_LEFT = 16;

/** Left offset where commit text starts, relative to the graph area end */
const TEXT_PAD_LEFT = 12;

/**
 * Format a Unix timestamp to a relative or absolute date string.
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return '刚刚';
}

function shortHash(id: string): string {
  return id.slice(0, 7);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: Record<string, string> = {
  'width': '100%',
  'height': '100%',
  'overflow': 'auto',
  'background-color': 'var(--gs-bg, #ffffff)',
  'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  'font-size': '13px',
};

const rowBaseStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'cursor': 'pointer',
  'border-bottom': '1px solid var(--gs-border, #d0d7de)',
  'transition': 'background-color 0.1s',
};

const selectedRowStyle: Record<string, string> = {
  ...rowBaseStyle,
  'background-color': 'var(--gs-selection-bg, #ddf4ff)',
};

const graphCellStyle: Record<string, string> = {
  'flex-shrink': '0',
  'position': 'relative',
};

const textCellStyle: Record<string, string> = {
  'flex': '1',
  'display': 'flex',
  'align-items': 'center',
  'gap': '8px',
  'overflow': 'hidden',
  'padding-right': '12px',
};

const hashStyle: Record<string, string> = {
  'font-family': 'monospace',
  'font-size': '12px',
  'color': 'var(--gs-hash-color, #4078c0)',
  'flex-shrink': '0',
  'min-width': '60px',
};

const summaryStyle: Record<string, string> = {
  'flex': '1',
  'overflow': 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
  'color': 'var(--gs-text, #1f2328)',
};

const authorStyle: Record<string, string> = {
  'flex-shrink': '0',
  'color': 'var(--gs-text-secondary, #636c76)',
  'font-size': '12px',
  'max-width': '120px',
  'overflow': 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
};

const timeStyle: Record<string, string> = {
  'flex-shrink': '0',
  'color': 'var(--gs-text-secondary, #636c76)',
  'font-size': '12px',
  'min-width': '72px',
  'text-align': 'right',
};

const emptyStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'height': '100%',
  'color': 'var(--gs-text-secondary, #636c76)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CommitGraph: Component<CommitGraphProps> = (props) => {
  const [renderLimit, setRenderLimit] = createSignal(RENDER_BATCH);
  let scrollRef: HTMLDivElement | undefined;

  // Limit rendered commits for performance
  const visibleCommits = createMemo(() => {
    return props.commits.slice(0, renderLimit());
  });

  // Calculate the graph layout from the full commit list (up to render limit)
  const layout = createMemo(() => {
    return calculateGraphLayout(visibleCommits());
  });

  // Width of the graph SVG column
  const graphWidth = createMemo(() => {
    const maxLane = layout().maxLane;
    return GRAPH_PAD_LEFT + (maxLane + 1) * LANE_WIDTH + TEXT_PAD_LEFT;
  });

  // Build a quick lookup from commit id -> CommitInfo
  const commitMap = createMemo(() => {
    const map = new Map<string, CommitInfo>();
    for (const c of props.commits) {
      map.set(c.id, c);
    }
    return map;
  });

  /**
   * Generate the SVG path `d` attribute for an edge.
   * For straight vertical edges, draw a simple line.
   * For diagonal edges (branches/merges), draw a smooth Bezier curve.
   */
  function edgePath(edge: GraphEdge): string {
    const x1 = edge.from.x + GRAPH_PAD_LEFT + NODE_RADIUS;
    const y1 = edge.from.y + ROW_HEIGHT / 2;
    const x2 = edge.to.x + GRAPH_PAD_LEFT + NODE_RADIUS;
    const y2 = edge.to.y + ROW_HEIGHT / 2;

    if (x1 === x2) {
      // Straight vertical line
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    // Bezier curve for diagonal edges
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  }

  /** Infinite scroll: load more when near the bottom */
  function handleScroll() {
    if (!scrollRef) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef;
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      if (renderLimit() < props.commits.length) {
        setRenderLimit((prev) => Math.min(prev + RENDER_BATCH, props.commits.length));
      }
    }
  }

  /** Handle clicking on a commit row */
  function handleRowClick(commitId: string) {
    const commit = commitMap().get(commitId);
    if (commit && props.onSelectCommit) {
      props.onSelectCommit(commit);
    }
  }

  // Reset render limit when the commits list changes
  createEffect(() => {
    // Access props.commits to track it
    const _ = props.commits.length;
    setRenderLimit(RENDER_BATCH);
  });

  const totalSvgHeight = createMemo(() => {
    return visibleCommits().length * ROW_HEIGHT;
  });

  return (
    <Show
      when={props.commits.length > 0}
      fallback={<div style={emptyStyle}>暂无提交记录</div>}
    >
      <div ref={scrollRef} style={containerStyle} onScroll={handleScroll}>
        {/* One row per commit, with inline SVG for the graph portion */}
        <div style={{ position: 'relative' }}>
          {/* SVG layer for edges (rendered behind the rows) */}
          <svg
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: `${graphWidth()}px`,
              height: `${totalSvgHeight()}px`,
              'pointer-events': 'none',
            }}
          >
            <For each={layout().edges}>
              {(edge) => (
                <path
                  d={edgePath(edge)}
                  stroke={edge.color}
                  stroke-width="2"
                  fill="none"
                />
              )}
            </For>
          </svg>

          {/* Commit rows */}
          <For each={layout().nodes}>
            {(node, idx) => {
              const commit = () => commitMap().get(node.commitId);
              const isSelected = () => props.selectedCommitId === node.commitId;

              return (
                <div
                  style={{
                    ...(isSelected() ? selectedRowStyle : rowBaseStyle),
                    height: `${ROW_HEIGHT}px`,
                  }}
                  onClick={() => handleRowClick(node.commitId)}
                  onMouseEnter={(e) => {
                    if (!isSelected()) {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor =
                        'var(--gs-hover-bg, #f6f8fa)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected()) {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = '';
                    }
                  }}
                >
                  {/* Graph cell: just the node circle (edges are in the SVG layer) */}
                  <div
                    style={{
                      ...graphCellStyle,
                      width: `${graphWidth()}px`,
                      height: `${ROW_HEIGHT}px`,
                    }}
                  >
                    <svg
                      style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: `${graphWidth()}px`,
                        height: `${ROW_HEIGHT}px`,
                      }}
                    >
                      <circle
                        cx={node.x + GRAPH_PAD_LEFT + NODE_RADIUS}
                        cy={ROW_HEIGHT / 2}
                        r={NODE_RADIUS}
                        fill={getLaneColor(node.lane)}
                        stroke={isSelected() ? '#0969da' : '#ffffff'}
                        stroke-width={isSelected() ? 2 : 1.5}
                      />
                    </svg>
                  </div>

                  {/* Text cell: hash, summary, author, time */}
                  <Show when={commit()}>
                    {(c) => (
                      <div style={textCellStyle}>
                        <span style={hashStyle}>{shortHash(c().id)}</span>
                        <span style={summaryStyle} title={c().summary}>
                          {c().summary}
                        </span>
                        <span style={authorStyle} title={c().author_name}>
                          {c().author_name}
                        </span>
                        <span style={timeStyle}>{formatTime(c().timestamp)}</span>
                      </div>
                    )}
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
