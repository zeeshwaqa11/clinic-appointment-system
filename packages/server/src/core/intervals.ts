export interface MinuteRange {
  start: number;
  end: number;
}

export function intersectRange(a: MinuteRange, b: MinuteRange): MinuteRange | null {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return start < end ? { start, end } : null;
}

export function subtractRange(blocks: MinuteRange[], remove: MinuteRange): MinuteRange[] {
  const result: MinuteRange[] = [];
  for (const block of blocks) {
    if (remove.end <= block.start || remove.start >= block.end) {
      result.push(block);
      continue;
    }
    if (remove.start > block.start) {
      result.push({ start: block.start, end: Math.min(remove.start, block.end) });
    }
    if (remove.end < block.end) {
      result.push({ start: Math.max(remove.end, block.start), end: block.end });
    }
  }
  return result;
}
