import type { PdfFontInfo, DiagnosticItem } from './types';

export function detectUnembeddedFonts(fonts: PdfFontInfo[]): DiagnosticItem[] {
  return fonts
    .filter((font) => font.missingFile)
    .map((font) => ({
      patternId: 'A' as const,
      riskLevel: 'high' as const,
      fontName: font.name,
      pageNumbers: Array.from(font.pageNumbers).sort((a, b) => a - b),
      message: `フォント「${font.name}」が PDF に埋め込まれていません`,
      remedy: 'PDF 作成元でフォント埋め込み設定を有効にして再出力してください',
    }));
}
