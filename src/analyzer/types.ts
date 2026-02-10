/** pdf.js から取得したフォント情報 */
export interface PdfFontInfo {
  /** pdf.js が割り当てた内部名 (例: "g_d0_f1") */
  loadedName: string;
  /** PDF に記載されたフォント名 (例: "EOODIA+NotoSansJP-Regular") */
  name: string;
  /** フォント種別 (例: "Type0", "TrueType") */
  type: string | undefined;
  /** フォントサブタイプ (例: "CIDFontType0C") */
  subtype: string | undefined;
  /** コンポジットフォントかどうか */
  composite: boolean | undefined;
  /** フォントデータが欠落しているか (= 未埋め込み) */
  missingFile: boolean;
  /** Bold 判定フラグ */
  bold: boolean;
  /** ToUnicode マッピングデータ */
  toUnicode: ToUnicodeMap | null;
  /** 検出されたページ番号の集合 */
  pageNumbers: Set<number>;
}

/** ToUnicode マッピングの走査インターフェース */
export interface ToUnicodeMap {
  forEach(callback: (charCode: number, unicodeStr: string | number) => void): void;
}

/** 診断パターンの識別子 */
export type PatternId = 'A' | 'B' | 'C' | 'D' | 'F' | 'H';

/** リスクレベル */
export type RiskLevel = 'high' | 'medium' | 'low';

/** 個別の診断結果 */
export interface DiagnosticItem {
  patternId: PatternId;
  riskLevel: RiskLevel;
  fontName: string;
  pageNumbers: number[];
  message: string;
  remedy: string;
  details?: Record<string, unknown>;
}

/** PDF 全体の診断結果 */
export interface DiagnosticReport {
  fileName: string;
  pageCount: number;
  fonts: PdfFontInfo[];
  items: DiagnosticItem[];
}

/** raw PDF パーサーによるフォント辞書のスキャン結果 */
export interface RawFontEntry {
  /** BaseFont 名 */
  baseFontName: string;
  /** /ToUnicode キーの有無 (unknown = 検出不能) */
  hasToUnicode: boolean | 'unknown';
}

/** パターン D 用: getTextContent() から取得したテキスト情報 */
export interface TextContentItem {
  /** テキスト文字列 */
  str: string;
  /** フォント名 (pdf.js の loadedName) */
  fontName: string;
  /** ページ番号 */
  pageNumber: number;
  /** y 座標（transform[5]） */
  y: number;
  /** 行末フラグ */
  hasEOL: boolean;
}

/** パターン F 用: ページ内のテキストレンダリングモード情報 */
export interface TextRenderingModeInfo {
  pageNumber: number;
  fontName: string;
  renderingMode: number;
  lineWidth: number | null;
}
