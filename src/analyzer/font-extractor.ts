import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { PdfFontInfo, ToUnicodeMap } from './types';

/** OPS.setFont の値 */
const OPS_SET_FONT = 37;

/**
 * pdf.js の IdentityToUnicodeMap か判定する.
 * 構造化クローン後は { firstChar, lastChar } のみのオブジェクトになる.
 * Identity マッピングは実質的に ToUnicode なしと等価なため除外する.
 */
function isIdentityToUnicodeMap(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false;
  return 'firstChar' in raw && 'lastChar' in raw && !('_map' in raw);
}

/** toUnicode データを ToUnicodeMap インターフェースに正規化する */
function normalizeToUnicode(
  raw: unknown,
): ToUnicodeMap | null {
  if (!raw) return null;

  // IdentityToUnicodeMap は ToUnicode なしとして扱う
  if (isIdentityToUnicodeMap(raw)) return null;

  // forEach メソッドを持つオブジェクト (pdf.js ToUnicodeMap)
  if (typeof raw === 'object' && raw !== null && 'forEach' in raw) {
    const obj = raw as { forEach: (cb: (charCode: number, unicodeStr: string | number) => void) => void };
    if (typeof obj.forEach === 'function') {
      return obj;
    }
  }

  // 構造化クローン後の _map プロパティを持つオブジェクト (pdf.js ToUnicodeMap)
  if (typeof raw === 'object' && raw !== null && '_map' in raw) {
    const mapArray = (raw as { _map: (string | number | undefined)[] })._map;
    if (Array.isArray(mapArray)) {
      return {
        forEach(callback: (charCode: number, unicodeStr: string | number) => void): void {
          for (let i = 0; i < mapArray.length; i++) {
            const value = mapArray[i];
            if (value !== undefined) {
              callback(i, value);
            }
          }
        },
      };
    }
  }

  // プレーンオブジェクト { charCode: unicodeStr }
  if (typeof raw === 'object' && raw !== null) {
    const map = raw as Record<string, string | number>;
    return {
      forEach(callback: (charCode: number, unicodeStr: string | number) => void): void {
        for (const [code, value] of Object.entries(map)) {
          callback(Number(code), value);
        }
      },
    };
  }

  return null;
}

/**
 * PDFDocumentProxy から全ページのフォント情報を抽出する.
 * getDocument() に fontExtraProperties: true を指定していることが前提.
 */
export async function extractFonts(
  pdfDoc: PDFDocumentProxy,
): Promise<PdfFontInfo[]> {
  const fontMap = new Map<string, PdfFontInfo>();

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page: PDFPageProxy = await pdfDoc.getPage(i);
    const opList = await page.getOperatorList();

    // OperatorList から setFont で使用されるフォント ID を収集する
    const fontIds = new Set<string>();
    for (let j = 0; j < opList.fnArray.length; j++) {
      if (opList.fnArray[j] === OPS_SET_FONT) {
        fontIds.add(opList.argsArray[j][0] as string);
      }
    }

    // 収集したフォント ID について commonObjs からフォントデータを取得する
    for (const fontId of fontIds) {
      if (fontMap.has(fontId)) {
        fontMap.get(fontId)!.pageNumbers.add(i);
        continue;
      }

      let fontData: Record<string, unknown>;
      try {
        fontData = page.commonObjs.get(fontId) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (!fontData || typeof fontData !== 'object') continue;

      fontMap.set(fontId, {
        loadedName: (fontData.loadedName as string) ?? fontId,
        name: (fontData.name as string) ?? 'unknown',
        type: fontData.type as string | undefined,
        subtype: fontData.subtype as string | undefined,
        composite: fontData.composite as boolean | undefined,
        missingFile: (fontData.missingFile as boolean) ?? false,
        bold: (fontData.bold as boolean) ?? false,
        toUnicode: normalizeToUnicode(fontData.toUnicode),
        pageNumbers: new Set([i]),
      });
    }

    page.cleanup();
  }

  return Array.from(fontMap.values());
}
