import { type Component, Show } from 'solid-js';

export interface DiffHunkHeaderProps {
  header: string;
  hunkIndex: number;
  staged?: boolean;
  onStageHunk?: (index: number) => void;
  onUnstageHunk?: (index: number) => void;
  onDiscardHunk?: (index: number) => void;
}

const headerContainerStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'space-between',
  'padding': '4px 12px',
  'background-color': 'var(--gs-diff-hunk-bg, #f0f6ff)',
  'border-top': '1px solid var(--gs-diff-hunk-border, #d0d7de)',
  'border-bottom': '1px solid var(--gs-diff-hunk-border, #d0d7de)',
  'font-family': 'monospace',
  'font-size': '12px',
  'color': 'var(--gs-diff-hunk-color, #636c76)',
  'min-height': '28px',
};

const headerTextStyle: Record<string, string> = {
  'flex': '1',
  'overflow': 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
};

const actionsStyle: Record<string, string> = {
  'display': 'flex',
  'gap': '4px',
  'flex-shrink': '0',
  'margin-left': '8px',
};

const buttonBaseStyle: Record<string, string> = {
  'padding': '2px 8px',
  'border': '1px solid',
  'border-radius': '4px',
  'font-size': '11px',
  'cursor': 'pointer',
  'font-family': 'inherit',
  'line-height': '18px',
};

const stageButtonStyle: Record<string, string> = {
  ...buttonBaseStyle,
  'background-color': '#2da44e',
  'border-color': '#2da44e',
  'color': '#ffffff',
};

const unstageButtonStyle: Record<string, string> = {
  ...buttonBaseStyle,
  'background-color': '#bf8700',
  'border-color': '#bf8700',
  'color': '#ffffff',
};

const discardButtonStyle: Record<string, string> = {
  ...buttonBaseStyle,
  'background-color': '#cf222e',
  'border-color': '#cf222e',
  'color': '#ffffff',
};

const DiffHunkHeader: Component<DiffHunkHeaderProps> = (props) => {
  return (
    <div style={headerContainerStyle}>
      <div style={headerTextStyle}>{props.header}</div>

      <div style={actionsStyle}>
        <Show when={!props.staged && props.onStageHunk}>
          <button
            style={stageButtonStyle}
            onClick={() => props.onStageHunk?.(props.hunkIndex)}
            title="Stage this hunk"
          >
            Stage
          </button>
        </Show>

        <Show when={props.staged && props.onUnstageHunk}>
          <button
            style={unstageButtonStyle}
            onClick={() => props.onUnstageHunk?.(props.hunkIndex)}
            title="Unstage this hunk"
          >
            Unstage
          </button>
        </Show>

        <Show when={props.onDiscardHunk}>
          <button
            style={discardButtonStyle}
            onClick={() => props.onDiscardHunk?.(props.hunkIndex)}
            title="Discard this hunk"
          >
            Discard
          </button>
        </Show>
      </div>
    </div>
  );
};

export default DiffHunkHeader;
