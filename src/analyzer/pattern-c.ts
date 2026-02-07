import type { PdfFontInfo, DiagnosticItem } from './types';
import { isLowPriorityUnicode } from '../utils/unicode-blocks';

export function detectKangxiMismapping(fonts: PdfFontInfo[]): DiagnosticItem[] {
  const results: DiagnosticItem[] = [];

  for (const font of fonts) {
    if (!font.composite || !font.toUnicode) continue;

    let lowPriorityCount = 0;
    const examples: string[] = [];

    font.toUnicode.forEach((_charCode: number, unicodeStr: string) => {
      if (!unicodeStr || unicodeStr.length === 0) return;
      const codePoint = unicodeStr.codePointAt(0);
      if (codePoint !== undefined && isLowPriorityUnicode(codePoint)) {
        lowPriorityCount++;
        if (examples.length < 5) {
          examples.push(
            `CID ${_charCode} → U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
          );
        }
      }
    });

    if (lowPriorityCount > 0) {
      results.push({
        patternId: 'C',
        riskLevel: 'medium',
        fontName: font.name,
        pageNumbers: Array.from(font.pageNumbers).sort((a, b) => a - b),
        message: `フォント「${font.name}」の ToUnicode CMap に康煕部首等への誤マッピングが ${lowPriorityCount} 件あります`,
        remedy: 'pdf-fix-tuc 等のツールで ToUnicode CMap を修正できます',
        details: { lowPriorityCount, examples },
      });
    }
  }

  return results;
}
