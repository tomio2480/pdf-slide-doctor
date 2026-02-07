import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
// Node.js 環境では legacy ビルドを使用する
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractFonts } from '../../src/analyzer/font-extractor';
import { extractTextRenderingModes, detectPseudoBold } from '../../src/analyzer/pattern-f';
import { detectUnembeddedFonts } from '../../src/analyzer/pattern-a';
import { detectMissingToUnicode } from '../../src/analyzer/pattern-b';
import { detectKangxiMismapping } from '../../src/analyzer/pattern-c';
import { detectBoldUnembedded } from '../../src/analyzer/pattern-h';
import type { DiagnosticItem } from '../../src/analyzer/types';

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

/** PDF ファイルを読み込んで全パターンの診断結果を返す */
async function analyzePdf(filePath: string): Promise<{
  fileName: string;
  fonts: Awaited<ReturnType<typeof extractFonts>>;
  items: DiagnosticItem[];
}> {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const cMapUrl = path.resolve(__dirname, '../../node_modules/pdfjs-dist/cmaps/');
  const pdfDoc = await pdfjsLib.getDocument({
    data,
    fontExtraProperties: true,
    useSystemFonts: true,
    cMapUrl: cMapUrl + '/',
    cMapPacked: true,
  }).promise;

  const fonts = await extractFonts(pdfDoc);
  const trInfos = await extractTextRenderingModes(pdfDoc);

  // loadedName → name 変換
  const nameMap = new Map(fonts.map((f) => [f.loadedName, f.name]));
  const resolvedTrInfos = trInfos.map((info) => ({
    ...info,
    fontName: nameMap.get(info.fontName) ?? info.fontName,
  }));

  // パターン H を先に検出し、A から除外する
  const patternH = detectBoldUnembedded(fonts);
  const patternHFontNames = new Set(patternH.map((item) => item.fontName));

  const patternA = detectUnembeddedFonts(fonts).filter(
    (item) => !patternHFontNames.has(item.fontName),
  );
  const patternB = detectMissingToUnicode(fonts);
  const patternC = detectKangxiMismapping(fonts);
  const patternF = detectPseudoBold(resolvedTrInfos);

  const items: DiagnosticItem[] = [
    ...patternA,
    ...patternB,
    ...patternC,
    ...patternF,
    ...patternH,
  ];

  pdfDoc.destroy();

  return {
    fileName: path.basename(filePath),
    fonts,
    items,
  };
}

/** fixtures ディレクトリ内の PDF ファイル一覧を取得する */
function getFixturePdfFiles(): string[] {
  if (!fs.existsSync(FIXTURES_DIR)) return [];
  return fs.readdirSync(FIXTURES_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .map((f) => path.join(FIXTURES_DIR, f))
    .sort();
}

describe('実 PDF のインテグレーションテスト', () => {
  const pdfFiles = getFixturePdfFiles();

  if (pdfFiles.length === 0) {
    it.skip('tests/fixtures/ に PDF ファイルがありません', () => {});
    return;
  }

  for (const pdfFile of pdfFiles) {
    const fileName = path.basename(pdfFile);

    it(`${fileName}: フォント抽出が成功する`, async () => {
      const result = await analyzePdf(pdfFile);
      expect(result.fonts.length).toBeGreaterThan(0);
    }, 30_000);

    it(`${fileName}: 診断結果を出力する`, async () => {
      const result = await analyzePdf(pdfFile);

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
      expect(result).toBeDefined();
      expect(result.fonts).toBeDefined();
      expect(result.items).toBeDefined();
    }, 30_000);
  }
});
