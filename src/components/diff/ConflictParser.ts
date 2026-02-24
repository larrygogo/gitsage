export interface ConflictRegion {
  ours: string;
  theirs: string;
  base?: string;
  startLine: number;
  endLine: number;
}

export interface ConflictParseResult {
  regions: ConflictRegion[];
  cleanLines: string[];
}

const MARKER_OURS = /^<{7}\s*(.*)/;
const MARKER_BASE = /^\|{7}\s*(.*)/;
const MARKER_SEPARATOR = /^={7}\s*/;
const MARKER_THEIRS = /^>{7}\s*(.*)/;

type ConflictState = 'clean' | 'ours' | 'base' | 'theirs';

export class ConflictParser {
  /**
   * Parse conflict markers from file content.
   * Supports standard 2-way conflicts (<<<<<<< / ======= / >>>>>>>)
   * and diff3-style 3-way conflicts (<<<<<<< / ||||||| / ======= / >>>>>>>).
   */
  static parse(content: string): ConflictParseResult {
    const rawLines = content.split('\n');
    const regions: ConflictRegion[] = [];
    const cleanLines: string[] = [];

    let state: ConflictState = 'clean';
    let oursLines: string[] = [];
    let baseLines: string[] = [];
    let theirsLines: string[] = [];
    let startLine = 0;
    let hasBase = false;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      if (state === 'clean') {
        const oursMatch = line.match(MARKER_OURS);
        if (oursMatch) {
          state = 'ours';
          startLine = i + 1; // 1-indexed
          oursLines = [];
          baseLines = [];
          theirsLines = [];
          hasBase = false;
          continue;
        }
        cleanLines.push(line);
        continue;
      }

      if (state === 'ours') {
        const baseMatch = line.match(MARKER_BASE);
        if (baseMatch) {
          state = 'base';
          hasBase = true;
          continue;
        }
        const sepMatch = line.match(MARKER_SEPARATOR);
        if (sepMatch) {
          state = 'theirs';
          continue;
        }
        oursLines.push(line);
        continue;
      }

      if (state === 'base') {
        const sepMatch = line.match(MARKER_SEPARATOR);
        if (sepMatch) {
          state = 'theirs';
          continue;
        }
        baseLines.push(line);
        continue;
      }

      if (state === 'theirs') {
        const theirsMatch = line.match(MARKER_THEIRS);
        if (theirsMatch) {
          const endLine = i + 1; // 1-indexed
          const region: ConflictRegion = {
            ours: oursLines.join('\n'),
            theirs: theirsLines.join('\n'),
            startLine,
            endLine,
          };
          if (hasBase) {
            region.base = baseLines.join('\n');
          }
          regions.push(region);

          // Add a placeholder to cleanLines marking the conflict location
          cleanLines.push(`<<<CONFLICT_REGION_${regions.length - 1}>>>`);

          state = 'clean';
          continue;
        }
        theirsLines.push(line);
        continue;
      }
    }

    return { regions, cleanLines };
  }
}
