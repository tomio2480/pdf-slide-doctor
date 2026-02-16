import { describe, it, expect } from 'vitest';
import { detectSpacedLetters, detectArcLayoutItems } from '../../src/analyzer/pattern-d';
import type { TextContentItem } from '../../src/analyzer/types';

/** D-1 テスト用: y と hasEOL のデフォルト値を付与するヘルパー */
function item(str: string, fontName: string, pageNumber: number): TextContentItem {
  return { str, fontName, pageNumber, y: 0, hasEOL: false };
}

describe('detectSpacedLetters (Pattern D-1)', () => {
  it('文字間スペース挿入パターンを検出する', () => {
    const items: TextContentItem[] = [
      item('B o a s t', 'g_d0_f1', 1),
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(1);
    expect(results[0].patternId).toBe('D');
    expect(results[0].riskLevel).toBe('medium');
    expect(results[0].pageNumbers).toEqual([1]);
  });

  it('日本語の文字間スペース挿入パターンを検出する', () => {
    const items: TextContentItem[] = [
      item('参 加 の き っ か け', 'g_d0_f2', 3),
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(1);
    expect(results[0].fontName).toBe('g_d0_f2');
  });

  it('通常テキストは検出しない', () => {
    const items: TextContentItem[] = [
      item('Born and currently resides in Hokkaido.', 'g_d0_f1', 1),
      item('看護師からプログラマーに転職して2年', 'g_d0_f2', 2),
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(0);
  });

  it('1 文字のみの TextItem は検出しない', () => {
    const items: TextContentItem[] = [
      item('a', 'g_d0_f1', 1),
      item('R', 'g_d0_f1', 1),
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(0);
  });

  it('空文字列は検出しない', () => {
    const items: TextContentItem[] = [
      item('', 'g_d0_f1', 1),
      item(' ', 'g_d0_f1', 1),
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(0);
  });

  it('複数フォントにまたがる場合はフォント別に集約する', () => {
    const items: TextContentItem[] = [
      item('B o a s t', 'g_d0_f1', 1),
      item('参 加 の き っ か け', 'g_d0_f2', 1),
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(2);
    const fontNames = results.map((r) => r.fontName);
    expect(fontNames).toContain('g_d0_f1');
    expect(fontNames).toContain('g_d0_f2');
  });

  it('複数ページにまたがる場合はページ番号を統合する', () => {
    const items: TextContentItem[] = [
      item('B o a s t', 'g_d0_f1', 1),
      item('C o d e', 'g_d0_f1', 3),
      item('P a r t y', 'g_d0_f1', 1),
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(1);
    expect(results[0].pageNumbers).toEqual([1, 3]);
  });

  it('3 文字以下のスペース挿入パターンは検出しない', () => {
    const items: TextContentItem[] = [
      item('a b', 'g_d0_f1', 1),
      item('a b c', 'g_d0_f1', 1),
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(0);
  });

  it('examples は最大 5 件に制限する', () => {
    const items: TextContentItem[] = Array.from({ length: 8 }, (_, i) => (
      item(`a b c ${String.fromCharCode(100 + i)}`, 'g_d0_f1', 1)
    ));
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(1);
    const examples = results[0].details?.examples as string[];
    expect(examples).toHaveLength(5);
  });

  it('message に「可能性があります」を含む', () => {
    const items: TextContentItem[] = [
      item('B o a s t', 'g_d0_f1', 1),
    ];
    const results = detectSpacedLetters(items);
    expect(results[0].message).toContain('可能性があります');
  });

  it('remedy に「文字間」を含む', () => {
    const items: TextContentItem[] = [
      item('B o a s t', 'g_d0_f1', 1),
    ];
    const results = detectSpacedLetters(items);
    expect(results[0].remedy).toContain('文字間');
  });
});

describe('detectArcLayoutItems (Pattern D-2)', () => {
  it('y 座標が異なる連続 1 文字 TextItem を検出する', () => {
    // "Ruby" が弧状配置: 各文字の y 座標が異なる
    const items: TextContentItem[] = [
      { str: 'R', fontName: 'g_d0_f1', pageNumber: 1, y: 552.9, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 552.9, hasEOL: true },
      { str: 'u', fontName: 'g_d0_f1', pageNumber: 1, y: 568.9, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 568.9, hasEOL: true },
      { str: 'b', fontName: 'g_d0_f1', pageNumber: 1, y: 581.7, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 581.7, hasEOL: true },
      { str: 'y', fontName: 'g_d0_f1', pageNumber: 1, y: 592.3, hasEOL: false },
    ];
    const results = detectArcLayoutItems(items);
    expect(results).toHaveLength(1);
    expect(results[0].patternId).toBe('D');
    expect(results[0].riskLevel).toBe('medium');
    expect(results[0].pageNumbers).toEqual([1]);
  });

  it('同じ y 座標の 1 文字 TextItem は検出しない', () => {
    // slide.pdf のケース: 日本語文字が密着して同一行に配置
    const items: TextContentItem[] = [
      { str: '探', fontName: 'g_d0_f1', pageNumber: 1, y: 321.75, hasEOL: false },
      { str: '求', fontName: 'g_d0_f2', pageNumber: 1, y: 321.75, hasEOL: false },
      { str: 'の', fontName: 'g_d0_f3', pageNumber: 1, y: 321.75, hasEOL: false },
      { str: '技', fontName: 'g_d0_f4', pageNumber: 1, y: 321.75, hasEOL: false },
      { str: '術', fontName: 'g_d0_f2', pageNumber: 1, y: 321.75, hasEOL: false },
    ];
    const results = detectArcLayoutItems(items);
    expect(results).toHaveLength(0);
  });

  it('2 文字以下の短いシーケンスは検出しない', () => {
    const items: TextContentItem[] = [
      { str: 'A', fontName: 'g_d0_f1', pageNumber: 1, y: 100, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 100, hasEOL: true },
      { str: 'B', fontName: 'g_d0_f1', pageNumber: 1, y: 120, hasEOL: false },
    ];
    const results = detectArcLayoutItems(items);
    expect(results).toHaveLength(0);
  });

  it('空白文字のみのシーケンスは検出しない', () => {
    const items: TextContentItem[] = [
      { str: ' ', fontName: 'g_d0_f1', pageNumber: 1, y: 100, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 100, hasEOL: true },
      { str: ' ', fontName: 'g_d0_f1', pageNumber: 1, y: 120, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 120, hasEOL: true },
      { str: ' ', fontName: 'g_d0_f1', pageNumber: 1, y: 140, hasEOL: false },
    ];
    const results = detectArcLayoutItems(items);
    expect(results).toHaveLength(0);
  });

  it('複数ページで検出された場合はページ番号を統合する', () => {
    const items: TextContentItem[] = [
      // ページ 1: 3 文字の弧状配置
      { str: 'A', fontName: 'g_d0_f1', pageNumber: 1, y: 100, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 100, hasEOL: true },
      { str: 'B', fontName: 'g_d0_f1', pageNumber: 1, y: 120, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 120, hasEOL: true },
      { str: 'C', fontName: 'g_d0_f1', pageNumber: 1, y: 140, hasEOL: false },
      // ページ 3: 4 文字の弧状配置
      { str: 'X', fontName: 'g_d0_f1', pageNumber: 3, y: 200, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 3, y: 200, hasEOL: true },
      { str: 'Y', fontName: 'g_d0_f1', pageNumber: 3, y: 220, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 3, y: 220, hasEOL: true },
      { str: 'Z', fontName: 'g_d0_f1', pageNumber: 3, y: 240, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 3, y: 240, hasEOL: true },
      { str: 'W', fontName: 'g_d0_f1', pageNumber: 3, y: 260, hasEOL: false },
    ];
    const results = detectArcLayoutItems(items);
    expect(results).toHaveLength(1);
    expect(results[0].pageNumbers).toEqual([1, 3]);
  });

  it('message に「可能性があります」を含む', () => {
    const items: TextContentItem[] = [
      { str: 'R', fontName: 'g_d0_f1', pageNumber: 1, y: 552.9, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 552.9, hasEOL: true },
      { str: 'u', fontName: 'g_d0_f1', pageNumber: 1, y: 568.9, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 568.9, hasEOL: true },
      { str: 'b', fontName: 'g_d0_f1', pageNumber: 1, y: 581.7, hasEOL: false },
    ];
    const results = detectArcLayoutItems(items);
    expect(results[0].message).toContain('可能性があります');
  });

  it('空文字列の hasEOL アイテムをスキップして弧状配置を検出する', () => {
    // 実際の PDF: 各 1 文字の間に hasEOL=true の空アイテムが挟まる
    const items: TextContentItem[] = [
      { str: 'K', fontName: 'g_d0_f1', pageNumber: 1, y: 599.9, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 599.9, hasEOL: true },
      { str: 'a', fontName: 'g_d0_f1', pageNumber: 1, y: 605.7, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 605.7, hasEOL: true },
      { str: 'i', fontName: 'g_d0_f1', pageNumber: 1, y: 607.8, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 607.8, hasEOL: true },
      { str: 'g', fontName: 'g_d0_f1', pageNumber: 1, y: 607.9, hasEOL: false },
    ];
    const results = detectArcLayoutItems(items);
    expect(results).toHaveLength(1);
    const examples = results[0].details?.examples as string[];
    // i(607.8) → g(607.9) は差 0.1 で閾値未満のため "Kai" で途切れる
    expect(examples).toContain('Kai');
  });

  it('非 1 文字 TextItem で弧状シーケンスが途切れる', () => {
    const items: TextContentItem[] = [
      { str: 'A', fontName: 'g_d0_f1', pageNumber: 1, y: 100, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 100, hasEOL: true },
      { str: 'B', fontName: 'g_d0_f1', pageNumber: 1, y: 120, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 120, hasEOL: true },
      { str: 'Hello', fontName: 'g_d0_f1', pageNumber: 1, y: 140, hasEOL: false },
      { str: 'C', fontName: 'g_d0_f1', pageNumber: 1, y: 160, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 160, hasEOL: true },
      { str: 'D', fontName: 'g_d0_f1', pageNumber: 1, y: 180, hasEOL: false },
    ];
    // A-B は 2 文字（閾値未満）、C-D は 2 文字（閾値未満）
    const results = detectArcLayoutItems(items);
    expect(results).toHaveLength(0);
  });

  it('examples は結合文字列を含む', () => {
    const items: TextContentItem[] = [
      { str: 'R', fontName: 'g_d0_f1', pageNumber: 1, y: 100, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 100, hasEOL: true },
      { str: 'u', fontName: 'g_d0_f1', pageNumber: 1, y: 120, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 120, hasEOL: true },
      { str: 'b', fontName: 'g_d0_f1', pageNumber: 1, y: 140, hasEOL: false },
      { str: '', fontName: 'g_d0_f1', pageNumber: 1, y: 140, hasEOL: true },
      { str: 'y', fontName: 'g_d0_f1', pageNumber: 1, y: 160, hasEOL: false },
    ];
    const results = detectArcLayoutItems(items);
    expect(results).toHaveLength(1);
    const examples = results[0].details?.examples as string[];
    expect(examples).toContain('Ruby');
  });
});
