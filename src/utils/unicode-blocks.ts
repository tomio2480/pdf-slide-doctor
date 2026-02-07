/**
 * 指定された Unicode コードポイントが低優先ブロックに属するかを判定する.
 * xdvipdfmx の is_PUA_or_presentation ロジックに基づく.
 */
export function isLowPriorityUnicode(codePoint: number): boolean {
  return (
    (codePoint >= 0x2E80 && codePoint <= 0x2EF3) ||
    (codePoint >= 0x2F00 && codePoint <= 0x2FD5) ||
    (codePoint >= 0xE000 && codePoint <= 0xF8FF) ||
    (codePoint >= 0xFB00 && codePoint <= 0xFB4F) ||
    (codePoint >= 0xF900 && codePoint <= 0xFAFF) ||
    (codePoint >= 0x2F800 && codePoint <= 0x2FA1F) ||
    (codePoint >= 0xF0000 && codePoint <= 0xFFFFD) ||
    (codePoint >= 0x100000 && codePoint <= 0x10FFFD) ||
    codePoint === 0x00AD
  );
}
