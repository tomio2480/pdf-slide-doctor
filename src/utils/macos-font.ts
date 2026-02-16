import { stripSubsetTag } from './font-family';

/**
 * macOS 標準 CJK フォントの名前パターン.
 * Keynote 出力 PDF の判定に使用する.
 */
const MACOS_CJK_FONT_PATTERN =
  /^(HiraKaku|HiraginoSans|HiraMin|HiraMaruPro|Klee|TsukuARdGothic|TsukuBRdGothic|ToppanBunkyuMincho|ToppanBunkyuGothic)/;

/**
 * フォント名が macOS 標準 CJK フォントであるかを判定する.
 */
export function isMacOSCJKFont(fontName: string): boolean {
  const stripped = stripSubsetTag(fontName);
  return MACOS_CJK_FONT_PATTERN.test(stripped);
}
