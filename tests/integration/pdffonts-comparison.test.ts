import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { analyzePdf, getFixturePdfFiles, getExpectedDir } from './analyze-helpers';
import type { PdffontsEntry } from '../utils/pdffonts-parser';

/** pdffonts 期待結果 JSON の型 */
interface PdffontsExpected {
  pdffontsVersion: string;
  fileName: string;
  fonts: PdffontsEntry[];
}

/** 既知の差異リストの型 */
interface KnownDivergences {
  [fileName: string]: {
    toUnicodeSynthesized: string[];
  };
}

/** サブセットタグ (6文字+'+') を除去してフォント名を正規化する */
function stripSubsetTag(name: string): string {
  return name.replace(/^[A-Z]{6}\+/, '');
}

/** expected ディレクトリから pdffonts JSON を読み込む */
function loadExpected(fileName: string): PdffontsExpected | null {
  const jsonPath = path.join(getExpectedDir(), `${fileName}.pdffonts.json`);
  if (!fs.existsSync(jsonPath)) return null;
  return JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as PdffontsExpected;
}

/** 既知の差異リストを読み込む */
function loadKnownDivergences(): KnownDivergences {
  const jsonPath = path.join(getExpectedDir(), 'known-divergences.json');
  if (!fs.existsSync(jsonPath)) return {};
  return JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as KnownDivergences;
}

describe('pdffonts との突き合わせ検証', () => {
  const pdfFiles = getFixturePdfFiles();
  const expectedDir = getExpectedDir();

  if (pdfFiles.length === 0 || !fs.existsSync(expectedDir)) {
    it.skip('tests/fixtures/ に PDF または expected/ がありません', () => {});
    return;
  }

  const knownDivergences = loadKnownDivergences();

  for (const pdfFile of pdfFiles) {
    const fileName = path.basename(pdfFile);
    const expected = loadExpected(fileName);

    if (!expected) {
      it.skip(`${fileName}: pdffonts 期待結果がありません`, () => {});
      continue;
    }

    it(`${fileName}: emb 列の一致を検証する`, async () => {
      const result = await analyzePdf(pdfFile);

      // pdffonts で emb=no のフォントを抽出する
      const unembeddedInPdffonts = expected.fonts
        .filter((f) => !f.emb)
        .map((f) => stripSubsetTag(f.name));

      // pdf-slide-doctor でパターン A/H として検出されたフォントを抽出する
      const detectedUnembedded = result.items
        .filter((item) => item.patternId === 'A' || item.patternId === 'H')
        .map((item) => stripSubsetTag(item.fontName));

      // emb=no のフォントがすべて検出されているか
      for (const fontName of unembeddedInPdffonts) {
        expect(
          detectedUnembedded.some((d) => d === fontName),
          `pdffonts で emb=no のフォント「${fontName}」がパターン A/H として検出されていません`,
        ).toBe(true);
      }
    }, 30_000);

    it(`${fileName}: uni 列の一致を検証する（既知の差異を除く）`, async () => {
      const result = await analyzePdf(pdfFile);
      const divergences = knownDivergences[fileName]?.toUnicodeSynthesized ?? [];

      // pdffonts で uni=no かつ composite のフォントを抽出する
      const uniNoFonts = expected.fonts
        .filter((f) => !f.uni)
        .map((f) => stripSubsetTag(f.name));

      // pdf-slide-doctor でパターン B として検出されたフォントを抽出する
      const detectedMissingToUnicode = result.items
        .filter((item) => item.patternId === 'B')
        .map((item) => stripSubsetTag(item.fontName));

      // パターン C として検出されたフォント（間接検出）
      const detectedKangxi = result.items
        .filter((item) => item.patternId === 'C')
        .map((item) => stripSubsetTag(item.fontName));

      const undetected: string[] = [];

      for (const fontName of uniNoFonts) {
        // 既知の差異に含まれる場合はスキップ
        if (divergences.includes(fontName)) continue;

        const isDetectedB = detectedMissingToUnicode.some((d) => d === fontName);
        const isDetectedC = detectedKangxi.some((d) => d === fontName);

        if (!isDetectedB && !isDetectedC) {
          undetected.push(fontName);
        }
      }

      if (undetected.length > 0) {
        console.log(
          `  [INFO] ${fileName}: uni=no だが未検出のフォント: ${undetected.join(', ')}`,
        );
      }

      // 既知の差異を除いた未検出フォントがゼロであること
      expect(
        undetected,
        `uni=no のフォントが検出されていません: ${undetected.join(', ')}`,
      ).toHaveLength(0);
    }, 30_000);

    it(`${fileName}: 既知の差異を記録する`, async () => {
      const result = await analyzePdf(pdfFile);
      const divergences = knownDivergences[fileName]?.toUnicodeSynthesized ?? [];

      // pdffonts で uni=no のフォント
      const uniNoFonts = expected.fonts
        .filter((f) => !f.uni)
        .map((f) => stripSubsetTag(f.name));

      // pdf-slide-doctor で toUnicode ありと判定されたフォント
      const fontsWithToUnicode = result.fonts
        .filter((f) => f.toUnicode !== null)
        .map((f) => stripSubsetTag(f.name));

      // uni=no なのに toUnicode ありと判定されたフォント（pdf.js 合成の可能性）
      const synthesized = uniNoFonts.filter((name) =>
        fontsWithToUnicode.some((f) => f === name),
      );

      if (synthesized.length > 0) {
        console.log(`  [DIVERGENCE] ${fileName}: pdf.js が ToUnicode を合成しているフォント:`);
        for (const name of synthesized) {
          const inList = divergences.includes(name) ? '(既知)' : '(未登録)';
          console.log(`    - ${name} ${inList}`);
        }
      }

      // テスト自体は常に通過する（情報記録目的）
      expect(true).toBe(true);
    }, 30_000);
  }
});
