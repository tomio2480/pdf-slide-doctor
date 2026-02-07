import { describe, it, expect } from 'vitest';
import { detectBoldUnembedded } from '../../src/analyzer/pattern-h';
import { createFont } from '../helpers';

describe('detectBoldUnembedded (Pattern H)', () => {
  it('"Bold" を含む未埋め込みフォントを検出する', () => {
    const fonts = [createFont({ name: 'NotoSansJP-Bold', missingFile: true })];
    const results = detectBoldUnembedded(fonts);
    expect(results).toHaveLength(1);
    expect(results[0].patternId).toBe('H');
    expect(results[0].riskLevel).toBe('high');
  });

  it('"Heavy" を含む未埋め込みフォントを検出する', () => {
    const fonts = [createFont({ name: 'HiraginoSans-W8-Heavy', missingFile: true })];
    const results = detectBoldUnembedded(fonts);
    expect(results).toHaveLength(1);
  });

  it('"Black" を含む未埋め込みフォントを検出する', () => {
    const fonts = [createFont({ name: 'NotoSansJP-Black', missingFile: true })];
    const results = detectBoldUnembedded(fonts);
    expect(results).toHaveLength(1);
  });

  it('"W6" を含む未埋め込みフォントを検出する', () => {
    const fonts = [createFont({ name: 'HiraginoSans-W6', missingFile: true })];
    const results = detectBoldUnembedded(fonts);
    expect(results).toHaveLength(1);
  });

  it('"W9" を含む未埋め込みフォントを検出する', () => {
    const fonts = [createFont({ name: 'HiraginoSans-W9', missingFile: true })];
    const results = detectBoldUnembedded(fonts);
    expect(results).toHaveLength(1);
  });

  it('Bold だが埋め込み済みは検出しない', () => {
    const fonts = [createFont({ name: 'NotoSansJP-Bold', missingFile: false })];
    const results = detectBoldUnembedded(fonts);
    expect(results).toHaveLength(0);
  });

  it('Bold でない未埋め込みフォントは検出しない', () => {
    const fonts = [createFont({ name: 'NotoSansJP-Regular', missingFile: true })];
    const results = detectBoldUnembedded(fonts);
    expect(results).toHaveLength(0);
  });

  it('"W5" は Bold 系キーワードに含まれない', () => {
    const fonts = [createFont({ name: 'HiraginoSans-W5', missingFile: true })];
    const results = detectBoldUnembedded(fonts);
    expect(results).toHaveLength(0);
  });
});
