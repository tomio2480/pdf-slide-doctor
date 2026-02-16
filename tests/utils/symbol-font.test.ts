import { describe, it, expect } from 'vitest';
import { isSymbolFont } from '../../src/utils/symbol-font';

describe('isSymbolFont', () => {
  it('Wingdings-Regular をシンボルフォントと判定する', () => {
    expect(isSymbolFont('Wingdings-Regular')).toBe(true);
  });

  it('サブセットタグ付き Wingdings をシンボルフォントと判定する', () => {
    expect(isSymbolFont('EECUUG+Wingdings-Regular')).toBe(true);
  });

  it('Wingdings 2 をシンボルフォントと判定する', () => {
    expect(isSymbolFont('Wingdings2')).toBe(true);
  });

  it('Wingdings 3 をシンボルフォントと判定する', () => {
    expect(isSymbolFont('Wingdings3')).toBe(true);
  });

  it('Webdings をシンボルフォントと判定する', () => {
    expect(isSymbolFont('Webdings')).toBe(true);
  });

  it('Symbol をシンボルフォントと判定する', () => {
    expect(isSymbolFont('Symbol')).toBe(true);
  });

  it('ZapfDingbats をシンボルフォントと判定する', () => {
    expect(isSymbolFont('ZapfDingbats')).toBe(true);
  });

  it('Dingbats をシンボルフォントと判定する', () => {
    expect(isSymbolFont('Dingbats')).toBe(true);
  });

  it('通常の日本語フォントはシンボルフォントではない', () => {
    expect(isSymbolFont('AAAAAB+HiraKakuProN-W6')).toBe(false);
  });

  it('ArialMT はシンボルフォントではない', () => {
    expect(isSymbolFont('ArialMT')).toBe(false);
  });

  it('空文字列はシンボルフォントではない', () => {
    expect(isSymbolFont('')).toBe(false);
  });
});
