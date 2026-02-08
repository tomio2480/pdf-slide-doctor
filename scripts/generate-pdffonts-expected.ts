/**
 * pdffonts コマンドの出力を JSON 化して tests/fixtures/expected/ に保存するスクリプト.
 * 実行には pdffonts (poppler-utils) が必要.
 *
 * 使用方法:
 *   npx tsx scripts/generate-pdffonts-expected.ts
 *
 * 前提:
 *   - tests/fixtures/ に PDF ファイルが配置されていること
 *   - pdffonts コマンドが PATH 上で利用可能であること
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { parsePdffontsOutput } from '../tests/utils/pdffonts-parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../tests/fixtures');
const EXPECTED_DIR = path.resolve(FIXTURES_DIR, 'expected');

/** pdffonts のバージョンを取得する */
function getPdffontsVersion(): string {
  try {
    const output = execSync('pdffonts -v 2>&1', { encoding: 'utf-8' });
    const match = output.match(/pdffonts version ([\d.]+)/);
    if (match) return `poppler ${match[1]}`;
    // poppler のバージョン形式が異なる場合
    const altMatch = output.match(/poppler ([\d.]+)/i);
    if (altMatch) return `poppler ${altMatch[1]}`;
    return output.trim().split('\n')[0];
  } catch {
    return 'unknown';
  }
}

/** 1 つの PDF ファイルについて pdffonts を実行し、結果を JSON で保存する */
function processFile(pdfPath: string): void {
  const fileName = path.basename(pdfPath);
  console.log(`Processing: ${fileName}`);

  let rawOutput: string;
  try {
    rawOutput = execSync(`pdffonts "${pdfPath}"`, { encoding: 'utf-8' });
  } catch (err: unknown) {
    const execErr = err as { stderr?: string };
    console.error(`  Error: ${execErr.stderr ?? String(err)}`);
    return;
  }

  const fonts = parsePdffontsOutput(rawOutput);

  const result = {
    pdffontsVersion: getPdffontsVersion(),
    fileName,
    generatedAt: new Date().toISOString(),
    fonts: fonts.map((f) => ({
      name: f.name,
      type: f.type,
      encoding: f.encoding,
      emb: f.emb,
      sub: f.sub,
      uni: f.uni,
      objectId: f.objectId,
    })),
  };

  const jsonPath = path.join(EXPECTED_DIR, `${fileName}.pdffonts.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  console.log(`  Saved: ${path.relative(process.cwd(), jsonPath)} (${fonts.length} fonts)`);
}

function main(): void {
  // pdffonts の存在確認
  try {
    execSync('pdffonts -v 2>&1', { encoding: 'utf-8' });
  } catch {
    console.error('Error: pdffonts command not found.');
    console.error('Install poppler-utils: sudo apt-get install -y poppler-utils');
    process.exit(1);
  }

  // fixtures ディレクトリの確認
  if (!fs.existsSync(FIXTURES_DIR)) {
    console.error(`Error: ${FIXTURES_DIR} does not exist.`);
    process.exit(1);
  }

  // expected ディレクトリの作成
  fs.mkdirSync(EXPECTED_DIR, { recursive: true });

  // PDF ファイルの処理
  const pdfFiles = fs.readdirSync(FIXTURES_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort();

  if (pdfFiles.length === 0) {
    console.error('Error: No PDF files found in tests/fixtures/');
    process.exit(1);
  }

  console.log(`pdffonts version: ${getPdffontsVersion()}`);
  console.log(`Processing ${pdfFiles.length} PDF files...\n`);

  for (const file of pdfFiles) {
    processFile(path.join(FIXTURES_DIR, file));
  }

  console.log('\nDone.');
}

main();
