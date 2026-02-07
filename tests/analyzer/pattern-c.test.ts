import { describe, it, expect } from 'vitest';
import { detectKangxiMismapping } from '../../src/analyzer/pattern-c';
import { createFont, createMockToUnicode } from '../helpers';

describe('detectKangxiMismapping (Pattern C)', () => {
  it('康煕部首へのマッピングを検出する', () => {
    const fonts = [createFont({
      composite: true,
      toUnicode: createMockToUnicode({ 1887: '\u2F92' }),
      name: 'TestCIDFont',
    })];
    const results = detectKangxiMismapping(fonts);
    expect(results).toHaveLength(1);
    expect(results[0].patternId).toBe('C');
    expect(results[0].riskLevel).toBe('medium');
    expect(results[0].details?.lowPriorityCount).toBe(1);
  });

  it('正常なマッピングは検出しない', () => {
    const fonts = [createFont({
      composite: true,
      toUnicode: createMockToUnicode({
        1887: '\u898B',
        100: '\u3042',
      }),
    })];
    const results = detectKangxiMismapping(fonts);
    expect(results).toHaveLength(0);
  });

  it('私用領域へのマッピングを検出する', () => {
    const fonts = [createFont({
      composite: true,
      toUnicode: createMockToUnicode({ 500: '\uE000' }),
    })];
    const results = detectKangxiMismapping(fonts);
    expect(results).toHaveLength(1);
  });

  it('toUnicode が null の場合はスキップする', () => {
    const fonts = [createFont({ composite: true, toUnicode: null })];
    const results = detectKangxiMismapping(fonts);
    expect(results).toHaveLength(0);
  });

  it('複数の低優先マッピングを件数付きで検出する', () => {
    const fonts = [createFont({
      composite: true,
      toUnicode: createMockToUnicode({
        100: '\u2F00',
        200: '\u2F01',
        300: '\u2F02',
      }),
    })];
    const results = detectKangxiMismapping(fonts);
    expect(results).toHaveLength(1);
    expect(results[0].details?.lowPriorityCount).toBe(3);
  });

  it('マッピング例は最大5件まで記録する', () => {
    const mapping: Record<number, string> = {};
    for (let i = 0; i < 10; i++) {
      mapping[i + 100] = String.fromCodePoint(0x2F00 + i);
    }
    const fonts = [createFont({
      composite: true,
      toUnicode: createMockToUnicode(mapping),
    })];
    const results = detectKangxiMismapping(fonts);
    const examples = results[0].details?.examples as string[];
    expect(examples).toHaveLength(5);
  });
});
