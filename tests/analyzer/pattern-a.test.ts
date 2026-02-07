import { describe, it, expect } from 'vitest';
import { detectUnembeddedFonts } from '../../src/analyzer/pattern-a';
import { createFont } from '../helpers';

describe('detectUnembeddedFonts (Pattern A)', () => {
  it('未埋め込みフォントを検出する', () => {
    const fonts = [createFont({ missingFile: true, name: 'MS-Gothic' })];
    const results = detectUnembeddedFonts(fonts);
    expect(results).toHaveLength(1);
    expect(results[0].patternId).toBe('A');
    expect(results[0].riskLevel).toBe('high');
    expect(results[0].fontName).toBe('MS-Gothic');
  });

  it('埋め込み済みフォントは検出しない', () => {
    const fonts = [createFont({ missingFile: false })];
    const results = detectUnembeddedFonts(fonts);
    expect(results).toHaveLength(0);
  });

  it('複数の未埋め込みフォントを検出する', () => {
    const fonts = [
      createFont({ missingFile: true, name: 'FontA', loadedName: 'f1' }),
      createFont({ missingFile: false, name: 'FontB', loadedName: 'f2' }),
      createFont({ missingFile: true, name: 'FontC', loadedName: 'f3' }),
    ];
    const results = detectUnembeddedFonts(fonts);
    expect(results).toHaveLength(2);
  });

  it('ページ番号がソートされて返される', () => {
    const fonts = [createFont({
      missingFile: true,
      pageNumbers: new Set([3, 1, 5]),
    })];
    const results = detectUnembeddedFonts(fonts);
    expect(results[0].pageNumbers).toEqual([1, 3, 5]);
  });
});
