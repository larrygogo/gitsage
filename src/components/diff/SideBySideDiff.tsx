import { type Component, For, createSignal, onMount, onCleanup } from 'solid-js';
import type { DiffFile, DiffLine } from '@/types';

export interface SideBySideDiffProps {
  file: DiffFile;
}

interface AlignedRow {
  left: DiffLine | null;
  right: DiffLine | null;
}

function alignHunkLines(lines: DiffLine[]): AlignedRow[] {
  const rows: AlignedRow[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.origin === 'Context') {
      rows.push({ left: line, right: line });
      i++;
    } else if (line.origin === 'Deletion') {
      // Collect consecutive deletions and additions to pair them
      const deletions: DiffLine[] = [];
      while (i < lines.length && lines[i].origin === 'Deletion') {
        deletions.push(lines[i]);
        i++;
      }
      const additions: DiffLine[] = [];
      while (i < lines.length && lines[i].origin === 'Addition') {
        additions.push(lines[i]);
        i++;
      }

      const maxLen = Math.max(deletions.length, additions.length);
      for (let j = 0; j < maxLen; j++) {
        rows.push({
          left: j < deletions.length ? deletions[j] : null,
          right: j < additions.length ? additions[j] : null,
        });
      }
    } else if (line.origin === 'Addition') {
      rows.push({ left: null, right: line });
      i++;
    } else {
      // Header or other
      rows.push({ left: line, right: line });
      i++;
    }
  }

  return rows;
}

const containerStyle: Record<string, string> = {
  'display': 'flex',
  'width': '100%',
  'overflow': 'hidden',
  'font-family': 'monospace',
  'font-size': '13px',
  'line-height': '20px',
};

const panelStyle: Record<string, string> = {
  'flex': '1',
  'overflow-x': 'auto',
  'overflow-y': 'auto',
  'min-width': '0',
};

const gutterStyle: Record<string, string> = {
  'display': 'inline-block',
  'width': '50px',
  'min-width': '50px',
  'text-align': 'right',
  'padding-right': '8px',
  'color': 'rgba(127, 127, 127, 0.6)',
  'user-select': 'none',
  'font-size': '12px',
  'flex-shrink': '0',
};

const cellContentStyle: Record<string, string> = {
  'flex': '1',
  'white-space': 'pre',
  'padding-left': '4px',
  'overflow-x': 'auto',
};

function getRowBg(line: DiffLine | null, side: 'left' | 'right'): string {
  if (!line) return 'var(--gs-diff-empty-bg, #f6f8fa)';
  if (line.origin === 'Deletion' && side === 'left') {
    return 'var(--gs-diff-del-bg, #ffebe9)';
  }
  if (line.origin === 'Addition' && side === 'right') {
    return 'var(--gs-diff-add-bg, #e6ffec)';
  }
  return 'var(--gs-diff-ctx-bg, transparent)';
}

const dividerStyle: Record<string, string> = {
  'width': '1px',
  'background-color': 'var(--gs-diff-divider, #d0d7de)',
  'flex-shrink': '0',
};

const rowStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'stretch',
  'min-height': '20px',
};

const SideBySideDiff: Component<SideBySideDiffProps> = (props) => {
  let leftPanelRef: HTMLDivElement | undefined;
  let rightPanelRef: HTMLDivElement | undefined;

  const [syncing, setSyncing] = createSignal(false);

  const syncScroll = (source: 'left' | 'right') => {
    if (syncing()) return;
    setSyncing(true);

    const srcEl = source === 'left' ? leftPanelRef : rightPanelRef;
    const tgtEl = source === 'left' ? rightPanelRef : leftPanelRef;

    if (srcEl && tgtEl) {
      tgtEl.scrollTop = srcEl.scrollTop;
    }

    // Release the sync lock asynchronously to avoid infinite loop
    requestAnimationFrame(() => setSyncing(false));
  };

  onMount(() => {
    const onLeftScroll = () => syncScroll('left');
    const onRightScroll = () => syncScroll('right');

    leftPanelRef?.addEventListener('scroll', onLeftScroll);
    rightPanelRef?.addEventListener('scroll', onRightScroll);

    onCleanup(() => {
      leftPanelRef?.removeEventListener('scroll', onLeftScroll);
      rightPanelRef?.removeEventListener('scroll', onRightScroll);
    });
  });

  const allAlignedRows = () => {
    const result: AlignedRow[] = [];
    for (const hunk of props.file.hunks) {
      result.push(...alignHunkLines(hunk.lines));
    }
    return result;
  };

  return (
    <div style={containerStyle}>
      {/* Left panel: old content */}
      <div ref={leftPanelRef} style={panelStyle}>
        <For each={allAlignedRows()}>
          {(row) => (
            <div style={{ ...rowStyle, 'background-color': getRowBg(row.left, 'left') }}>
              <span style={gutterStyle}>
                {row.left?.old_lineno != null ? row.left.old_lineno : ''}
              </span>
              <span style={cellContentStyle}>
                {row.left ? row.left.content : ''}
              </span>
            </div>
          )}
        </For>
      </div>

      {/* Divider */}
      <div style={dividerStyle} />

      {/* Right panel: new content */}
      <div ref={rightPanelRef} style={panelStyle}>
        <For each={allAlignedRows()}>
          {(row) => (
            <div style={{ ...rowStyle, 'background-color': getRowBg(row.right, 'right') }}>
              <span style={gutterStyle}>
                {row.right?.new_lineno != null ? row.right.new_lineno : ''}
              </span>
              <span style={cellContentStyle}>
                {row.right ? row.right.content : ''}
              </span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default SideBySideDiff;
