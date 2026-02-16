import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextContentItem, DiagnosticItem } from './types';

/** 文字間スペース挿入パターンの正規表現（4 文字以上: 非空白+スペースが 3 回以上 + 末尾 1 文字） */
const SPACED_LETTERS_PATTERN = /^(\S ){3,}\S$/;

/** D-2: 弧状配置判定の y 座標差の閾値（pt） */
const ARC_Y_THRESHOLD = 2;

/** D-2: 弧状配置判定の最小連続文字数 */
const ARC_MIN_SEQUENCE = 3;

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
        y: item.transform[5],
        hasEOL: item.hasEOL,
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
    if (item.str.length < 7) continue;
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

/** D-2: 弧状配置（各文字が異なる y 座標に配置）を検出する */
export function detectArcLayoutItems(
  items: TextContentItem[],
): DiagnosticItem[] {
  const detectedPages = new Set<number>();
  const allExamples: string[] = [];

  // ページ別にグループ化
  const pageGroups = new Map<number, TextContentItem[]>();
  for (const item of items) {
    let group = pageGroups.get(item.pageNumber);
    if (!group) {
      group = [];
      pageGroups.set(item.pageNumber, group);
    }
    group.push(item);
  }

  for (const [pageNumber, pageItems] of pageGroups) {
    const sequences = findArcSequences(pageItems);
    if (sequences.length > 0) {
      detectedPages.add(pageNumber);
      for (const seq of sequences) {
        if (allExamples.length < 5) {
          allExamples.push(seq);
        }
      }
    }
  }

  if (detectedPages.size === 0) return [];

  return [
    {
      patternId: 'D' as const,
      riskLevel: 'medium' as const,
      fontName: '(弧状配置)',
      pageNumbers: Array.from(detectedPages).sort((a, b) => a - b),
      message:
        '文字が弧状または装飾的に個別配置されたテキストが検出されました。テキスト抽出や検索に影響が出ている可能性があります',
      remedy:
        'PDF 作成元で文字の装飾的な配置（弧状配置や個別回転など）を見直すことを検討してください',
      details: {
        examples: allExamples,
      },
    },
  ];
}

/** ページ内の TextItem から弧状配置シーケンスを検出する */
function findArcSequences(pageItems: TextContentItem[]): string[] {
  const sequences: string[] = [];
  let currentSeq: string[] = [];
  let prevY: number | null = null;

  for (const item of pageItems) {
    // 空文字列の hasEOL アイテムはスキップ
    if (item.str === '' && item.hasEOL) continue;

    // 非空白の 1 文字 TextItem のみ対象
    if (item.str.length === 1 && item.str.trim() !== '') {
      if (prevY === null) {
        // シーケンス開始
        currentSeq = [item.str];
        prevY = item.y;
      } else if (Math.abs(item.y - prevY) >= ARC_Y_THRESHOLD) {
        // y 座標が変化 → 弧状シーケンス継続
        currentSeq.push(item.str);
        prevY = item.y;
      } else {
        // y 座標が同じ → 弧状ではない、シーケンス打ち切り
        flushSequence(currentSeq, sequences);
        currentSeq = [item.str];
        prevY = item.y;
      }
    } else {
      // 非 1 文字 TextItem → シーケンス打ち切り
      flushSequence(currentSeq, sequences);
      currentSeq = [];
      prevY = null;
    }
  }

  // 最後のシーケンスを処理
  flushSequence(currentSeq, sequences);

  return sequences;
}

/** 最小長以上のシーケンスを結合文字列として追加する */
function flushSequence(seq: string[], out: string[]): void {
  if (seq.length >= ARC_MIN_SEQUENCE) {
    out.push(seq.join(''));
  }
}
