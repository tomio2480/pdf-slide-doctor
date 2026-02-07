import type { PdfFontInfo, DiagnosticItem } from './types';

export function detectMissingToUnicode(fonts: PdfFontInfo[]): DiagnosticItem[] {
  return fonts
    .filter((font) => font.composite === true && !font.toUnicode)
    .map((font) => ({
      patternId: 'B' as const,
      riskLevel: 'high' as const,
      fontName: font.name,
      pageNumbers: Array.from(font.pageNumbers).sort((a, b) => a - b),
      message: `フォント「${font.name}」に ToUnicode CMap がありません`,
      remedy: 'PDF 作成ツールの設定で ToUnicode CMap の出力を有効にしてください',
    }));
}
