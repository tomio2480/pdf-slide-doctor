import { describe, it, expect } from 'vitest';
import { scanRawFontDicts } from '../../src/analyzer/raw-pdf-parser';

/** 文字列を ArrayBuffer に変換するヘルパー（Latin-1 エンコード） */
function toBuffer(str: string): ArrayBuffer {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes.buffer;
}

describe('scanRawFontDicts', () => {
  it('ToUnicode ありのフォント辞書を検出する', () => {
    const pdf = `
10 0 obj
<< /Type /Font /Subtype /Type0 /BaseFont /NotoSansJP-Regular
   /Encoding /Identity-H
   /ToUnicode 15 0 R
   /DescendantFonts [11 0 R]
>>
endobj
`;
    const result = scanRawFontDicts(toBuffer(pdf));
    expect(result).toHaveLength(1);
    expect(result[0].baseFontName).toBe('NotoSansJP-Regular');
    expect(result[0].hasToUnicode).toBe(true);
  });

  it('ToUnicode なしのフォント辞書を検出する', () => {
    const pdf = `
10 0 obj
<< /Type /Font /Subtype /Type0 /BaseFont /Chalkduster
   /Encoding /Identity-H
   /DescendantFonts [11 0 R]
>>
endobj
`;
    const result = scanRawFontDicts(toBuffer(pdf));
    expect(result).toHaveLength(1);
    expect(result[0].baseFontName).toBe('Chalkduster');
    expect(result[0].hasToUnicode).toBe(false);
  });

  it('サブセットタグ付きの BaseFont を正しく抽出する', () => {
    const pdf = `
10 0 obj
<< /Type /Font /Subtype /Type0 /BaseFont /EOODIA+NotoSansJP-Regular
   /Encoding /Identity-H
   /ToUnicode 15 0 R
   /DescendantFonts [11 0 R]
>>
endobj
`;
    const result = scanRawFontDicts(toBuffer(pdf));
    expect(result).toHaveLength(1);
    expect(result[0].baseFontName).toBe('EOODIA+NotoSansJP-Regular');
    expect(result[0].hasToUnicode).toBe(true);
  });

  it('複数のフォント辞書を検出する', () => {
    const pdf = `
10 0 obj
<< /Type /Font /Subtype /Type0 /BaseFont /FontA
   /ToUnicode 15 0 R
>>
endobj

20 0 obj
<< /Type /Font /Subtype /Type0 /BaseFont /FontB
>>
endobj

30 0 obj
<< /Type /Font /Subtype /TrueType /BaseFont /FontC
   /ToUnicode 35 0 R
>>
endobj
`;
    const result = scanRawFontDicts(toBuffer(pdf));
    expect(result).toHaveLength(3);

    const fontA = result.find((e) => e.baseFontName === 'FontA');
    const fontB = result.find((e) => e.baseFontName === 'FontB');
    const fontC = result.find((e) => e.baseFontName === 'FontC');

    expect(fontA?.hasToUnicode).toBe(true);
    expect(fontB?.hasToUnicode).toBe(false);
    expect(fontC?.hasToUnicode).toBe(true);
  });

  it('CIDFont 子辞書を除外する', () => {
    // CIDFontType0 / CIDFontType2 は DescendantFonts の子辞書であり、
    // 直接 /ToUnicode を持たないため除外する
    const pdf = `
10 0 obj
<< /Type /Font /Subtype /Type0 /BaseFont /ParentFont
   /ToUnicode 15 0 R
   /DescendantFonts [11 0 R]
>>
endobj

11 0 obj
<< /Type /Font /Subtype /CIDFontType0 /BaseFont /ParentFont
   /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 7 >>
>>
endobj
`;
    const result = scanRawFontDicts(toBuffer(pdf));
    expect(result).toHaveLength(1);
    expect(result[0].baseFontName).toBe('ParentFont');
  });

  it('空のバッファで空配列を返す', () => {
    const result = scanRawFontDicts(toBuffer(''));
    expect(result).toHaveLength(0);
  });

  it('フォント辞書のないバッファで空配列を返す', () => {
    const pdf = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
`;
    const result = scanRawFontDicts(toBuffer(pdf));
    expect(result).toHaveLength(0);
  });

  it('同名フォントは ToUnicode ありを優先する', () => {
    const pdf = `
10 0 obj
<< /Type /Font /Subtype /Type0 /BaseFont /SharedFont
>>
endobj

20 0 obj
<< /Type /Font /Subtype /Type0 /BaseFont /SharedFont
   /ToUnicode 25 0 R
>>
endobj
`;
    const result = scanRawFontDicts(toBuffer(pdf));
    expect(result).toHaveLength(1);
    expect(result[0].baseFontName).toBe('SharedFont');
    expect(result[0].hasToUnicode).toBe(true);
  });

  it('ネストした辞書を正しく処理する', () => {
    const pdf = `
10 0 obj
<< /Type /Font /Subtype /Type0 /BaseFont /NestedFont
   /FontDescriptor << /FontName /NestedFont /Flags 4 >>
   /ToUnicode 15 0 R
>>
endobj
`;
    const result = scanRawFontDicts(toBuffer(pdf));
    expect(result).toHaveLength(1);
    expect(result[0].baseFontName).toBe('NestedFont');
    expect(result[0].hasToUnicode).toBe(true);
  });

  it('CIDFontType2 子辞書も除外する', () => {
    const pdf = `
10 0 obj
<< /Type /Font /Subtype /Type0 /BaseFont /MSMincho
   /DescendantFonts [11 0 R]
>>
endobj

11 0 obj
<< /Type /Font /Subtype /CIDFontType2 /BaseFont /MSMincho
   /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 6 >>
>>
endobj
`;
    const result = scanRawFontDicts(toBuffer(pdf));
    expect(result).toHaveLength(1);
    expect(result[0].baseFontName).toBe('MSMincho');
    expect(result[0].hasToUnicode).toBe(false);
  });
});
