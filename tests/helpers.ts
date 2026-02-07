import type { PdfFontInfo, ToUnicodeMap } from '../src/analyzer/types';

export function createFont(overrides: Partial<PdfFontInfo> = {}): PdfFontInfo {
  return {
    loadedName: 'g_d0_f1',
    name: 'TestFont',
    type: 'Type0',
    subtype: 'CIDFontType0',
    composite: true,
    missingFile: false,
    bold: false,
    toUnicode: null,
    pageNumbers: new Set([1]),
    ...overrides,
  };
}

export function createMockToUnicode(
  mapping: Record<number, string>,
): ToUnicodeMap {
  return {
    forEach(callback: (charCode: number, unicodeStr: string | number) => void): void {
      for (const [code, str] of Object.entries(mapping)) {
        callback(Number(code), str);
      }
    },
  };
}
