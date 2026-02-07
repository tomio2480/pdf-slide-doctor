import { describe, it, expect } from 'vitest';
import { detectMissingToUnicode } from '../../src/analyzer/pattern-b';
import { createFont, createMockToUnicode } from '../helpers';

describe('detectMissingToUnicode (Pattern B)', () => {
  it('composite フォントで toUnicode なしを検出する', () => {
    const fonts = [createFont({
      composite: true,
      toUnicode: null,
      name: 'KozMinPr6N-Regular',
    })];
    const results = detectMissingToUnicode(fonts);
    expect(results).toHaveLength(1);
    expect(results[0].patternId).toBe('B');
    expect(results[0].riskLevel).toBe('high');
  });

  it('toUnicode が存在する場合は検出しない', () => {
    const fonts = [createFont({
      composite: true,
      toUnicode: createMockToUnicode({ 1: 'A' }),
    })];
    const results = detectMissingToUnicode(fonts);
    expect(results).toHaveLength(0);
  });

  it('非 composite フォントは検出しない', () => {
    const fonts = [createFont({
      composite: false,
      toUnicode: null,
    })];
    const results = detectMissingToUnicode(fonts);
    expect(results).toHaveLength(0);
  });

  it('composite が undefined の場合は検出しない', () => {
    const fonts = [createFont({
      composite: undefined,
      toUnicode: null,
    })];
    const results = detectMissingToUnicode(fonts);
    expect(results).toHaveLength(0);
  });
});
