import { describe, it, expect } from 'vitest';
import { stripSubsetTag, extractFamilyName } from '../../src/utils/font-family';

describe('stripSubsetTag', () => {
  it('サブセットタグ付きフォント名からタグを除去する', () => {
    expect(stripSubsetTag('EOODIA+NotoSansJP-Regular')).toBe('NotoSansJP-Regular');
  });

  it('サブセットタグがないフォント名はそのまま返す', () => {
    expect(stripSubsetTag('NotoSansJP-Regular')).toBe('NotoSansJP-Regular');
  });

  it('6文字大文字 + プラスのパターンのみ除去する', () => {
    expect(stripSubsetTag('ABCDEF+MyFont')).toBe('MyFont');
    expect(stripSubsetTag('abcdef+MyFont')).toBe('abcdef+MyFont');
    expect(stripSubsetTag('ABCDE+MyFont')).toBe('ABCDE+MyFont');
  });
});

describe('extractFamilyName', () => {
  it('サブセットタグとウェイト名を除去してファミリー名を返す', () => {
    expect(extractFamilyName('EOODIA+NotoSansJP-Regular')).toBe('NotoSansJP');
  });

  it('-Bold を除去する', () => {
    expect(extractFamilyName('MUFUZY+NotoSansJP-Bold')).toBe('NotoSansJP');
  });

  it('-Light を除去する', () => {
    expect(extractFamilyName('NotoSansJP-Light')).toBe('NotoSansJP');
  });

  it('-Medium を除去する', () => {
    expect(extractFamilyName('NotoSansJP-Medium')).toBe('NotoSansJP');
  });

  it('-Heavy を除去する', () => {
    expect(extractFamilyName('HiraKakuStdN-Heavy')).toBe('HiraKakuStdN');
  });

  it('-Black を除去する', () => {
    expect(extractFamilyName('NotoSansJP-Black')).toBe('NotoSansJP');
  });

  it('-Thin を除去する', () => {
    expect(extractFamilyName('NotoSansJP-Thin')).toBe('NotoSansJP');
  });

  it('-ExtraBold を除去する', () => {
    expect(extractFamilyName('NotoSansJP-ExtraBold')).toBe('NotoSansJP');
  });

  it('-SemiBold を除去する', () => {
    expect(extractFamilyName('NotoSansJP-SemiBold')).toBe('NotoSansJP');
  });

  it('-ExtraLight を除去する', () => {
    expect(extractFamilyName('NotoSansJP-ExtraLight')).toBe('NotoSansJP');
  });

  it('-UltraLight を除去する', () => {
    expect(extractFamilyName('NotoSansJP-UltraLight')).toBe('NotoSansJP');
  });

  it('-W3 などのウェイト番号を除去する', () => {
    expect(extractFamilyName('HiraKakuStdN-W3')).toBe('HiraKakuStdN');
    expect(extractFamilyName('HiraKakuStdN-W8')).toBe('HiraKakuStdN');
  });

  it('ウェイト名がないフォントはそのまま返す', () => {
    expect(extractFamilyName('ZenKurenaido')).toBe('ZenKurenaido');
  });

  it('サブセットタグ + ウェイト名なしのフォント名', () => {
    expect(extractFamilyName('MUFUZY+ZenKurenaido-Regular')).toBe('ZenKurenaido');
  });

  it('空文字列を渡すと空文字列を返す', () => {
    expect(extractFamilyName('')).toBe('');
  });
});
