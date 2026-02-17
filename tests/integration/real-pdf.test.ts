import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import { analyzePdf, getFixturePdfFiles } from './analyze-helpers';
import type { AnalysisResult } from './analyze-helpers';

describe('実 PDF のインテグレーションテスト', () => {
  const pdfFiles = getFixturePdfFiles();

  if (pdfFiles.length === 0) {
    it.skip('tests/fixtures/ に PDF ファイルがありません', () => {});
    return;
  }

  for (const pdfFile of pdfFiles) {
    const fileName = path.basename(pdfFile);

    describe(fileName, () => {
      let result: AnalysisResult;

      beforeAll(async () => {
        result = await analyzePdf(pdfFile);
      }, 30_000);

      it('フォント抽出が成功する', () => {
        expect(result.fonts.length).toBeGreaterThan(0);
      });

      it('診断結果を出力する', () => {
        // 診断結果をコンソールに出力（デバッグ用）
        console.log(`\n=== ${fileName} ===`);
        console.log(`フォント数: ${result.fonts.length}`);
        for (const font of result.fonts) {
          console.log(
            `  - ${font.name} | type=${font.type} | composite=${font.composite} | missingFile=${font.missingFile} | toUnicode=${font.toUnicode ? 'あり' : 'なし'} | pages=${Array.from(font.pageNumbers).join(',')}`,
          );
        }
        console.log(`検出項目数: ${result.items.length}`);
        for (const item of result.items) {
          console.log(
            `  [${item.patternId}] ${item.riskLevel} | ${item.fontName} | ${item.message}`,
          );
        }

        // 最低限のアサーション: 解析が正常に完了すること
        expect(result.fonts).toBeDefined();
        expect(result.items).toBeDefined();
      });
    });
  }
});
