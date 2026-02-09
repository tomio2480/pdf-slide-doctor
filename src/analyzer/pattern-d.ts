import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextContentItem, DiagnosticItem } from './types';

/** 文字間スペース挿入パターンの正規表現（1 文字 + スペースの繰り返し） */
const SPACED_LETTERS_PATTERN = /^(\S )+\S$/;

/** D-2 判定の閾値: 1 文字 TextItem の割合 */
const SINGLE_CHAR_THRESHOLD = 0.5;

/** D-2 判定の最小 TextItem 数 */
const MIN_ITEMS_PER_PAGE = 5;

/** 全ページの TextItem を走査して TextContentItem 配列を返す */
export async function extractTextContentItems(
  pdfDoc: PDFDocumentProxy,
): Promise<TextContentItem[]> {
  const results: TextContentItem[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      results.push({
        str: item.str,
        fontName: item.fontName,
        pageNumber: i,
      });
    }

    page.cleanup();
  }

  return results;
}

/** D-1: 文字間スペース挿入パターンを検出する */
export function detectSpacedLetters(
  items: TextContentItem[],
): DiagnosticItem[] {
  const fontMap = new Map<
    string,
    { pageNumbers: Set<number>; examples: string[] }
  >();

  for (const item of items) {
    if (item.str.length < 3) continue;
    if (!SPACED_LETTERS_PATTERN.test(item.str)) continue;

    let data = fontMap.get(item.fontName);
    if (!data) {
      data = { pageNumbers: new Set(), examples: [] };
      fontMap.set(item.fontName, data);
    }
    data.pageNumbers.add(item.pageNumber);
    if (data.examples.length < 5) {
      data.examples.push(item.str);
    }
  }

  return Array.from(fontMap.entries()).map(([fontName, data]) => ({
    patternId: 'D' as const,
    riskLevel: 'medium' as const,
    fontName,
    pageNumbers: Array.from(data.pageNumbers).sort((a, b) => a - b),
    message: `フォント「${fontName}」で文字間にスペースが挿入されたテキストが検出されました。文字間の距離設定により、テキスト抽出や検索に影響が出ている可能性があります`,
    remedy:
      'PDF 作成元で文字間（letter-spacing）の距離設定を初期状態に戻して再出力することを検討してください',
    details: {
      spacedItemCount: data.examples.length,
      examples: data.examples,
    },
  }));
}

/** D-2: 1 文字 TextItem の大量出現を検出する */
export function detectSingleCharItems(
  items: TextContentItem[],
): DiagnosticItem[] {
  // ページ別に集計する
  const pageStats = new Map<
    number,
    { total: number; singleChar: number; examples: string[] }
  >();

  for (const item of items) {
    if (item.str === '') continue;

    let stats = pageStats.get(item.pageNumber);
    if (!stats) {
      stats = { total: 0, singleChar: 0, examples: [] };
      pageStats.set(item.pageNumber, stats);
    }
    stats.total++;
    if (item.str.length === 1) {
      stats.singleChar++;
      if (stats.examples.length < 5) {
        stats.examples.push(item.str);
      }
    }
  }

  const detectedPages: number[] = [];
  const allExamples: string[] = [];

  for (const [pageNumber, stats] of pageStats) {
    if (stats.total < MIN_ITEMS_PER_PAGE) continue;
    if (stats.singleChar / stats.total < SINGLE_CHAR_THRESHOLD) continue;
    detectedPages.push(pageNumber);
    for (const ex of stats.examples) {
      if (allExamples.length < 5) allExamples.push(ex);
    }
  }

  if (detectedPages.length === 0) return [];

  return [
    {
      patternId: 'D' as const,
      riskLevel: 'medium' as const,
      fontName: '(複数フォント)',
      pageNumbers: detectedPages.sort((a, b) => a - b),
      message: `1 文字ずつ個別に配置されたテキストが検出されました。文字の装飾的配置により、テキスト抽出や検索に影響が出ている可能性があります`,
      remedy:
        'PDF 作成元で文字の配置方法（弧状配置や個別配置など）を見直すことを検討してください',
      details: {
        detectedPageCount: detectedPages.length,
        examples: allExamples,
      },
    },
  ];
}
