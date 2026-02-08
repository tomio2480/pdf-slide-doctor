import { describe, it, expect } from 'vitest';
import { refineFontsWithRawScan } from '../../src/analyzer/refine-to-unicode';
import { createFont, createMockToUnicode } from '../helpers';
import type { RawFontEntry } from '../../src/analyzer/types';

describe('refineFontsWithRawScan', () => {
  it('pdf.js が toUnicode ありだが raw scan で false なら null に補正する', () => {
    const fonts = [
      createFont({
        name: 'Chalkduster',
        toUnicode: createMockToUnicode({ 0x30: '0' }),
      }),
    ];
    const rawEntries: RawFontEntry[] = [
      { baseFontName: 'Chalkduster', hasToUnicode: false },
    ];

    const result = refineFontsWithRawScan(fonts, rawEntries);
    expect(result).toHaveLength(1);
    expect(result[0].toUnicode).toBeNull();
  });

  it('pdf.js が toUnicode ありで raw scan でも true ならそのまま', () => {
    const toUnicode = createMockToUnicode({ 0x30: '0' });
    const fonts = [
      createFont({
        name: 'NotoSansJP-Regular',
        toUnicode,
      }),
    ];
    const rawEntries: RawFontEntry[] = [
      { baseFontName: 'NotoSansJP-Regular', hasToUnicode: true },
    ];

    const result = refineFontsWithRawScan(fonts, rawEntries);
    expect(result).toHaveLength(1);
    expect(result[0].toUnicode).toBe(toUnicode);
  });

  it('pdf.js が toUnicode ありで raw scan が unknown ならそのまま', () => {
    const toUnicode = createMockToUnicode({ 0x30: '0' });
    const fonts = [
      createFont({
        name: 'SomeFont',
        toUnicode,
      }),
    ];
    const rawEntries: RawFontEntry[] = [
      { baseFontName: 'SomeFont', hasToUnicode: 'unknown' },
    ];

    const result = refineFontsWithRawScan(fonts, rawEntries);
    expect(result).toHaveLength(1);
    expect(result[0].toUnicode).toBe(toUnicode);
  });

  it('pdf.js が toUnicode null ならそのまま（raw scan の結果に関わらず）', () => {
    const fonts = [
      createFont({
        name: 'MissingFont',
        toUnicode: null,
      }),
    ];
    const rawEntries: RawFontEntry[] = [
      { baseFontName: 'MissingFont', hasToUnicode: true },
    ];

    const result = refineFontsWithRawScan(fonts, rawEntries);
    expect(result).toHaveLength(1);
    expect(result[0].toUnicode).toBeNull();
  });

  it('raw scan が空配列なら補正をスキップする', () => {
    const toUnicode = createMockToUnicode({ 0x30: '0' });
    const fonts = [
      createFont({
        name: 'Chalkduster',
        toUnicode,
      }),
    ];
    const rawEntries: RawFontEntry[] = [];

    const result = refineFontsWithRawScan(fonts, rawEntries);
    expect(result).toHaveLength(1);
    expect(result[0].toUnicode).toBe(toUnicode);
  });

  it('サブセットタグ付きフォント名でも正しくマッチする', () => {
    const fonts = [
      createFont({
        name: 'EOODIA+NotoSansJP-Regular',
        toUnicode: createMockToUnicode({ 0x30: '0' }),
      }),
    ];
    const rawEntries: RawFontEntry[] = [
      { baseFontName: 'EOODIA+NotoSansJP-Regular', hasToUnicode: false },
    ];

    const result = refineFontsWithRawScan(fonts, rawEntries);
    expect(result).toHaveLength(1);
    expect(result[0].toUnicode).toBeNull();
  });

  it('サブセットタグを除去してマッチする', () => {
    // pdf.js 側はサブセットタグなし、raw scan 側はサブセットタグあり
    const fonts = [
      createFont({
        name: 'Chalkboard',
        toUnicode: createMockToUnicode({ 0x30: '0' }),
      }),
    ];
    const rawEntries: RawFontEntry[] = [
      { baseFontName: 'LEGYIG+Chalkboard', hasToUnicode: false },
    ];

    const result = refineFontsWithRawScan(fonts, rawEntries);
    expect(result).toHaveLength(1);
    expect(result[0].toUnicode).toBeNull();
  });

  it('複数フォントを正しく処理する', () => {
    const toUnicodeA = createMockToUnicode({ 0x41: 'A' });
    const toUnicodeB = createMockToUnicode({ 0x42: 'B' });
    const fonts = [
      createFont({ name: 'FontA', toUnicode: toUnicodeA }),
      createFont({ name: 'FontB', toUnicode: toUnicodeB }),
      createFont({ name: 'FontC', toUnicode: null }),
    ];
    const rawEntries: RawFontEntry[] = [
      { baseFontName: 'FontA', hasToUnicode: false },
      { baseFontName: 'FontB', hasToUnicode: true },
    ];

    const result = refineFontsWithRawScan(fonts, rawEntries);
    expect(result).toHaveLength(3);
    expect(result[0].toUnicode).toBeNull(); // FontA: 補正される
    expect(result[1].toUnicode).toBe(toUnicodeB); // FontB: そのまま
    expect(result[2].toUnicode).toBeNull(); // FontC: もとから null
  });

  it('raw scan に該当フォントがない場合はそのまま', () => {
    const toUnicode = createMockToUnicode({ 0x30: '0' });
    const fonts = [
      createFont({
        name: 'UnknownFont',
        toUnicode,
      }),
    ];
    const rawEntries: RawFontEntry[] = [
      { baseFontName: 'OtherFont', hasToUnicode: false },
    ];

    const result = refineFontsWithRawScan(fonts, rawEntries);
    expect(result).toHaveLength(1);
    expect(result[0].toUnicode).toBe(toUnicode);
  });
});
