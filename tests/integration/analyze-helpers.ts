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

/** analyzePdf の戻り値型 */
export interface AnalysisResult {
  fileName: string;
  fonts: Awaited<ReturnType<typeof extractFonts>>;
  items: DiagnosticItem[];
}

/** PDF ファイルを読み込んで全パターンの診断結果を返す */
export async function analyzePdf(filePath: string): Promise<AnalysisResult> {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const cMapUrl = path.resolve(__dirname, '../../node_modules/pdfjs-dist/cmaps/');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDoc = await (pdfjsLib as any).getDocument({
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
export function getFixturePdfFiles(): string[] {
  if (!fs.existsSync(FIXTURES_DIR)) return [];
  return fs.readdirSync(FIXTURES_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .map((f) => path.join(FIXTURES_DIR, f))
    .sort();
}

/** expected ディレクトリのパスを返す */
export function getExpectedDir(): string {
  return path.resolve(FIXTURES_DIR, 'expected');
}
