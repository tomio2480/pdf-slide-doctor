import type { PdfFontInfo, RawFontEntry } from './types';

/** サブセットタグ (6文字+'+') を除去してフォント名を正規化する */
function stripSubsetTag(name: string): string {
  return name.replace(/^[A-Z]{6}\+/, '');
}

/**
 * pdf.js のフォント情報を raw PDF スキャン結果で補正する.
 *
 * pdf.js は PDF に ToUnicode CMap がなくても内部で合成する場合がある.
 * raw スキャン結果と突き合わせ、pdf.js が合成した ToUnicode を null に補正する.
 *
 * 補正ルール:
 * | pdf.js toUnicode | raw hasToUnicode | 補正結果 |
 * |------------------|------------------|----------|
 * | あり             | false            | null     |
 * | あり             | true             | そのまま |
 * | あり             | 'unknown'        | そのまま |
 * | null             | 任意             | そのまま |
 *
 * raw scan が空配列の場合は補正をスキップする.
 *
 * @param fonts pdf.js から取得したフォント情報
 * @param rawEntries raw PDF パーサーの結果
 * @returns 補正後のフォント情報（新しい配列）
 */
export function refineFontsWithRawScan(
  fonts: PdfFontInfo[],
  rawEntries: RawFontEntry[],
): PdfFontInfo[] {
  // raw scan が空の場合は補正をスキップ
  if (rawEntries.length === 0) {
    return fonts;
  }

  // raw entries をフォント名でインデックス化（サブセットタグ除去後）
  const rawMap = new Map<string, RawFontEntry>();
  for (const entry of rawEntries) {
    const stripped = stripSubsetTag(entry.baseFontName);
    // 同名が複数ある場合、hasToUnicode=true を優先（scanRawFontDicts で統合済みだが念のため）
    const existing = rawMap.get(stripped);
    if (!existing || entry.hasToUnicode === true) {
      rawMap.set(stripped, entry);
    }
    // 元の名前（タグ付き）でもインデックス
    rawMap.set(entry.baseFontName, entry);
  }

  return fonts.map((font) => {
    // toUnicode が null なら補正不要
    if (font.toUnicode === null) {
      return font;
    }

    // raw scan でフォントを検索（完全一致 → サブセットタグ除去後で検索）
    const rawEntry =
      rawMap.get(font.name) ?? rawMap.get(stripSubsetTag(font.name));

    if (!rawEntry) {
      // raw scan に該当フォントがない場合はそのまま
      return font;
    }

    if (rawEntry.hasToUnicode === false) {
      // PDF に /ToUnicode がないのに pdf.js が合成した → null に補正
      return { ...font, toUnicode: null };
    }

    // hasToUnicode が true または 'unknown' ならそのまま
    return font;
  });
}
