import { type Component, Show } from 'solid-js';
import type { DiffLine as DiffLineType } from '@/types';

export interface DiffLineProps {
  line: DiffLineType;
  showCheckbox?: boolean;
  checked?: boolean;
  onToggle?: (checked: boolean) => void;
}

const lineStyles: Record<string, Record<string, string>> = {
  Addition: {
    'background-color': 'var(--gs-diff-add-bg, #e6ffec)',
    'display': 'flex',
    'align-items': 'center',
    'min-height': '20px',
    'font-family': 'monospace',
    'font-size': '13px',
    'line-height': '20px',
    'white-space': 'pre',
  },
  Deletion: {
    'background-color': 'var(--gs-diff-del-bg, #ffebe9)',
    'display': 'flex',
    'align-items': 'center',
    'min-height': '20px',
    'font-family': 'monospace',
    'font-size': '13px',
    'line-height': '20px',
    'white-space': 'pre',
  },
  Context: {
    'background-color': 'var(--gs-diff-ctx-bg, transparent)',
    'display': 'flex',
    'align-items': 'center',
    'min-height': '20px',
    'font-family': 'monospace',
    'font-size': '13px',
    'line-height': '20px',
    'white-space': 'pre',
  },
  Header: {
    'background-color': 'var(--gs-diff-hdr-bg, #f0f0f0)',
    'display': 'flex',
    'align-items': 'center',
    'min-height': '20px',
    'font-family': 'monospace',
    'font-size': '13px',
    'line-height': '20px',
    'white-space': 'pre',
    'color': '#636c76',
  },
};

const gutterStyle: Record<string, string> = {
  'width': '50px',
  'min-width': '50px',
  'text-align': 'right',
  'padding-right': '8px',
  'color': 'rgba(127, 127, 127, 0.6)',
  'user-select': 'none',
  'font-size': '12px',
  'flex-shrink': '0',
};

const checkboxContainerStyle: Record<string, string> = {
  'width': '24px',
  'min-width': '24px',
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'flex-shrink': '0',
};

const originSymbol: Record<string, string> = {
  Addition: '+',
  Deletion: '-',
  Context: ' ',
  Header: '',
};

const originStyle: Record<string, string> = {
  'width': '16px',
  'min-width': '16px',
  'text-align': 'center',
  'user-select': 'none',
  'flex-shrink': '0',
  'font-weight': 'bold',
};

const contentStyle: Record<string, string> = {
  'flex': '1',
  'padding-right': '8px',
  'overflow-x': 'auto',
};

const DiffLine: Component<DiffLineProps> = (props) => {
  const style = () => lineStyles[props.line.origin] ?? lineStyles.Context;

  return (
    <div style={style()}>
      <Show when={props.showCheckbox}>
        <div style={checkboxContainerStyle}>
          <input
            type="checkbox"
            checked={props.checked ?? false}
            onChange={(e) => props.onToggle?.(e.currentTarget.checked)}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </Show>

      <div style={gutterStyle}>
        {props.line.old_lineno != null ? props.line.old_lineno : ''}
      </div>

      <div style={gutterStyle}>
        {props.line.new_lineno != null ? props.line.new_lineno : ''}
      </div>

      <div style={originStyle}>
        {originSymbol[props.line.origin] ?? ''}
      </div>

      <div style={contentStyle}>
        {props.line.content}
      </div>
    </div>
  );
};

export default DiffLine;
