import { type Component, For, Show, createSignal, createMemo } from 'solid-js';
import type { DiffOutput, DiffFile } from '@/types';
import DiffLineComponent from './DiffLine';
import DiffHunkHeader from './DiffHunkHeader';
import SideBySideDiff from './SideBySideDiff';

export interface DiffViewerProps {
  diff: DiffOutput | null;
  mode?: 'unified' | 'side-by-side';
  staged?: boolean;
  onStageHunk?: (path: string, index: number) => void;
  onUnstageHunk?: (path: string, index: number) => void;
  onDiscardHunk?: (path: string, index: number) => void;
  onStageLines?: (path: string, hunkIndex: number, lines: number[]) => void;
}

const containerStyle: Record<string, string> = {
  'width': '100%',
  'height': '100%',
  'overflow-y': 'auto',
  'background-color': 'var(--gs-diff-bg, #ffffff)',
  'color': 'var(--gs-diff-color, #1f2328)',
};

const emptyStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'height': '100%',
  'min-height': '200px',
  'color': 'var(--gs-diff-empty-color, #656d76)',
  'font-size': '14px',
};

const fileHeaderStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'space-between',
  'padding': '8px 12px',
  'background-color': 'var(--gs-diff-file-header-bg, #f6f8fa)',
  'border-bottom': '1px solid var(--gs-diff-border, #d0d7de)',
  'font-family': 'monospace',
  'font-size': '13px',
  'font-weight': '600',
  'position': 'sticky',
  'top': '0',
  'z-index': '1',
};

const fileNameStyle: Record<string, string> = {
  'flex': '1',
  'overflow': 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
};

const modeToggleStyle: Record<string, string> = {
  'padding': '2px 8px',
  'border': '1px solid var(--gs-diff-border, #d0d7de)',
  'border-radius': '4px',
  'font-size': '11px',
  'cursor': 'pointer',
  'background-color': 'var(--gs-diff-toggle-bg, #ffffff)',
  'color': 'var(--gs-diff-toggle-color, #1f2328)',
  'font-family': 'inherit',
  'margin-left': '8px',
  'flex-shrink': '0',
};

const binaryStyle: Record<string, string> = {
  'padding': '24px',
  'text-align': 'center',
  'color': 'var(--gs-diff-empty-color, #656d76)',
  'font-style': 'italic',
  'font-size': '13px',
};

const fileSectionStyle: Record<string, string> = {
  'margin-bottom': '16px',
  'border': '1px solid var(--gs-diff-border, #d0d7de)',
  'border-radius': '6px',
  'overflow': 'hidden',
};

const stageSelectedBtnStyle: Record<string, string> = {
  'padding': '2px 8px',
  'border': '1px solid #2da44e',
  'border-radius': '4px',
  'font-size': '11px',
  'cursor': 'pointer',
  'background-color': '#2da44e',
  'color': '#ffffff',
  'font-family': 'inherit',
  'margin-left': '4px',
  'flex-shrink': '0',
};

function getFilePath(file: DiffFile): string {
  return file.new_path ?? file.old_path ?? 'unknown';
}

function getFileLabel(file: DiffFile): string {
  if (file.old_path && file.new_path && file.old_path !== file.new_path) {
    return `${file.old_path} -> ${file.new_path}`;
  }
  return file.new_path ?? file.old_path ?? 'unknown';
}

const DiffViewer: Component<DiffViewerProps> = (props) => {
  const [viewMode, setViewMode] = createSignal<'unified' | 'side-by-side'>(props.mode ?? 'unified');

  // Track selected lines per file+hunk: Map<`${filePath}:${hunkIndex}`, Set<lineIndex>>
  const [selectedLines, setSelectedLines] = createSignal<Map<string, Set<number>>>(new Map());

  const toggleMode = () => {
    setViewMode((prev) => (prev === 'unified' ? 'side-by-side' : 'unified'));
  };

  const toggleLine = (filePath: string, hunkIndex: number, lineIndex: number, checked: boolean) => {
    setSelectedLines((prev) => {
      const next = new Map(prev);
      const key = `${filePath}:${hunkIndex}`;
      const existing = next.get(key) ?? new Set();
      const updated = new Set(existing);
      if (checked) {
        updated.add(lineIndex);
      } else {
        updated.delete(lineIndex);
      }
      if (updated.size === 0) {
        next.delete(key);
      } else {
        next.set(key, updated);
      }
      return next;
    });
  };

  const isLineSelected = (filePath: string, hunkIndex: number, lineIndex: number): boolean => {
    const key = `${filePath}:${hunkIndex}`;
    return selectedLines().get(key)?.has(lineIndex) ?? false;
  };

  const getSelectedLineIndices = (filePath: string, hunkIndex: number): number[] => {
    const key = `${filePath}:${hunkIndex}`;
    const selected = selectedLines().get(key);
    return selected ? Array.from(selected).sort((a, b) => a - b) : [];
  };

  const hasSelectedLines = (filePath: string, hunkIndex: number): boolean => {
    const key = `${filePath}:${hunkIndex}`;
    return (selectedLines().get(key)?.size ?? 0) > 0;
  };

  const stageSelectedLines = (filePath: string, hunkIndex: number) => {
    const lines = getSelectedLineIndices(filePath, hunkIndex);
    if (lines.length > 0) {
      props.onStageLines?.(filePath, hunkIndex, lines);
      // Clear selection after staging
      setSelectedLines((prev) => {
        const next = new Map(prev);
        next.delete(`${filePath}:${hunkIndex}`);
        return next;
      });
    }
  };

  return (
    <div style={containerStyle}>
      <Show
        when={props.diff && props.diff.files.length > 0}
        fallback={
          <div style={emptyStyle}>
            {props.diff ? 'No changes to display' : 'Select a file to view diff'}
          </div>
        }
      >
        <For each={props.diff!.files}>
          {(file) => {
            const filePath = getFilePath(file);

            return (
              <div style={fileSectionStyle}>
                {/* File header */}
                <div style={fileHeaderStyle}>
                  <span style={fileNameStyle}>{getFileLabel(file)}</span>
                  <button style={modeToggleStyle} onClick={toggleMode}>
                    {viewMode() === 'unified' ? 'Side-by-Side' : 'Unified'}
                  </button>
                </div>

                {/* Binary file notice */}
                <Show when={file.is_binary}>
                  <div style={binaryStyle}>
                    Binary file - cannot display diff
                  </div>
                </Show>

                {/* Diff content */}
                <Show when={!file.is_binary}>
                  <Show
                    when={viewMode() === 'unified'}
                    fallback={<SideBySideDiff file={file} />}
                  >
                    <For each={file.hunks}>
                      {(hunk, hunkIdx) => (
                        <div>
                          {/* Hunk header */}
                          <div style={{ 'display': 'flex', 'align-items': 'center' }}>
                            <div style={{ 'flex': '1' }}>
                              <DiffHunkHeader
                                header={hunk.header}
                                hunkIndex={hunkIdx()}
                                staged={props.staged}
                                onStageHunk={
                                  props.onStageHunk
                                    ? (idx) => props.onStageHunk!(filePath, idx)
                                    : undefined
                                }
                                onUnstageHunk={
                                  props.onUnstageHunk
                                    ? (idx) => props.onUnstageHunk!(filePath, idx)
                                    : undefined
                                }
                                onDiscardHunk={
                                  props.onDiscardHunk
                                    ? (idx) => props.onDiscardHunk!(filePath, idx)
                                    : undefined
                                }
                              />
                            </div>
                            <Show when={hasSelectedLines(filePath, hunkIdx()) && props.onStageLines}>
                              <button
                                style={stageSelectedBtnStyle}
                                onClick={() => stageSelectedLines(filePath, hunkIdx())}
                                title="Stage selected lines"
                              >
                                Stage Selected
                              </button>
                            </Show>
                          </div>

                          {/* Lines */}
                          <For each={hunk.lines}>
                            {(line, lineIdx) => (
                              <DiffLineComponent
                                line={line}
                                showCheckbox={
                                  !!props.onStageLines &&
                                  (line.origin === 'Addition' || line.origin === 'Deletion')
                                }
                                checked={isLineSelected(filePath, hunkIdx(), lineIdx())}
                                onToggle={(checked) =>
                                  toggleLine(filePath, hunkIdx(), lineIdx(), checked)
                                }
                              />
                            )}
                          </For>
                        </div>
                      )}
                    </For>
                  </Show>
                </Show>
              </div>
            );
          }}
        </For>
      </Show>
    </div>
  );
};

export default DiffViewer;
