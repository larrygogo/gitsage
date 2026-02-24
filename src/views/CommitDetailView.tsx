import {
  type Component,
  createSignal,
  createEffect,
  Show,
  For,
  on,
} from 'solid-js';
import type { CommitInfo, DiffOutput, DiffFile } from '@/types';
import * as gitService from '@/services/git';
import { DiffLine as DiffLineComponent, DiffHunkHeader } from '@/components/diff';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFullDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function shortHash(id: string): string {
  return id.slice(0, 7);
}

function filePath(file: DiffFile): string {
  return file.new_path ?? file.old_path ?? '(unknown)';
}

function fileStats(file: DiffFile): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.origin === 'Addition') additions++;
      if (line.origin === 'Deletion') deletions++;
    }
  }
  return { additions, deletions };
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle: Record<string, string> = {
  'display': 'flex',
  'flex-direction': 'column',
  'height': '100%',
  'background-color': 'var(--gs-bg, #ffffff)',
  'border-left': '1px solid var(--gs-border, #d0d7de)',
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
  'padding': '16px',
};

const metaStyle: Record<string, string> = {
  'margin-bottom': '16px',
};

const metaRowStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'baseline',
  'gap': '8px',
  'margin-bottom': '6px',
  'font-size': '13px',
  'line-height': '1.5',
};

const metaLabelStyle: Record<string, string> = {
  'color': 'var(--gs-text-secondary, #636c76)',
  'flex-shrink': '0',
  'min-width': '48px',
};

const metaValueStyle: Record<string, string> = {
  'color': 'var(--gs-text, #1f2328)',
  'word-break': 'break-all',
};

const hashValueStyle: Record<string, string> = {
  ...metaValueStyle,
  'font-family': 'monospace',
  'font-size': '12px',
};

const messageStyle: Record<string, string> = {
  'white-space': 'pre-wrap',
  'font-size': '13px',
  'line-height': '1.6',
  'color': 'var(--gs-text, #1f2328)',
  'padding': '12px',
  'background-color': 'var(--gs-bg-secondary, #f6f8fa)',
  'border-radius': '6px',
  'border': '1px solid var(--gs-border, #d0d7de)',
  'margin-bottom': '16px',
};

const sectionTitleStyle: Record<string, string> = {
  'font-size': '13px',
  'font-weight': '600',
  'color': 'var(--gs-text, #1f2328)',
  'margin-bottom': '8px',
};

const fileItemStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'space-between',
  'padding': '6px 10px',
  'border-radius': '4px',
  'cursor': 'pointer',
  'font-size': '13px',
  'border': '1px solid var(--gs-border, #d0d7de)',
  'margin-bottom': '4px',
  'transition': 'background-color 0.1s',
};

const filePathStyle: Record<string, string> = {
  'font-family': 'monospace',
  'font-size': '12px',
  'color': 'var(--gs-text, #1f2328)',
  'overflow': 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
  'flex': '1',
};

const statsContainerStyle: Record<string, string> = {
  'display': 'flex',
  'gap': '6px',
  'flex-shrink': '0',
  'margin-left': '8px',
  'font-family': 'monospace',
  'font-size': '12px',
};

const additionsStyle: Record<string, string> = {
  'color': '#1a7f37',
};

const deletionsStyle: Record<string, string> = {
  'color': '#cf222e',
};

const diffContainerStyle: Record<string, string> = {
  'margin-top': '4px',
  'margin-bottom': '8px',
  'border': '1px solid var(--gs-border, #d0d7de)',
  'border-radius': '4px',
  'overflow': 'hidden',
};

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface CommitDetailViewProps {
  commitId: string;
  onClose: () => void;
}

const CommitDetailView: Component<CommitDetailViewProps> = (props) => {
  const [diff, setDiff] = createSignal<DiffOutput | null>(null);
  const [commit, setCommit] = createSignal<CommitInfo | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [expandedFiles, setExpandedFiles] = createSignal<Set<string>>(new Set());

  // Fetch commit diff whenever the commitId prop changes
  createEffect(
    on(
      () => props.commitId,
      async (id) => {
        if (!id) return;
        setLoading(true);
        setError('');
        setDiff(null);
        setExpandedFiles(new Set<string>());

        try {
          // Fetch commit metadata via log (single commit)
          const [diffResult, logResult] = await Promise.all([
            gitService.getCommitDiff(id),
            gitService.getCommitLog(200),
          ]);

          setDiff(diffResult);

          // Find the commit in the log
          const found = logResult.find((c) => c.id === id) ?? null;
          setCommit(found);
        } catch (err: any) {
          setError(err?.message ?? '获取提交详情失败');
        } finally {
          setLoading(false);
        }
      },
    ),
  );

  /** Toggle the inline diff for a file */
  function toggleFile(path: string) {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={titleStyle}>提交详情</span>
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

        <Show when={!loading() && !error()}>
          {/* Commit metadata */}
          <div style={metaStyle}>
            <div style={metaRowStyle}>
              <span style={metaLabelStyle}>Hash</span>
              <span style={hashValueStyle}>{props.commitId}</span>
            </div>
            <Show when={commit()}>
              {(c) => (
                <>
                  <div style={metaRowStyle}>
                    <span style={metaLabelStyle}>作者</span>
                    <span style={metaValueStyle}>
                      {c().author_name} &lt;{c().author_email}&gt;
                    </span>
                  </div>
                  <div style={metaRowStyle}>
                    <span style={metaLabelStyle}>日期</span>
                    <span style={metaValueStyle}>{formatFullDate(c().timestamp)}</span>
                  </div>
                  <Show when={c().parent_ids.length > 0}>
                    <div style={metaRowStyle}>
                      <span style={metaLabelStyle}>父级</span>
                      <span style={hashValueStyle}>
                        {c().parent_ids.map(shortHash).join(', ')}
                      </span>
                    </div>
                  </Show>
                </>
              )}
            </Show>
          </div>

          {/* Full commit message */}
          <Show when={commit()}>
            {(c) => <div style={messageStyle}>{c().message}</div>}
          </Show>

          {/* Changed files */}
          <Show when={diff()}>
            {(d) => (
              <>
                <div style={sectionTitleStyle}>
                  变更文件 ({d().files.length})
                  {' '}
                  <span style={{ 'font-weight': '400', 'color': '#636c76' }}>
                    +{d().stats.insertions} -{d().stats.deletions}
                  </span>
                </div>

                <For each={d().files}>
                  {(file) => {
                    const path = filePath(file);
                    const stats = fileStats(file);
                    const isExpanded = () => expandedFiles().has(path);

                    return (
                      <div>
                        <div
                          style={fileItemStyle}
                          onClick={() => toggleFile(path)}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.backgroundColor =
                              'var(--gs-hover-bg, #f6f8fa)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.backgroundColor = '';
                          }}
                        >
                          <span style={{ 'margin-right': '6px', 'flex-shrink': '0' }}>
                            {isExpanded() ? '\u25BC' : '\u25B6'}
                          </span>
                          <span style={filePathStyle} title={path}>
                            {path}
                          </span>
                          <div style={statsContainerStyle}>
                            <Show when={stats.additions > 0}>
                              <span style={additionsStyle}>+{stats.additions}</span>
                            </Show>
                            <Show when={stats.deletions > 0}>
                              <span style={deletionsStyle}>-{stats.deletions}</span>
                            </Show>
                          </div>
                        </div>

                        {/* Inline diff (expanded) */}
                        <Show when={isExpanded()}>
                          <div style={diffContainerStyle}>
                            <Show
                              when={!file.is_binary}
                              fallback={
                                <div style={{ padding: '12px', 'font-size': '12px', color: '#636c76' }}>
                                  二进制文件，无法显示差异
                                </div>
                              }
                            >
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
                            </Show>
                          </div>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </>
            )}
          </Show>
        </Show>
      </div>
    </div>
  );
};

export default CommitDetailView;
