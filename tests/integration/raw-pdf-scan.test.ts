import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { scanRawFontDicts } from '../../src/analyzer/raw-pdf-parser';
import { getFixturePdfFiles, getExpectedDir } from './analyze-helpers';
import type { PdffontsEntry } from '../utils/pdffonts-parser';

/** pdffonts 期待結果 JSON の型 */
interface PdffontsExpected {
  pdffontsVersion: string;
  fileName: string;
  fonts: PdffontsEntry[];
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

describe('raw PDF scan と pdffonts の突き合わせ', () => {
  const pdfFiles = getFixturePdfFiles();
  const expectedDir = getExpectedDir();

  if (pdfFiles.length === 0 || !fs.existsSync(expectedDir)) {
    it.skip('tests/fixtures/ に PDF または expected/ がありません', () => {});
    return;
  }

  for (const pdfFile of pdfFiles) {
    const fileName = path.basename(pdfFile);
    const expected = loadExpected(fileName);

    if (!expected) {
      it.skip(`${fileName}: pdffonts 期待結果がありません`, () => {});
      continue;
    }

    it(`${fileName}: raw scan のフォント検出数が妥当である`, () => {
      const buffer = fs.readFileSync(pdfFile).buffer;
      const rawEntries = scanRawFontDicts(buffer);

      // raw scan で何かしらのフォントが検出されること
      expect(rawEntries.length).toBeGreaterThan(0);

      // pdffonts のフォント数（CIDFont 子辞書を除く）と大幅に乖離しないこと
      const pdffontsNonCID = expected.fonts.filter(
        (f) => !f.type.includes('CID'),
      );
      // CID フォントは親の Type0 辞書のみ検出される
      // pdffonts のユニークフォント名と比較する
      const pdffontsNames = new Set(
        expected.fonts.map((f) => stripSubsetTag(f.name)),
      );
      const rawNames = new Set(
        rawEntries.map((e) => stripSubsetTag(e.baseFontName)),
      );

      // raw scan で pdffonts の全フォントをカバーしていること
      for (const name of pdffontsNames) {
        expect(
          rawNames.has(name),
          `pdffonts のフォント「${name}」が raw scan で検出されていません（${fileName}）`,
        ).toBe(true);
      }

      console.log(
        `  [INFO] ${fileName}: pdffonts=${pdffontsNames.size} unique, pdffonts(non-CID)=${pdffontsNonCID.length}, raw=${rawEntries.length}`,
      );
    });

    it(`${fileName}: uni=no のフォントが raw scan で hasToUnicode=false`, () => {
      const buffer = fs.readFileSync(pdfFile).buffer;
      const rawEntries = scanRawFontDicts(buffer);

      // pdffonts で uni=no のフォント
      const uniNoFonts = expected.fonts
        .filter((f) => !f.uni)
        .map((f) => stripSubsetTag(f.name));

      for (const fontName of uniNoFonts) {
        const rawEntry = rawEntries.find(
          (e) => stripSubsetTag(e.baseFontName) === fontName,
        );

        if (!rawEntry) continue; // raw scan で検出できなかった場合はスキップ

        expect(
          rawEntry.hasToUnicode,
          `pdffonts で uni=no のフォント「${fontName}」が raw scan で hasToUnicode=true（${fileName}）`,
        ).toBe(false);
      }
    });

    it(`${fileName}: uni=yes のフォントが raw scan で hasToUnicode=true`, () => {
      const buffer = fs.readFileSync(pdfFile).buffer;
      const rawEntries = scanRawFontDicts(buffer);

      // pdffonts で uni=yes のフォント
      const uniYesFonts = expected.fonts
        .filter((f) => f.uni)
        .map((f) => stripSubsetTag(f.name));

      for (const fontName of uniYesFonts) {
        const rawEntry = rawEntries.find(
          (e) => stripSubsetTag(e.baseFontName) === fontName,
        );

        if (!rawEntry) continue;

        expect(
          rawEntry.hasToUnicode,
          `pdffonts で uni=yes のフォント「${fontName}」が raw scan で hasToUnicode=false（${fileName}）`,
        ).toBe(true);
      }
    });
  }
});
