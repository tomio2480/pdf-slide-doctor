/**
 * サブセットタグ（例: EOODIA+）をフォント名から除去する.
 * サブセットタグは大文字 6 文字 + '+' の形式.
 */
export function stripSubsetTag(fontName: string): string {
  return fontName.replace(/^[A-Z]{6}\+/, '');
}

/** フォント名末尾から除去するウェイト名パターン */
const WEIGHT_SUFFIX_PATTERN =
  /-(UltraLight|ExtraLight|ExtraBold|SemiBold|Regular|Bold|Light|Medium|Heavy|Black|Thin|W\d)$/;

/**
 * フォント名からファミリー名を抽出する.
 * サブセットタグとウェイト名サフィックスを除去する.
 */
export function extractFamilyName(fontName: string): string {
  const stripped = stripSubsetTag(fontName);
  return stripped.replace(WEIGHT_SUFFIX_PATTERN, '');
}
