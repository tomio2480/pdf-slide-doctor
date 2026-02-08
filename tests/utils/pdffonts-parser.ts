/** pdffonts コマンドの 1 フォント分のエントリ */
export interface PdffontsEntry {
  /** フォント名 (例: "EOODIA+NotoSansJP-Regular") */
  name: string;
  /** フォント種別 (例: "CID TrueType", "CID Type 0C", "TrueType") */
  type: string;
  /** エンコーディング (例: "Identity-H", "WinAnsiEncoding") */
  encoding: string;
  /** フォント埋め込み */
  emb: boolean;
  /** サブセット */
  sub: boolean;
  /** ToUnicode CMap */
  uni: boolean;
  /** PDF オブジェクト ID (例: "12  0") */
  objectId: string;
}

/**
 * pdffonts コマンドの出力テキストをパースする.
 * セパレータ行 (--- で始まる行) からカラム位置を特定し、各行をパースする.
 */
export function parsePdffontsOutput(output: string): PdffontsEntry[] {
  const lines = output.split('\n');

  // セパレータ行を探す
  const separatorIndex = lines.findIndex((line) => line.startsWith('---'));
  if (separatorIndex < 0) return [];

  const separator = lines[separatorIndex];

  // セパレータ行からカラム境界位置を計算する
  const columns = parseColumnPositions(separator);
  if (columns.length < 7) return [];

  const entries: PdffontsEntry[] = [];

  for (let i = separatorIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;

    const fields = columns.map(([start, end]) => line.substring(start, end).trim());

    entries.push({
      name: fields[0],
      type: fields[1],
      encoding: fields[2],
      emb: fields[3] === 'yes',
      sub: fields[4] === 'yes',
      uni: fields[5] === 'yes',
      objectId: fields[6],
    });
  }

  return entries;
}

/**
 * セパレータ行からカラムの開始・終了位置を計算する.
 * セパレータ行は "---- ---- ----" のような形式で、
 * ダッシュの連続がカラムの開始位置を表す.
 * 各カラムの終了位置は次のカラムの開始位置とする.
 */
function parseColumnPositions(separator: string): [number, number][] {
  const starts: number[] = [];
  let i = 0;

  while (i < separator.length) {
    // ダッシュの開始位置を探す
    if (separator[i] !== '-') {
      i++;
      continue;
    }

    starts.push(i);

    // ダッシュの終了位置をスキップ
    while (i < separator.length && separator[i] === '-') {
      i++;
    }

    // スペースをスキップ
    while (i < separator.length && separator[i] === ' ') {
      i++;
    }
  }

  // 各カラムの範囲: 開始位置 〜 次のカラムの開始位置（最後は行末まで）
  return starts.map((start, idx) => {
    const end = idx < starts.length - 1 ? starts[idx + 1] : Infinity;
    return [start, end] as [number, number];
  });
}
