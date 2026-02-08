import { stripSubsetTag } from './font-family';

/** シンボルフォント名のパターン */
const SYMBOL_FONT_PATTERN = /^(Wingdings|Webdings|Symbol|ZapfDingbats|Dingbats)/i;

/**
 * フォント名がシンボルフォント（Wingdings 等）かを判定する.
 * シンボルフォントは設計仕様として Private Use Area を使用するため、
 * パターン C（康煕部首誤マッピング）の検出対象から除外する.
 */
export function isSymbolFont(fontName: string): boolean {
  const stripped = stripSubsetTag(fontName);
  return SYMBOL_FONT_PATTERN.test(stripped);
}
