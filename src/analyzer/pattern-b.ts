import type { PdfFontInfo, DiagnosticItem } from './types';
import { isMacOSCJKFont } from '../utils/macos-font';

const GENERIC_REMEDY =
  'ToUnicode CMap の欠落はフォント形式ではなく PDF 出力元アプリケーションに起因します。別のアプリケーションで PDF を再出力するか、出力設定を確認してください';

const MACOS_REMEDY =
  'macOS アプリケーションで作成された PDF の可能性があります。印刷メニューから「PostScript として保存」し、生成された PS ファイルをプレビューで PDF に変換すると ToUnicode CMap が付与されます';

/**
 * macOS CJK フォント + CIDFontType0（CFF ベース）を macOS アプリ出力候補とみなす.
 * CIDFontType2（TrueType ベース）は Windows 環境でも使われるため除外する.
 */
function isPossibleMacOSFont(font: PdfFontInfo): boolean {
  return isMacOSCJKFont(font.name) && font.type === 'CIDFontType0';
}

export function detectMissingToUnicode(fonts: PdfFontInfo[]): DiagnosticItem[] {
  return fonts
    .filter((font) => font.composite === true && !font.toUnicode)
    .map((font) => {
      const macos = isPossibleMacOSFont(font);
      return {
        patternId: 'B' as const,
        riskLevel: 'high' as const,
        fontName: font.name,
        pageNumbers: Array.from(font.pageNumbers).sort((a, b) => a - b),
        message: `フォント「${font.name}」に ToUnicode CMap がありません`,
        remedy: macos ? MACOS_REMEDY : GENERIC_REMEDY,
        details: {
          fontType: font.type ?? 'unknown',
          fontSubtype: font.subtype ?? 'unknown',
          ...(macos ? { possibleMacOS: true } : {}),
        },
      };
    });
}
