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
      remedy: 'ToUnicode CMap の欠落はフォント形式ではなく PDF 出力元アプリケーションに起因します。別のアプリケーションで PDF を再出力するか、出力設定を確認してください',
      details: {
        fontType: font.type ?? 'unknown',
        fontSubtype: font.subtype ?? 'unknown',
      },
    }));
}
