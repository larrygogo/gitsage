import {
  type Component,
  createSignal,
  createEffect,
  Show,
  For,
  on,
} from 'solid-js';
import type { CommitInfo, DiffOutput } from '@/types';
import * as gitService from '@/services/git';
import { DiffLine as DiffLineComponent, DiffHunkHeader } from '@/components/diff';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  'overflow-y': 'auto',
  'padding': '0',
};

const commitItemStyle: Record<string, string> = {
  'display': 'flex',
  'flex-direction': 'column',
  'padding': '10px 16px',
  'border-bottom': '1px solid var(--gs-border, #d0d7de)',
  'cursor': 'pointer',
  'transition': 'background-color 0.1s',
};

const commitTopRowStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'gap': '8px',
};

const commitHashStyle: Record<string, string> = {
  'font-family': 'monospace',
  'font-size': '12px',
  'color': 'var(--gs-hash-color, #4078c0)',
  'flex-shrink': '0',
};

const commitSummaryStyle: Record<string, string> = {
  'flex': '1',
  'font-size': '13px',
  'color': 'var(--gs-text, #1f2328)',
  'overflow': 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
};

const commitBottomRowStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'gap': '12px',
  'margin-top': '4px',
  'font-size': '12px',
  'color': 'var(--gs-text-secondary, #636c76)',
};

const selectedCommitStyle: Record<string, string> = {
  ...commitItemStyle,
  'background-color': 'var(--gs-selection-bg, #ddf4ff)',
};

const diffContainerStyle: Record<string, string> = {
  'border-top': '1px solid var(--gs-border, #d0d7de)',
  'margin-top': '8px',
};

const diffLoadingStyle: Record<string, string> = {
  'padding': '12px 16px',
  'color': 'var(--gs-text-secondary, #636c76)',
  'font-size': '12px',
};

const loadingStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'padding': '32px',
  'color': 'var(--gs-text-secondary, #636c76)',
  'font-size': '13px',
};

const emptyStyle: Record<string, string> = {
  'display': 'flex',
  'flex-direction': 'column',
  'align-items': 'center',
  'justify-content': 'center',
  'padding': '48px 16px',
  'color': 'var(--gs-text-secondary, #636c76)',
  'font-size': '13px',
  'gap': '8px',
};

const errorStyle: Record<string, string> = {
  'padding': '16px',
  'color': '#cf222e',
  'font-size': '13px',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface FileHistoryProps {
  filePath: string;
  onClose: () => void;
}

const FileHistory: Component<FileHistoryProps> = (props) => {
  const [commits, setCommits] = createSignal<CommitInfo[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const [diffResult, setDiffResult] = createSignal<DiffOutput | null>(null);
  const [diffLoading, setDiffLoading] = createSignal(false);

  // Load file history when filePath changes
  createEffect(
    on(
      () => props.filePath,
      async (path) => {
        if (!path) return;
        setLoading(true);
        setError('');
        setCommits([]);
        setSelectedId(null);
        setDiffResult(null);

        try {
          const history = await gitService.getFileHistory(path);
          setCommits(history);
        } catch (err: any) {
          setError(err?.message ?? '获取文件历史失败');
        } finally {
          setLoading(false);
        }
      },
    ),
  );

  /** Click a commit to load its diff */
  async function handleCommitClick(commitId: string) {
    if (selectedId() === commitId) {
      // Toggle off
      setSelectedId(null);
      setDiffResult(null);
      return;
    }

    setSelectedId(commitId);
    setDiffResult(null);
    setDiffLoading(true);

    try {
      const diff = await gitService.getCommitDiff(commitId);
      setDiffResult(diff);
    } catch {
      setDiffResult(null);
    } finally {
      setDiffLoading(false);
    }
  }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', 'align-items': 'center' }}>
          <span style={titleStyle}>文件历史</span>
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

        <Show when={!loading() && !error() && commits().length === 0}>
          <div style={emptyStyle}>
            <span>暂无此文件的提交记录</span>
          </div>
        </Show>

        <Show when={!loading() && !error() && commits().length > 0}>
          <For each={commits()}>
            {(commit) => {
              const isSelected = () => selectedId() === commit.id;

              return (
                <div>
                  <div
                    style={isSelected() ? selectedCommitStyle : commitItemStyle}
                    onClick={() => handleCommitClick(commit.id)}
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
                    <div style={commitTopRowStyle}>
                      <span style={commitHashStyle}>{shortHash(commit.id)}</span>
                      <span style={commitSummaryStyle} title={commit.summary}>
                        {commit.summary}
                      </span>
                    </div>
                    <div style={commitBottomRowStyle}>
                      <span>{commit.author_name}</span>
                      <span>{formatTime(commit.timestamp)}</span>
                    </div>
                  </div>

                  {/* Inline diff for selected commit */}
                  <Show when={isSelected()}>
                    <div style={diffContainerStyle}>
                      <Show when={diffLoading()}>
                        <div style={diffLoadingStyle}>加载差异中...</div>
                      </Show>
                      <Show when={!diffLoading() && diffResult()}>
                        {(d) => (
                          <For each={d().files}>
                            {(file) => (
                              <Show
                                when={!file.is_binary}
                                fallback={
                                  <div style={{ padding: '12px', 'font-size': '12px', color: '#636c76' }}>
                                    二进制文件，无法显示差异
                                  </div>
                                }
                              >
                                <div style={{ 'border-bottom': '1px solid var(--gs-border, #d0d7de)' }}>
                                  <div
                                    style={{
                                      padding: '6px 16px',
                                      'font-family': 'monospace',
                                      'font-size': '12px',
                                      'background-color': 'var(--gs-bg-secondary, #f6f8fa)',
                                      'color': 'var(--gs-text, #1f2328)',
                                    }}
                                  >
                                    {file.new_path ?? file.old_path ?? ''}
                                  </div>
                                  <For each={file.hunks}>
                                    {(hunk, hunkIdx) => (
                                      <>
                                        <DiffHunkHeader
                                          header={hunk.header}
                                          hunkIndex={hunkIdx()}
                                        />
                                        <For each={hunk.lines}>
                                          {(line) => <DiffLineComponent line={line} />}
                                        </For>
                                      </>
                                    )}
                                  </For>
                                </div>
                              </Show>
                            )}
                          </For>
                        )}
                      </Show>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </Show>
      </div>
    </div>
  );
};

export default FileHistory;
