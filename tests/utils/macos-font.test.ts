import { describe, it, expect } from 'vitest';
import { isMacOSCJKFont } from '../../src/utils/macos-font';

describe('isMacOSCJKFont', () => {
  it('HiraKakuProN を macOS CJK フォントと判定する', () => {
    expect(isMacOSCJKFont('HiraKakuProN-W3')).toBe(true);
  });

  it('HiraginoSans を macOS CJK フォントと判定する', () => {
    expect(isMacOSCJKFont('HiraginoSans-W3')).toBe(true);
  });

  it('HiraMinProN を macOS CJK フォントと判定する', () => {
    expect(isMacOSCJKFont('HiraMinProN-W6')).toBe(true);
  });

  it('HiraMaruProN を macOS CJK フォントと判定する', () => {
    expect(isMacOSCJKFont('HiraMaruProN-W4')).toBe(true);
  });

  it('Klee を macOS CJK フォントと判定する', () => {
    expect(isMacOSCJKFont('Klee-Medium')).toBe(true);
  });

  it('TsukuARdGothic を macOS CJK フォントと判定する', () => {
    expect(isMacOSCJKFont('TsukuARdGothic-Regular')).toBe(true);
  });

  it('TsukuBRdGothic を macOS CJK フォントと判定する', () => {
    expect(isMacOSCJKFont('TsukuBRdGothic-Bold')).toBe(true);
  });

  it('ToppanBunkyuMincho を macOS CJK フォントと判定する', () => {
    expect(isMacOSCJKFont('ToppanBunkyuMinchoStdN-Regular')).toBe(true);
  });

  it('ToppanBunkyuGothic を macOS CJK フォントと判定する', () => {
    expect(isMacOSCJKFont('ToppanBunkyuGothicStdN-Regular')).toBe(true);
  });

  it('サブセットタグ付きの HiraKaku を判定する', () => {
    expect(isMacOSCJKFont('ABCDEF+HiraKakuProN-W6')).toBe(true);
  });

  it('MeiryoUI は macOS CJK フォントではない', () => {
    expect(isMacOSCJKFont('MeiryoUI-Bold')).toBe(false);
  });

  it('MSGothic は macOS CJK フォントではない', () => {
    expect(isMacOSCJKFont('MS-Gothic')).toBe(false);
  });

  it('NotoSansJP は macOS CJK フォントではない', () => {
    expect(isMacOSCJKFont('NotoSansJP-Regular')).toBe(false);
  });

  it('ArialMT は macOS CJK フォントではない', () => {
    expect(isMacOSCJKFont('ArialMT')).toBe(false);
  });
});
