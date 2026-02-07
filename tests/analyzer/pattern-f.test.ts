import { describe, it, expect } from 'vitest';
import { detectPseudoBold } from '../../src/analyzer/pattern-f';
import type { TextRenderingModeInfo } from '../../src/analyzer/types';

describe('detectPseudoBold (Pattern F)', () => {
  it('Tr=2 を疑似ボールドとして検出する', () => {
    const trInfos: TextRenderingModeInfo[] = [
      { pageNumber: 1, fontName: 'NotoSansJP-Regular', renderingMode: 2, lineWidth: 0.5 },
    ];
    const results = detectPseudoBold(trInfos);
    expect(results).toHaveLength(1);
    expect(results[0].patternId).toBe('F');
    expect(results[0].riskLevel).toBe('medium');
  });

  it('Tr=0 (通常) は検出しない', () => {
    const trInfos: TextRenderingModeInfo[] = [
      { pageNumber: 1, fontName: 'NotoSansJP-Regular', renderingMode: 0, lineWidth: null },
    ];
    const results = detectPseudoBold(trInfos);
    expect(results).toHaveLength(0);
  });

  it('Tr=1 (Stroke のみ) は検出しない', () => {
    const trInfos: TextRenderingModeInfo[] = [
      { pageNumber: 1, fontName: 'TestFont', renderingMode: 1, lineWidth: 0.3 },
    ];
    const results = detectPseudoBold(trInfos);
    expect(results).toHaveLength(0);
  });

  it('同一フォントの複数ページ検出を統合する', () => {
    const trInfos: TextRenderingModeInfo[] = [
      { pageNumber: 1, fontName: 'FontA', renderingMode: 2, lineWidth: 0.3 },
      { pageNumber: 3, fontName: 'FontA', renderingMode: 2, lineWidth: 0.3 },
    ];
    const results = detectPseudoBold(trInfos);
    expect(results).toHaveLength(1);
    expect(results[0].pageNumbers).toEqual([1, 3]);
  });

  it('異なるフォントの検出を分離する', () => {
    const trInfos: TextRenderingModeInfo[] = [
      { pageNumber: 1, fontName: 'FontA', renderingMode: 2, lineWidth: 0.3 },
      { pageNumber: 1, fontName: 'FontB', renderingMode: 2, lineWidth: 0.5 },
    ];
    const results = detectPseudoBold(trInfos);
    expect(results).toHaveLength(2);
  });

  it('空のリストでは結果なし', () => {
    const results = detectPseudoBold([]);
    expect(results).toHaveLength(0);
  });
});
