import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TextRenderingModeInfo, PdfFontInfo, DiagnosticItem } from './types';
import { extractFamilyName } from '../utils/font-family';
import { isBoldFontName } from './pattern-h';

/** OPS 定数 */
const OPS_SET_LINE_WIDTH = 2;
const OPS_SET_FONT = 37;
const OPS_SET_TEXT_RENDERING_MODE = 38;

/**
 * 各ページの OperatorList を走査し Tr=2 の使用箇所を収集する.
 */
export async function extractTextRenderingModes(
  pdfDoc: PDFDocumentProxy,
): Promise<TextRenderingModeInfo[]> {
  const results: TextRenderingModeInfo[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const opList = await page.getOperatorList();

    let currentFont: string | null = null;
    let currentLineWidth: number | null = null;

    for (let j = 0; j < opList.fnArray.length; j++) {
      const fn = opList.fnArray[j];
      const args = opList.argsArray[j];

      if (fn === OPS_SET_LINE_WIDTH) {
        currentLineWidth = args[0] as number;
      } else if (fn === OPS_SET_FONT) {
        currentFont = args[0] as string;
      } else if (fn === OPS_SET_TEXT_RENDERING_MODE) {
        const mode = args[0] as number;
        if (mode === 2 && currentFont !== null) {
          results.push({
            pageNumber: i,
            fontName: currentFont,
            renderingMode: mode,
            lineWidth: currentLineWidth,
          });
        }
      }
    }

    page.cleanup();
  }

  return results;
}

/**
 * TextRenderingModeInfo のリストからフォントごとに統合した診断結果を生成する.
 */
export function detectPseudoBold(
  trInfos: TextRenderingModeInfo[],
  fonts: PdfFontInfo[],
): DiagnosticItem[] {
  const fontMap = new Map<string, {
    pageNumbers: Set<number>;
    lineWidths: Set<number | null>;
  }>();

  for (const info of trInfos) {
    if (info.renderingMode !== 2) continue;

    if (!fontMap.has(info.fontName)) {
      fontMap.set(info.fontName, {
        pageNumbers: new Set(),
        lineWidths: new Set(),
      });
    }
    const entry = fontMap.get(info.fontName)!;
    entry.pageNumbers.add(info.pageNumber);
    entry.lineWidths.add(info.lineWidth);
  }

  return Array.from(fontMap.entries()).map(([fontName, data]) => {
    const familyName = extractFamilyName(fontName);
    const boldInPdf = fonts.some(
      (f) => extractFamilyName(f.name) === familyName && isBoldFontName(f.name),
    );

    let remedy: string;
    if (boldInPdf) {
      remedy = '同 PDF 内に Bold 版が存在します。PDF 作成元で Bold フォントを直接使用して再出力してください';
    } else {
      remedy = 'PDF 作成元で実際の Bold フォントを使用するか、太字の使用を見直してください';
    }

    return {
      patternId: 'F' as const,
      riskLevel: 'medium' as const,
      fontName,
      pageNumbers: Array.from(data.pageNumbers).sort((a, b) => a - b),
      message: `フォント「${fontName}」で疑似ボールド (Tr=2, Fill then Stroke) が使用されています`,
      remedy,
      details: { lineWidths: Array.from(data.lineWidths) },
    };
  });
}
