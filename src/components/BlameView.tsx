import {
  type Component,
  createSignal,
  createEffect,
  createMemo,
  Show,
  For,
  on,
} from 'solid-js';
import type { BlameLine } from '@/types';
import * as gitService from '@/services/git';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years}年前`;
  if (months > 0) return `${months}月前`;
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}时前`;
  if (minutes > 0) return `${minutes}分前`;
  return '刚刚';
}

function shortHash(id: string): string {
  return id.slice(0, 7);
}

/**
 * Group consecutive blame lines that share the same commit id.
 * Returns an array of groups, each with the blame info and the line range.
 */
interface BlameGroup {
  commitId: string;
  authorName: string;
  timestamp: number;
  startLine: number;
  endLine: number;
  lines: BlameLine[];
}

function groupBlameLines(blameLines: BlameLine[]): BlameGroup[] {
  if (blameLines.length === 0) return [];

  const groups: BlameGroup[] = [];
  let currentGroup: BlameGroup = {
    commitId: blameLines[0].commit_id,
    authorName: blameLines[0].author_name,
    timestamp: blameLines[0].timestamp,
    startLine: blameLines[0].line_no,
    endLine: blameLines[0].line_no,
    lines: [blameLines[0]],
  };

  for (let i = 1; i < blameLines.length; i++) {
    const line = blameLines[i];
    if (line.commit_id === currentGroup.commitId) {
      currentGroup.endLine = line.line_no;
      currentGroup.lines.push(line);
    } else {
      groups.push(currentGroup);
      currentGroup = {
        commitId: line.commit_id,
        authorName: line.author_name,
        timestamp: line.timestamp,
        startLine: line.line_no,
        endLine: line.line_no,
        lines: [line],
      };
    }
  }
  groups.push(currentGroup);

  return groups;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle: Record<string, string> = {
  'display': 'flex',
  'flex-direction': 'column',
  'height': '100%',
  'background-color': 'var(--gs-bg, #ffffff)',
  'overflow': 'hidden',
};

const headerStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'space-between',
  'padding': '12px 16px',
  'border-bottom': '1px solid var(--gs-border, #d0d7de)',
  'flex-shrink': '0',
};

const titleStyle: Record<string, string> = {
  'font-size': '14px',
  'font-weight': '600',
  'color': 'var(--gs-text, #1f2328)',
};

const filePathBadgeStyle: Record<string, string> = {
  'font-family': 'monospace',
  'font-size': '12px',
  'color': 'var(--gs-hash-color, #4078c0)',
  'background-color': 'var(--gs-bg-secondary, #f6f8fa)',
  'padding': '2px 8px',
  'border-radius': '4px',
  'margin-left': '8px',
  'overflow': 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
  'max-width': '300px',
};

const closeButtonStyle: Record<string, string> = {
  'background': 'none',
  'border': 'none',
  'cursor': 'pointer',
  'font-size': '18px',
  'color': 'var(--gs-text-secondary, #636c76)',
  'padding': '4px 8px',
  'border-radius': '4px',
  'line-height': '1',
};

const bodyStyle: Record<string, string> = {
  'flex': '1',
  'overflow': 'auto',
  'font-family': 'monospace',
  'font-size': '13px',
  'line-height': '20px',
};

const tableStyle: Record<string, string> = {
  'width': '100%',
  'border-collapse': 'collapse',
  'table-layout': 'fixed',
};

const blameGutterStyle: Record<string, string> = {
  'width': '220px',
  'min-width': '220px',
  'padding': '0 8px',
  'white-space': 'nowrap',
  'overflow': 'hidden',
  'text-overflow': 'ellipsis',
  'color': 'var(--gs-text-secondary, #636c76)',
  'font-size': '11px',
  'border-right': '1px solid var(--gs-border, #d0d7de)',
  'user-select': 'none',
  'vertical-align': 'top',
  'cursor': 'default',
};

const blameGutterFirstLineStyle: Record<string, string> = {
  ...blameGutterStyle,
  'border-top': '1px solid var(--gs-border, #d0d7de)',
  'padding-top': '2px',
};

const blameGutterContinuationStyle: Record<string, string> = {
  ...blameGutterStyle,
  'color': 'transparent',
};

const lineNoStyle: Record<string, string> = {
  'width': '48px',
  'min-width': '48px',
  'padding-right': '8px',
  'text-align': 'right',
  'color': 'rgba(127, 127, 127, 0.6)',
  'user-select': 'none',
  'vertical-align': 'top',
};

const codeStyle: Record<string, string> = {
  'padding-left': '8px',
  'white-space': 'pre',
  'overflow-x': 'auto',
  'color': 'var(--gs-text, #1f2328)',
};

const blameHashStyle: Record<string, string> = {
  'color': 'var(--gs-hash-color, #4078c0)',
  'margin-right': '6px',
};

const blameAuthorStyle: Record<string, string> = {
  'margin-right': '6px',
  'max-width': '80px',
  'overflow': 'hidden',
  'text-overflow': 'ellipsis',
  'display': 'inline-block',
  'vertical-align': 'bottom',
};

const blameTimeStyle: Record<string, string> = {
  'color': 'var(--gs-text-secondary, #8b949e)',
};

const highlightBgColor = 'var(--gs-blame-highlight, #f0f6ff)';

const loadingStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'padding': '32px',
  'color': 'var(--gs-text-secondary, #636c76)',
  'font-size': '13px',
};

const errorStyle: Record<string, string> = {
  'padding': '16px',
  'color': '#cf222e',
  'font-size': '13px',
};

const emptyStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'padding': '48px',
  'color': 'var(--gs-text-secondary, #636c76)',
  'font-size': '13px',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface BlameViewProps {
  filePath: string;
  onClose: () => void;
}

const BlameView: Component<BlameViewProps> = (props) => {
  const [blameLines, setBlameLines] = createSignal<BlameLine[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [hoveredCommitId, setHoveredCommitId] = createSignal<string | null>(null);

  // Load blame data when filePath changes
  createEffect(
    on(
      () => props.filePath,
      async (path) => {
        if (!path) return;
        setLoading(true);
        setError('');
        setBlameLines([]);
        setHoveredCommitId(null);

        try {
          const result = await gitService.getBlame(path);
          setBlameLines(result);
        } catch (err: any) {
          setError(err?.message ?? '获取 Blame 信息失败');
        } finally {
          setLoading(false);
        }
      },
    ),
  );

  const groups = createMemo(() => groupBlameLines(blameLines()));

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', 'align-items': 'center' }}>
          <span style={titleStyle}>Blame</span>
          <span style={filePathBadgeStyle} title={props.filePath}>
            {props.filePath}
          </span>
        </div>
        <button
          style={closeButtonStyle}
          onClick={() => props.onClose()}
          title="关闭"
        >
          X
        </button>
      </div>

      {/* Body */}
      <div style={bodyStyle}>
        <Show when={loading()}>
          <div style={loadingStyle}>加载中...</div>
        </Show>

        <Show when={error()}>
          <div style={errorStyle}>{error()}</div>
        </Show>

        <Show when={!loading() && !error() && blameLines().length === 0}>
          <div style={emptyStyle}>暂无 Blame 数据</div>
        </Show>

        <Show when={!loading() && !error() && blameLines().length > 0}>
          <table style={tableStyle}>
            <tbody>
              <For each={groups()}>
                {(group) => (
                  <For each={group.lines}>
                    {(line, lineIdx) => {
                      const isFirstInGroup = () => lineIdx() === 0;
                      const isHighlighted = () => hoveredCommitId() === group.commitId;

                      const rowBg = (): string => {
                        if (isHighlighted()) return highlightBgColor;
                        return '';
                      };

                      return (
                        <tr
                          style={{ 'background-color': rowBg() }}
                          onMouseEnter={() => setHoveredCommitId(group.commitId)}
                          onMouseLeave={() => setHoveredCommitId(null)}
                        >
                          {/* Blame gutter */}
                          <td
                            style={
                              isFirstInGroup()
                                ? blameGutterFirstLineStyle
                                : blameGutterContinuationStyle
                            }
                            title={
                              isFirstInGroup()
                                ? `${group.commitId}\n${group.authorName}\n${new Date(group.timestamp * 1000).toLocaleString('zh-CN')}`
                                : undefined
                            }
                          >
                            <Show when={isFirstInGroup()}>
                              <span style={blameHashStyle}>
                                {shortHash(group.commitId)}
                              </span>
                              <span style={blameAuthorStyle}>
                                {group.authorName}
                              </span>
                              <span style={blameTimeStyle}>
                                {formatRelativeTime(group.timestamp)}
                              </span>
                            </Show>
                          </td>

                          {/* Line number */}
                          <td style={lineNoStyle}>{line.line_no}</td>

                          {/* Code content */}
                          <td style={codeStyle}>{line.content}</td>
                        </tr>
                      );
                    }}
                  </For>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </div>
    </div>
  );
};

export default BlameView;
