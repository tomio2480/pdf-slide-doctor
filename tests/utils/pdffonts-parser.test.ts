import { describe, it, expect } from 'vitest';
import { parsePdffontsOutput, type PdffontsEntry } from './pdffonts-parser';

describe('parsePdffontsOutput', () => {
  it('標準的な pdffonts 出力をパースする', () => {
    const output = [
      'name                                 type              encoding         emb sub uni object ID',
      '------------------------------------ ----------------- ---------------- --- --- --- ---------',
      'EOODIA+NotoSansJP-Regular            CID TrueType      Identity-H       yes yes yes     12  0',
    ].join('\n');

    const result = parsePdffontsOutput(output);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual<PdffontsEntry>({
      name: 'EOODIA+NotoSansJP-Regular',
      type: 'CID TrueType',
      encoding: 'Identity-H',
      emb: true,
      sub: true,
      uni: true,
      objectId: '12  0',
    });
  });

  it('uni=no のフォントを正しくパースする', () => {
    const output = [
      'name                                 type              encoding         emb sub uni object ID',
      '------------------------------------ ----------------- ---------------- --- --- --- ---------',
      'UXHFXI+HiraginoSans-W6               CID Type 0C       Identity-H       yes yes no      15  0',
    ].join('\n');

    const result = parsePdffontsOutput(output);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('UXHFXI+HiraginoSans-W6');
    expect(result[0].type).toBe('CID Type 0C');
    expect(result[0].uni).toBe(false);
    expect(result[0].emb).toBe(true);
  });

  it('emb=no のフォントを正しくパースする', () => {
    const output = [
      'name                                 type              encoding         emb sub uni object ID',
      '------------------------------------ ----------------- ---------------- --- --- --- ---------',
      'Arial                                TrueType          WinAnsiEncoding  no  no  no       8  0',
    ].join('\n');

    const result = parsePdffontsOutput(output);
    expect(result).toHaveLength(1);
    expect(result[0].emb).toBe(false);
    expect(result[0].sub).toBe(false);
    expect(result[0].uni).toBe(false);
  });

  it('複数フォントをパースする', () => {
    const output = [
      'name                                 type              encoding         emb sub uni object ID',
      '------------------------------------ ----------------- ---------------- --- --- --- ---------',
      'NOYXBE+MeiryoUI-Bold                 CID TrueType      Identity-H       yes yes yes     10  0',
      'IMTPGJ+MeiryoUI                      CID TrueType      Identity-H       yes yes yes     14  0',
      'NCBVFV+ArialMT                       TrueType          WinAnsiEncoding  yes yes yes     22  0',
    ].join('\n');

    const result = parsePdffontsOutput(output);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('NOYXBE+MeiryoUI-Bold');
    expect(result[1].name).toBe('IMTPGJ+MeiryoUI');
    expect(result[2].name).toBe('NCBVFV+ArialMT');
    expect(result[2].type).toBe('TrueType');
    expect(result[2].encoding).toBe('WinAnsiEncoding');
  });

  it('空の出力を処理する', () => {
    const output = [
      'name                                 type              encoding         emb sub uni object ID',
      '------------------------------------ ----------------- ---------------- --- --- --- ---------',
    ].join('\n');

    const result = parsePdffontsOutput(output);
    expect(result).toHaveLength(0);
  });

  it('TrueType (CID) タイプを正しくパースする', () => {
    const output = [
      'name                                 type              encoding         emb sub uni object ID',
      '------------------------------------ ----------------- ---------------- --- --- --- ---------',
      'AAAAAB+AppleColorEmoji               TrueType (CID)    Identity-H       yes yes yes     30  0',
    ].join('\n');

    const result = parsePdffontsOutput(output);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('TrueType (CID)');
  });

  it('Type 1 タイプを正しくパースする', () => {
    const output = [
      'name                                 type              encoding         emb sub uni object ID',
      '------------------------------------ ----------------- ---------------- --- --- --- ---------',
      'ABCDEF+Symbol                        Type 1            Builtin          yes yes no       5  0',
    ].join('\n');

    const result = parsePdffontsOutput(output);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Type 1');
    expect(result[0].encoding).toBe('Builtin');
  });
});
