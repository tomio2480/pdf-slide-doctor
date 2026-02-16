import type { RawFontEntry } from './types';

/**
 * PDF バイナリをテキストスキャンし、フォント辞書から /ToUnicode キーの有無を判定する.
 *
 * PDF バイナリを Latin-1 でデコードし、/Type /Font パターンを検索して
 * 各フォント辞書の /BaseFont と /ToUnicode の有無を抽出する.
 * オブジェクトストリーム内のフォント辞書は検出できない.
 *
 * @param buffer PDF ファイルの ArrayBuffer
 * @returns フォント辞書ごとの BaseFont 名と ToUnicode 有無の配列
 */
export function scanRawFontDicts(buffer: ArrayBuffer): RawFontEntry[] {
  const bytes = new Uint8Array(buffer);
  const text = decodeLatin1(bytes);

  if (text.length === 0) return [];

  // /Type /Font を含む辞書を検索する
  const fontDictPattern = /\/Type\s*\/Font\b/g;
  const rawEntries: Array<{ baseFontName: string; hasToUnicode: boolean }> = [];
  let match: RegExpExecArray | null;

  while ((match = fontDictPattern.exec(text)) !== null) {
    const dictStart = findDictStart(text, match.index);
    if (dictStart === -1) continue;

    const dictEnd = findDictEnd(text, dictStart);
    if (dictEnd === -1) continue;

    const dictContent = text.slice(dictStart, dictEnd + 2);

    // CIDFont 子辞書を除外する
    if (isCIDFontDict(dictContent)) continue;

    // BaseFont 名を抽出する
    const baseFontName = extractBaseFont(dictContent);
    if (!baseFontName) continue;

    // /ToUnicode キーの有無を判定する
    const hasToUnicode = dictContent.search(/\/ToUnicode\b/) !== -1;

    rawEntries.push({ baseFontName, hasToUnicode });
  }

  // 同名フォントを統合する（いずれかで ToUnicode ありなら true）
  return mergeEntries(rawEntries);
}

/** Uint8Array を Latin-1 文字列にデコードする */
function decodeLatin1(bytes: Uint8Array): string {
  // TextDecoder('latin1') は 'iso-8859-1' と同等
  const decoder = new TextDecoder('latin1');
  return decoder.decode(bytes);
}

/**
 * 指定位置から前方に走査し、辞書の開始 `<<` を見つける.
 * /Type /Font が辞書内にあるため、その位置から前方に `<<` を探す.
 */
function findDictStart(text: string, typeOffset: number): number {
  // /Type /Font の位置から前方に走査して << を探す
  // ネストした辞書を考慮し、>> と << のバランスを取る
  let depth = 0;
  let i = typeOffset - 1;

  while (i >= 0) {
    if (text[i] === '>' && i > 0 && text[i - 1] === '>') {
      depth++;
      i -= 2;
      continue;
    }
    if (text[i] === '<' && i > 0 && text[i - 1] === '<') {
      if (depth === 0) {
        return i - 1;
      }
      depth--;
      i -= 2;
      continue;
    }
    i--;
  }
  return -1;
}

/**
 * 辞書の開始位置 `<<` から対応する終了 `>>` を見つける.
 * ネストした `<< >>` を考慮する.
 */
function findDictEnd(text: string, dictStart: number): number {
  let depth = 0;
  let i = dictStart;

  while (i < text.length - 1) {
    if (text[i] === '<' && text[i + 1] === '<') {
      depth++;
      i += 2;
      continue;
    }
    if (text[i] === '>' && text[i + 1] === '>') {
      depth--;
      if (depth === 0) {
        return i;
      }
      i += 2;
      continue;
    }
    i++;
  }
  return -1;
}

/** CIDFont 子辞書かどうかを判定する */
function isCIDFontDict(dictContent: string): boolean {
  return /\/Subtype\s*\/CIDFontType[02]/.test(dictContent);
}

/** 辞書から /BaseFont 名を抽出する */
function extractBaseFont(dictContent: string): string | null {
  const match = dictContent.match(/\/BaseFont\s*\/(\S+)/);
  return match ? match[1] : null;
}

/** 同名フォントを統合する（いずれかで ToUnicode ありなら true） */
function mergeEntries(
  entries: Array<{ baseFontName: string; hasToUnicode: boolean }>,
): RawFontEntry[] {
  const map = new Map<string, boolean>();

  for (const entry of entries) {
    const existing = map.get(entry.baseFontName);
    if (existing === undefined) {
      map.set(entry.baseFontName, entry.hasToUnicode);
    } else {
      // いずれかで true なら true にする
      map.set(entry.baseFontName, existing || entry.hasToUnicode);
    }
  }

  return Array.from(map.entries()).map(([baseFontName, hasToUnicode]) => ({
    baseFontName,
    hasToUnicode,
  }));
}
