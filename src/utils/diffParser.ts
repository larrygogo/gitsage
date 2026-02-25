export interface DiffLine {
  content: string;
  type: 'hunk' | 'added' | 'deleted' | 'context';
  oldLine: number | null;
  newLine: number | null;
  index: number;
}

const hunkHeaderRegex = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/;

export function parsePatchLines(patch: string): DiffLine[] {
  const rawLines = patch.split('\n');
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const hunkMatch = line.match(hunkHeaderRegex);

    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[2], 10);
      result.push({ content: line, type: 'hunk', oldLine: null, newLine: null, index: i });
    } else if (line.startsWith('+')) {
      result.push({ content: line, type: 'added', oldLine: null, newLine, index: i });
      newLine++;
    } else if (line.startsWith('-')) {
      result.push({ content: line, type: 'deleted', oldLine, newLine: null, index: i });
      oldLine++;
    } else {
      result.push({ content: line, type: 'context', oldLine, newLine, index: i });
      oldLine++;
      newLine++;
    }
  }

  return result;
}
