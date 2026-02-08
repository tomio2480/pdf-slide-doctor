import type { PdfFontInfo, DiagnosticItem } from './types';

const BOLD_PATTERN = /Bold|Heavy|Black|W[6-9](?:\b|$)/i;

export function isBoldFontName(name: string): boolean {
  return BOLD_PATTERN.test(name);
}

export function detectBoldUnembedded(fonts: PdfFontInfo[]): DiagnosticItem[] {
  return fonts
    .filter((font) => font.missingFile && isBoldFontName(font.name))
    .map((font) => ({
      patternId: 'H' as const,
      riskLevel: 'high' as const,
      fontName: font.name,
      pageNumbers: Array.from(font.pageNumbers).sort((a, b) => a - b),
      message: `Bold フォント「${font.name}」が PDF に埋め込まれていません`,
      remedy: 'PDF 作成元でフォント埋め込み設定を有効にして再出力してください',
    }));
}
