import { type Component, For, Show, createSignal, onMount } from 'solid-js';
import type { ConflictFile, ConflictVersions } from '@/types';
import * as gitService from '@/services/git';
import { ConflictParser, type ConflictRegion } from './ConflictParser';

export interface MergeEditorProps {
  conflictFile: ConflictFile;
  onComplete: () => void;
}

const containerStyle: Record<string, string> = {
  'display': 'flex',
  'flex-direction': 'column',
  'height': '100%',
  'width': '100%',
  'overflow': 'hidden',
  'font-family': 'monospace',
  'font-size': '13px',
};

const panelsRowStyle: Record<string, string> = {
  'display': 'flex',
  'flex': '1',
  'min-height': '0',
  'border-bottom': '1px solid var(--gs-merge-border, #d0d7de)',
};

const panelStyle: Record<string, string> = {
  'flex': '1',
  'display': 'flex',
  'flex-direction': 'column',
  'min-width': '0',
  'overflow': 'hidden',
};

const panelHeaderStyle: Record<string, string> = {
  'padding': '6px 12px',
  'font-weight': '600',
  'font-size': '12px',
  'border-bottom': '1px solid var(--gs-merge-border, #d0d7de)',
  'background-color': 'var(--gs-merge-panel-header-bg, #f6f8fa)',
  'flex-shrink': '0',
  'text-align': 'center',
};

const panelContentStyle: Record<string, string> = {
  'flex': '1',
  'overflow': 'auto',
  'padding': '8px',
  'white-space': 'pre-wrap',
  'word-break': 'break-all',
  'line-height': '20px',
};

const panelDividerStyle: Record<string, string> = {
  'width': '1px',
  'background-color': 'var(--gs-merge-border, #d0d7de)',
  'flex-shrink': '0',
};

const resultSectionStyle: Record<string, string> = {
  'display': 'flex',
  'flex-direction': 'column',
  'flex': '1',
  'min-height': '200px',
  'border-top': '1px solid var(--gs-merge-border, #d0d7de)',
};

const resultHeaderStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'space-between',
  'padding': '6px 12px',
  'background-color': 'var(--gs-merge-result-header-bg, #f0f6ff)',
  'border-bottom': '1px solid var(--gs-merge-border, #d0d7de)',
  'font-weight': '600',
  'font-size': '12px',
  'flex-shrink': '0',
};

const textareaStyle: Record<string, string> = {
  'flex': '1',
  'width': '100%',
  'border': 'none',
  'outline': 'none',
  'resize': 'none',
  'font-family': 'monospace',
  'font-size': '13px',
  'line-height': '20px',
  'padding': '8px',
  'background-color': 'var(--gs-merge-result-bg, #ffffff)',
  'color': 'var(--gs-merge-result-color, #1f2328)',
};

const conflictBarStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'gap': '6px',
  'padding': '4px 12px',
  'background-color': 'var(--gs-merge-conflict-bar-bg, #fff8c5)',
  'border-bottom': '1px solid var(--gs-merge-border, #d0d7de)',
  'font-size': '12px',
  'flex-shrink': '0',
};

const conflictBtnStyle: Record<string, string> = {
  'padding': '2px 8px',
  'border': '1px solid var(--gs-merge-border, #d0d7de)',
  'border-radius': '4px',
  'font-size': '11px',
  'cursor': 'pointer',
  'background-color': 'var(--gs-merge-btn-bg, #ffffff)',
  'color': 'var(--gs-merge-btn-color, #1f2328)',
  'font-family': 'inherit',
};

const completeBtnStyle: Record<string, string> = {
  'padding': '4px 16px',
  'border': '1px solid #2da44e',
  'border-radius': '4px',
  'font-size': '12px',
  'cursor': 'pointer',
  'background-color': '#2da44e',
  'color': '#ffffff',
  'font-family': 'inherit',
  'font-weight': '600',
};

const loadingStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'height': '100%',
  'color': 'var(--gs-merge-loading-color, #656d76)',
  'font-size': '14px',
};

const errorStyle: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'height': '100%',
  'color': '#cf222e',
  'font-size': '14px',
  'padding': '24px',
};

const MergeEditor: Component<MergeEditorProps> = (props) => {
  const [versions, setVersions] = createSignal<ConflictVersions | null>(null);
  const [result, setResult] = createSignal('');
  const [conflicts, setConflicts] = createSignal<ConflictRegion[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [completing, setCompleting] = createSignal(false);

  onMount(async () => {
    try {
      const v = await gitService.getConflictVersions(props.conflictFile.path);
      setVersions(v);

      // Initialize result with "ours" content, parse conflicts from it
      const oursContent = v.ours ?? '';
      setResult(oursContent);

      // Try parsing conflict markers from the ours content
      const parsed = ConflictParser.parse(oursContent);
      setConflicts(parsed.regions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  });

  const acceptRegion = (regionIndex: number, which: 'ours' | 'theirs' | 'both') => {
    const region = conflicts()[regionIndex];
    if (!region) return;

    const current = result();
    const lines = current.split('\n');

    // Find the conflict markers in the current result and replace them
    let replacement: string;
    switch (which) {
      case 'ours':
        replacement = region.ours;
        break;
      case 'theirs':
        replacement = region.theirs;
        break;
      case 'both':
        replacement = region.ours + (region.ours && region.theirs ? '\n' : '') + region.theirs;
        break;
    }

    // Reconstruct the content by replacing the conflict region
    // startLine and endLine are 1-indexed
    const start = region.startLine - 1;
    const end = region.endLine;
    const before = lines.slice(0, start);
    const after = lines.slice(end);
    const replacementLines = replacement ? replacement.split('\n') : [''];

    const newContent = [...before, ...replacementLines, ...after].join('\n');
    setResult(newContent);

    // Re-parse conflicts from updated content
    const parsed = ConflictParser.parse(newContent);
    setConflicts(parsed.regions);
  };

  const completeMerge = async () => {
    setCompleting(true);
    try {
      await gitService.writeMergeResult(props.conflictFile.path, result());
      await gitService.markResolved(props.conflictFile.path);
      props.onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div style={containerStyle}>
      <Show when={loading()}>
        <div style={loadingStyle}>Loading conflict versions...</div>
      </Show>

      <Show when={error()}>
        <div style={errorStyle}>{error()}</div>
      </Show>

      <Show when={!loading() && !error() && versions()}>
        {/* Top panels: Base | Ours | Theirs */}
        <div style={panelsRowStyle}>
          {/* Base panel */}
          <div style={panelStyle}>
            <div style={{ ...panelHeaderStyle, 'background-color': 'var(--gs-merge-base-header-bg, #eaeef2)' }}>
              Base
            </div>
            <div style={panelContentStyle}>
              {versions()!.base ?? '(No base version)'}
            </div>
          </div>

          <div style={panelDividerStyle} />

          {/* Ours panel */}
          <div style={panelStyle}>
            <div style={{ ...panelHeaderStyle, 'background-color': 'var(--gs-merge-ours-header-bg, #dafbe1)' }}>
              Ours (Current)
            </div>
            <div style={panelContentStyle}>
              {versions()!.ours ?? '(No ours version)'}
            </div>
          </div>

          <div style={panelDividerStyle} />

          {/* Theirs panel */}
          <div style={panelStyle}>
            <div style={{ ...panelHeaderStyle, 'background-color': 'var(--gs-merge-theirs-header-bg, #ddf4ff)' }}>
              Theirs (Incoming)
            </div>
            <div style={panelContentStyle}>
              {versions()!.theirs ?? '(No theirs version)'}
            </div>
          </div>
        </div>

        {/* Conflict action bars */}
        <Show when={conflicts().length > 0}>
          <For each={conflicts()}>
            {(region, idx) => (
              <div style={conflictBarStyle}>
                <span>Conflict {idx() + 1} (lines {region.startLine}-{region.endLine}):</span>
                <button
                  style={conflictBtnStyle}
                  onClick={() => acceptRegion(idx(), 'ours')}
                >
                  Accept Current
                </button>
                <button
                  style={conflictBtnStyle}
                  onClick={() => acceptRegion(idx(), 'theirs')}
                >
                  Accept Incoming
                </button>
                <button
                  style={conflictBtnStyle}
                  onClick={() => acceptRegion(idx(), 'both')}
                >
                  Accept Both
                </button>
              </div>
            )}
          </For>
        </Show>

        {/* Bottom: Result editor */}
        <div style={resultSectionStyle}>
          <div style={resultHeaderStyle}>
            <span>Result</span>
            <button
              style={completeBtnStyle}
              onClick={completeMerge}
              disabled={completing()}
            >
              {completing() ? 'Completing...' : 'Complete Merge'}
            </button>
          </div>
          <textarea
            style={textareaStyle}
            value={result()}
            onInput={(e) => setResult(e.currentTarget.value)}
            spellcheck={false}
          />
        </div>
      </Show>
    </div>
  );
};

export default MergeEditor;
