import { describe, it, expect } from 'vitest';
import { detectMissingToUnicode } from '../../src/analyzer/pattern-b';
import { createFont, createMockToUnicode } from '../helpers';

describe('detectMissingToUnicode (Pattern B)', () => {
  it('composite フォントで toUnicode なしを検出する', () => {
    const fonts = [createFont({
      composite: true,
      toUnicode: null,
      name: 'KozMinPr6N-Regular',
      type: 'CIDFontType0',
      subtype: 'CIDFontType0C',
    })];
    const results = detectMissingToUnicode(fonts);
    expect(results).toHaveLength(1);
    expect(results[0].patternId).toBe('B');
    expect(results[0].riskLevel).toBe('high');
    expect(results[0].remedy).toContain('PDF 出力元アプリケーション');
    expect(results[0].details).toEqual({
      fontType: 'CIDFontType0',
      fontSubtype: 'CIDFontType0C',
    });
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

  it('macOS CJK フォントの場合は macOS 向け remedy を含む', () => {
    const fonts = [createFont({
      composite: true,
      toUnicode: null,
      name: 'HiraKakuProN-W3',
      type: 'CIDFontType0',
      subtype: 'CIDFontType0C',
    })];
    const results = detectMissingToUnicode(fonts);
    expect(results).toHaveLength(1);
    expect(results[0].remedy).toContain('macOS アプリケーション');
    expect(results[0].remedy).toContain('PostScript');
    expect(results[0].details?.possibleMacOS).toBe(true);
  });

  it('サブセットタグ付き macOS CJK フォントでも macOS 向け remedy を含む', () => {
    const fonts = [createFont({
      composite: true,
      toUnicode: null,
      name: 'ABCDEF+HiraginoSans-W6',
      type: 'CIDFontType0',
      subtype: 'CIDFontType0C',
    })];
    const results = detectMissingToUnicode(fonts);
    expect(results).toHaveLength(1);
    expect(results[0].remedy).toContain('macOS アプリケーション');
    expect(results[0].details?.possibleMacOS).toBe(true);
  });

  it('macOS CJK フォントでも CIDFontType2 の場合は汎用 remedy', () => {
    const fonts = [createFont({
      composite: true,
      toUnicode: null,
      name: 'YuGothic-Bold',
      type: 'CIDFontType2',
      subtype: 'CIDFontType2',
    })];
    const results = detectMissingToUnicode(fonts);
    expect(results).toHaveLength(1);
    expect(results[0].remedy).not.toContain('macOS アプリケーション');
    expect(results[0].details?.possibleMacOS).toBeUndefined();
  });

  it('Windows フォントの場合は汎用 remedy', () => {
    const fonts = [createFont({
      composite: true,
      toUnicode: null,
      name: 'MeiryoUI-Bold',
      type: 'CIDFontType2',
      subtype: 'CIDFontType2',
    })];
    const results = detectMissingToUnicode(fonts);
    expect(results).toHaveLength(1);
    expect(results[0].remedy).not.toContain('macOS アプリケーション');
    expect(results[0].remedy).toContain('PDF 出力元アプリケーション');
  });
});
