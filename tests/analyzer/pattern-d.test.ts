import { describe, it, expect } from 'vitest';
import { detectSpacedLetters, detectSingleCharItems } from '../../src/analyzer/pattern-d';
import type { TextContentItem } from '../../src/analyzer/types';

describe('detectSpacedLetters (Pattern D-1)', () => {
  it('文字間スペース挿入パターンを検出する', () => {
    const items: TextContentItem[] = [
      { str: 'B o a s t', fontName: 'g_d0_f1', pageNumber: 1 },
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(1);
    expect(results[0].patternId).toBe('D');
    expect(results[0].riskLevel).toBe('medium');
    expect(results[0].pageNumbers).toEqual([1]);
  });

  it('日本語の文字間スペース挿入パターンを検出する', () => {
    const items: TextContentItem[] = [
      { str: '参 加 の き っ か け', fontName: 'g_d0_f2', pageNumber: 3 },
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(1);
    expect(results[0].fontName).toBe('g_d0_f2');
  });

  it('通常テキストは検出しない', () => {
    const items: TextContentItem[] = [
      { str: 'Born and currently resides in Hokkaido.', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: '看護師からプログラマーに転職して2年', fontName: 'g_d0_f2', pageNumber: 2 },
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(0);
  });

  it('1 文字のみの TextItem は検出しない', () => {
    const items: TextContentItem[] = [
      { str: 'a', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'R', fontName: 'g_d0_f1', pageNumber: 1 },
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(0);
  });

  it('空文字列は検出しない', () => {
    const items: TextContentItem[] = [
      { str: '', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: ' ', fontName: 'g_d0_f1', pageNumber: 1 },
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(0);
  });

  it('複数フォントにまたがる場合はフォント別に集約する', () => {
    const items: TextContentItem[] = [
      { str: 'B o a s t', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: '参 加 の き っ か け', fontName: 'g_d0_f2', pageNumber: 1 },
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(2);
    const fontNames = results.map((r) => r.fontName);
    expect(fontNames).toContain('g_d0_f1');
    expect(fontNames).toContain('g_d0_f2');
  });

  it('複数ページにまたがる場合はページ番号を統合する', () => {
    const items: TextContentItem[] = [
      { str: 'B o a s t', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'C o d e', fontName: 'g_d0_f1', pageNumber: 3 },
      { str: 'P a r t y', fontName: 'g_d0_f1', pageNumber: 1 },
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(1);
    expect(results[0].pageNumbers).toEqual([1, 3]);
  });

  it('3 文字以下のスペース挿入パターンは検出しない', () => {
    const items: TextContentItem[] = [
      { str: 'a b', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'a b c', fontName: 'g_d0_f1', pageNumber: 1 },
    ];
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(0);
  });

  it('examples は最大 5 件に制限する', () => {
    const items: TextContentItem[] = Array.from({ length: 8 }, (_, i) => ({
      str: `a b c ${String.fromCharCode(100 + i)}`,
      fontName: 'g_d0_f1',
      pageNumber: 1,
    }));
    const results = detectSpacedLetters(items);
    expect(results).toHaveLength(1);
    const examples = results[0].details?.examples as string[];
    expect(examples).toHaveLength(5);
  });

  it('message に「可能性があります」を含む', () => {
    const items: TextContentItem[] = [
      { str: 'B o a s t', fontName: 'g_d0_f1', pageNumber: 1 },
    ];
    const results = detectSpacedLetters(items);
    expect(results[0].message).toContain('可能性があります');
  });

  it('remedy に「文字間」を含む', () => {
    const items: TextContentItem[] = [
      { str: 'B o a s t', fontName: 'g_d0_f1', pageNumber: 1 },
    ];
    const results = detectSpacedLetters(items);
    expect(results[0].remedy).toContain('文字間');
  });
});

describe('detectSingleCharItems (Pattern D-2)', () => {
  it('1 文字 TextItem が 50% 以上のページを検出する', () => {
    const items: TextContentItem[] = [
      // 1 文字アイテム 4 個 + 複数文字 1 個 = 80%
      { str: 'R', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'u', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'b', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'y', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'Hello World', fontName: 'g_d0_f1', pageNumber: 1 },
    ];
    const results = detectSingleCharItems(items);
    expect(results).toHaveLength(1);
    expect(results[0].patternId).toBe('D');
    expect(results[0].riskLevel).toBe('medium');
    expect(results[0].pageNumbers).toEqual([1]);
  });

  it('1 文字 TextItem が 50% 未満のページは検出しない', () => {
    const items: TextContentItem[] = [
      // 1 文字 2 個 + 複数文字 4 個 = 33%
      { str: 'R', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'u', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'Hello', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'World', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'Test', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'Data', fontName: 'g_d0_f1', pageNumber: 1 },
    ];
    const results = detectSingleCharItems(items);
    expect(results).toHaveLength(0);
  });

  it('TextItem 数が 5 個未満のページは検出しない', () => {
    const items: TextContentItem[] = [
      { str: 'R', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'u', fontName: 'g_d0_f1', pageNumber: 1 },
      { str: 'b', fontName: 'g_d0_f1', pageNumber: 1 },
    ];
    const results = detectSingleCharItems(items);
    expect(results).toHaveLength(0);
  });

  it('複数ページで検出された場合はページ番号を統合する', () => {
    const items: TextContentItem[] = [
      // ページ 1: 1 文字 4 個 + 複数文字 1 個
      ...Array.from({ length: 4 }, (_, i) => ({
        str: String.fromCharCode(65 + i),
        fontName: 'g_d0_f1',
        pageNumber: 1,
      })),
      { str: 'Hello', fontName: 'g_d0_f1', pageNumber: 1 },
      // ページ 3: 1 文字 5 個 + 複数文字 1 個
      ...Array.from({ length: 5 }, (_, i) => ({
        str: String.fromCharCode(70 + i),
        fontName: 'g_d0_f1',
        pageNumber: 3,
      })),
      { str: 'World', fontName: 'g_d0_f1', pageNumber: 3 },
    ];
    const results = detectSingleCharItems(items);
    expect(results).toHaveLength(1);
    expect(results[0].pageNumbers).toEqual([1, 3]);
  });

  it('message に「可能性があります」を含む', () => {
    const items: TextContentItem[] = [
      ...Array.from({ length: 4 }, (_, i) => ({
        str: String.fromCharCode(65 + i),
        fontName: 'g_d0_f1',
        pageNumber: 1,
      })),
      { str: 'Hello', fontName: 'g_d0_f1', pageNumber: 1 },
    ];
    const results = detectSingleCharItems(items);
    expect(results[0].message).toContain('可能性があります');
  });

  it('空文字列はカウントに含めない', () => {
    const items: TextContentItem[] = [
      // 空文字列 5 個 + 複数文字 5 個 = 1 文字率 0%
      ...Array.from({ length: 5 }, () => ({
        str: '',
        fontName: 'g_d0_f1',
        pageNumber: 1,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        str: `Word${i}`,
        fontName: 'g_d0_f1',
        pageNumber: 1,
      })),
    ];
    const results = detectSingleCharItems(items);
    expect(results).toHaveLength(0);
  });
});
