# 📄 PDF フォント問題の技術調査: スライド共有サービスにおける文字化け・太字かすれの原因と対策

PDF のフォント埋め込み，CMap/cmap，ToUnicode，テキストレンダリングモードに関する技術調査をまとめた文書である．スライド共有サービス（Speaker Deck, SlideShare, Docswell）における文字化けと太字かすれの原因を特定し，診断・修復のための技術的基盤を整理する．

---

## 📑 目次

- [1. PDF におけるフォントの基本構造](#1-pdf-におけるフォントの基本構造)
  - [1.1 フォント種別と PDF 内での表現](#11-フォント種別と-pdf-内での表現)
  - [1.2 シンプルフォントとコンポジットフォント](#12-シンプルフォントとコンポジットフォント)
  - [1.3 フォント埋め込みとサブセット](#13-フォント埋め込みとサブセット)
- [2. CMap と cmap: 文字コードとグリフの対応関係](#2-cmap-と-cmap-文字コードとグリフの対応関係)
  - [2.1 CMap（PostScript 系）と cmap（OpenType/TrueType テーブル）の違い](#21-cmappostscript-系と-cmapopentypetruetype-テーブルの違い)
  - [2.2 Identity-H/V エンコーディング](#22-identity-hv-エンコーディング)
  - [2.3 Adobe-Japan1 文字コレクション](#23-adobe-japan1-文字コレクション)
- [3. ToUnicode CMap: テキスト抽出の要](#3-tounicode-cmap-テキスト抽出の要)
  - [3.1 ToUnicode CMap の役割](#31-tounicode-cmap-の役割)
  - [3.2 文字化けが発生するメカニズム](#32-文字化けが発生するメカニズム)
  - [3.3 康熙部首・CJK 部首補助への誤変換パターン](#33-康熙部首cjk-部首補助への誤変換パターン)
- [4. 太字かすれ問題: テキストレンダリングモードと疑似ボールド](#4-太字かすれ問題-テキストレンダリングモードと疑似ボールド)
  - [4.1 PDF のテキストレンダリングモード（Tr 演算子）](#41-pdf-のテキストレンダリングモードtr-演算子)
  - [4.2 疑似ボールドの実装方法](#42-疑似ボールドの実装方法)
  - [4.3 スライド共有サービスでの再レンダリング時の問題](#43-スライド共有サービスでの再レンダリング時の問題)
- [5. 問題パターンの分類と診断基準](#5-問題パターンの分類と診断基準)
  - [5.1 文字化け系の問題パターン](#51-文字化け系の問題パターン)
  - [5.2 太字かすれ系の問題パターン](#52-太字かすれ系の問題パターン)
  - [5.3 pdffonts コマンドの限界](#53-pdffonts-コマンドの限界)
- [6. 既存ツール・先行実装の調査](#6-既存ツール先行実装の調査)
  - [6.1 pdf-fix-tuc（ToUnicode CMap 修正ツール）](#61-pdf-fix-tuctounicode-cmap-修正ツール)
  - [6.2 pdf-rm-tuc（Adobe-Japan1 向け ToUnicode CMap 削除ツール）](#62-pdf-rm-tucadobe-japan1-向け-tounicode-cmap-削除ツール)
  - [6.3 xdvipdfmx の優先度判定ロジック](#63-xdvipdfmx-の優先度判定ロジック)
- [7. 診断ツール設計に向けた技術要件](#7-診断ツール設計に向けた技術要件)
  - [7.1 PDF 解析で取得すべき情報](#71-pdf-解析で取得すべき情報)
  - [7.2 問題検出アルゴリズム案](#72-問題検出アルゴリズム案)
  - [7.3 修復アプローチの技術的実現性](#73-修復アプローチの技術的実現性)
- [8. 残存課題と今後の方針](#8-残存課題と今後の方針)

---

## 1. PDF におけるフォントの基本構造

### 1.1 フォント種別と PDF 内での表現

PDF 内部で使用されるフォントは以下の種別に分類される．

表 1: PDF で扱われるフォント種別

| 種別 | サブタイプ | 説明 |
|---|---|---|
| Type 1 | Type1 | Adobe 開発のアウトラインフォント．PostScript 由来 |
| TrueType | TrueType | Apple/Microsoft 開発．2 次ベジエ曲線ベース |
| CIDFontType0 | OpenType(CFF) | CFF アウトラインを持つ CID フォント |
| CIDFontType2 | TrueType ベース | TrueType アウトラインを持つ CID フォント |
| Type 0 | 複合フォント | CID フォントを子孫に持つルートフォント |
| Type 3 | 特殊 | PostScript 命令で字形を直接記述．テキスト抽出不可 |

日本語フォントは文字集合が大きいため，Type 0（コンポジット）フォントが使われる．Type 0 フォントは必ず CIDFont 辞書と FontDescriptor 辞書の 2 層構造を取る．

### 1.2 シンプルフォントとコンポジットフォント

シンプルフォント（Type 1, TrueType 単体）は 1 バイトで 1 文字を表す．最大 256 グリフしか扱えないため，日本語では使えない．

コンポジットフォント（Type 0）は 1 バイト以上のシーケンスで 1 文字を表す．CID フォントを子孫に持ち，CMap を経由して文字コードからグリフを特定する．日本語 PDF のほぼすべてがこの形式を採用する．

Type 0 フォントの辞書構成は以下のとおりである．

```
Type0 フォント辞書
├─ Encoding: CMap名 または CMap ストリーム
├─ DescendantFonts: [CIDFont 辞書への参照]
├─ ToUnicode: CMap ストリーム（テキスト抽出用）
└─ BaseFont: PostScript名

CIDFont 辞書
├─ Subtype: CIDFontType0 または CIDFontType2
├─ CIDSystemInfo: 文字コレクション情報
├─ FontDescriptor: フォント詳細情報への参照
├─ W: グリフ幅配列
└─ CIDToGIDMap: CID→GID マッピング（Type2 のみ）
```

### 1.3 フォント埋め込みとサブセット

フォント埋め込みとは，PDF 内部にフォントプログラムを保存することである．埋め込みの状態は 3 種類に分類される．

1. **完全埋め込み**: フォント全体を PDF に格納する．ファイルサイズが大きくなる
2. **サブセット埋め込み**: 使用文字のグリフデータのみを抽出して格納する．フォント名の先頭に 6 文字のサブセットタグ（例: `EOODIA+`）が付与される
3. **非埋め込み**: フォント名のみを記録する．表示環境に同一フォントが存在しなければ代替フォントが使用され，字形が変わる可能性がある

日本語フォントは文字数が多いため，サブセット埋め込みが一般的である．スライド共有サービスにおいて，非埋め込みフォントは文字化けの最も基本的な原因となる．

---

## 2. CMap と cmap: 文字コードとグリフの対応関係

### 2.1 CMap（PostScript 系）と cmap（OpenType/TrueType テーブル）の違い

**CMap** と **cmap** は名前が似ているが，役割が異なる．

- **CMap**（大文字始まり）は PostScript/PDF 処理系で用いられる．CID フォントにおいて文字コードから CID への変換を行う．PDF の Type 0 フォント辞書の Encoding エントリで指定される
- **cmap**（小文字）は OpenType/TrueType フォントファイル内部のテーブルである．文字コード（Unicode 等）からグリフ ID（GID）への変換を行う

モリサワの解説によれば，CMap は「Unicode:6C38」→「GID:1260」のような対応情報を記述している．OS はこの対応表を参照し，GID に対応するグリフデータをフォントから取得する．

### 2.2 Identity-H/V エンコーディング

`Identity-H`（横書き）と `Identity-V`（縦書き）は特殊な CMap である．文字コードの値が直接 CID/GID の値となり，コード変換を省略できる．文字コードは常に 1 文字 2 バイトで，ビッグエンディアン順で記述する．

多くの PDF 生成ツールが Identity-H を採用する理由は以下のとおりである．

- cmap テーブルによるコード変換が不要になる
- cmap の選択が不要になる
- cmap を埋め込む必要がない

ただし，Identity-H/V を使う場合，CID/GID だけでは元の Unicode コードポイントがわからない．テキスト抽出のためには **ToUnicode CMap** が必須となる．

### 2.3 Adobe-Japan1 文字コレクション

Adobe-Japan1 は Adobe が規定した日本語の文字コレクションである．最新版は Adobe-Japan1-7 で，23,060 グリフが定義されている．

CIDSystemInfo 辞書で以下のように指定する．

```
/CIDSystemInfo <<
  /Registry (Adobe)
  /Ordering (Japan1)
  /Supplement 7
>>
```

Adobe-Japan1 に準拠しないフォントの場合は `Adobe-Identity-0` を使用する．多くの日本語フォントは Adobe-Japan1 のグリフセットをベースにしているが，厳密には準拠していないものもある．

---

## 3. ToUnicode CMap: テキスト抽出の要

### 3.1 ToUnicode CMap の役割

ToUnicode CMap は，CID/GID から Unicode コードポイントへの変換テーブルである．Type 0 フォント辞書の ToUnicode エントリにストリームとして埋め込まれる．

PDF ビューアがテキストをコピー・ペーストする際の流れは以下のとおりである．

1. コンテンツストリームから文字コード（CID/GID）を取得する
2. ToUnicode CMap を参照し，CID/GID を Unicode に変換する
3. Unicode テキストとしてクリップボードに格納する

ToUnicode CMap の構文例を以下に示す．

```
/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CMapName /FontName-UTF16 def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
3 beginbfchar
<0001> <0041>    % CID 1 → U+0041 (A)
<0002> <3042>    % CID 2 → U+3042 (あ)
<0003> <898B>    % CID 3 → U+898B (見)
endbfchar
endcmap
```

### 3.2 文字化けが発生するメカニズム

文字化けの根本原因は，ToUnicode CMap の生成方法にある．`pdf-fix-tuc` の開発者である細田真道氏の詳細な解説に基づき，メカニズムを説明する．

**フォントの cmap テーブルにおける n 対 1 対応の問題:**

PDF 生成時，Unicode → CID/GID の変換はフォントの cmap テーブルで行われる．このとき一つの CID/GID に複数の Unicode コードポイントが対応する場合がある．

例: 「見」の場合
- U+898B（CJK 統合漢字「見」）→ CID+1887
- U+2F92（康熙部首 KANGXI RADICAL SEE）→ CID+1887

Unicode は見た目が同じでも由来が異なれば異なるコードポイントを割り当てる．一方で CID/GID は字形が同じなら同じ ID を割り当てる．この方針の違いが n 対 1 対応を生む．

**逆変換時の優先度問題:**

ToUnicode CMap を生成する際，CID → Unicode の逆変換が必要になる．多くの PDF 生成ツールは cmap テーブルを上から順番に検索し，最初に見つかったコードポイントを採用する．cmap テーブルは Unicode コードポイントの昇順に並んでいるため，番号の小さい方が先に見つかる．

結果として CID+1887 → U+2F92（康熙部首）という誤った変換が ToUnicode CMap に記録される．元々 U+898B（通常の「見」）だった文字が U+2F92 に化ける．

### 3.3 康熙部首・CJK 部首補助への誤変換パターン

この問題で化ける先の文字は，以下の Unicode ブロックに集中する．

表 2: 誤変換先となる Unicode ブロック

| Unicode 範囲 | ブロック名 | 説明 |
|---|---|---|
| U+2E80 - U+2EF3 | CJK Radicals Supplement | CJK 部首補助 |
| U+2F00 - U+2FD5 | Kangxi Radicals | 康熙部首 |
| U+F900 - U+FAFF | CJK Compatibility Ideographs | CJK 互換漢字 |
| U+E000 - U+F8FF | Private Use Area | 私用領域 |
| U+FB00 - U+FB4F | Alphabetic Presentation Forms | アルファベット表示形 |
| U+2F800 - U+2FA1F | CJK Compatibility Ideographs Supplement | CJK 互換漢字補助 |

これらは特殊な用途の文字であり，多くのフォントに収録されていない．収録されていないフォントで表示しようとすると，代替フォントが使われて見た目が変わる，あるいは「.notdef」（豆腐）が表示される．

さらに，検索でもヒットしなくなる．通常の「見」（U+898B）で検索しても，U+2F92 とは異なる文字のため一致しない．

**スライド共有サービスでは追加の問題がある．** サービス側が PDF からテキストデータを抽出して transcripts（文字起こし）を生成する際に，この ToUnicode CMap の問題が顕在化する．表示上は埋め込みフォントのグリフが使われるため正常に見えるが，テキスト検索やスクリーンリーダーでの読み上げが破綻する．

---

## 4. 太字かすれ問題: テキストレンダリングモードと疑似ボールド

### 4.1 PDF のテキストレンダリングモード（Tr 演算子）

PDF のテキストレンダリングモードは `Tr` 演算子で設定する．ISO 32000-1 の Table 106 で定義される 8 種類のモードがある．

表 3: テキストレンダリングモード

| 値 | 動作 | 説明 |
|---|---|---|
| 0 | Fill | グリフ内部を塗りつぶす（通常のテキスト） |
| 1 | Stroke | グリフの輪郭線を描画する |
| 2 | Fill then Stroke | 塗りつぶし後に輪郭線を描画する |
| 3 | Invisible | 非表示（クリッピング用の下準備等） |
| 4 | Fill + Clip | 塗りつぶし + クリッピングパスに追加 |
| 5 | Stroke + Clip | 輪郭線描画 + クリッピングパスに追加 |
| 6 | Fill then Stroke + Clip | 塗り＋輪郭線＋クリッピング |
| 7 | Clip only | クリッピングパスにのみ追加 |

### 4.2 疑似ボールドの実装方法

PDF 生成ツールが「太字」を表現する方法は大きく 3 通りある．

**方法 1: Bold ウェイトのフォントを使用する（正しい方法）**

フォントファミリに Bold ウェイトが存在する場合，そのフォントを埋め込む．FontDescriptor の Flags に `ForceBold` ビットが立つ場合もある．

```
/BaseFont /NotoSansJP-Bold
/FontDescriptor << ... /FontWeight 700 ... >>
```

**方法 2: テキストレンダリングモード 2（Fill then Stroke）による疑似ボールド**

Bold フォントが使えない場合に，`Tr=2` と細い線幅（`w` 演算子）を組み合わせて太字風に見せる手法．

```
2 Tr           % Fill then Stroke モード
0.5 w          % 線幅 0.5pt
0 0 0 rg       % Fill 色: 黒
0 0 0 RG       % Stroke 色: 黒
(テキスト) Tj
0 Tr           % 通常モードに戻す
```

Fill 色と Stroke 色を同じ黒にし，適切な線幅を設定すると，文字が太く見える．

**方法 3: 同一文字を少しずらして二重描画する**

古い PDF 生成エンジンに見られる手法．同じ文字を微小なオフセットで 2 回描画することで太字風に見せる．テキスト抽出時に文字が二重に取得されるという問題がある．

### 4.3 スライド共有サービスでの再レンダリング時の問題

スライド共有サービスは PDF をアップロード後に画像（PNG/SVG）やウェブ表示用データに変換する．この変換処理の中で，方法 2（疑似ボールド）が正しく処理されない場合がある．

**かすれが発生するパターン:**

- サービス側の PDF レンダラが `Tr=2`（Fill then Stroke）を `Tr=1`（Stroke のみ）として処理する
- Stroke の線幅が適切に再現されない
- Fill と Stroke の色が異なる色として処理される

結果として，本来は塗りつぶされるべき文字内部が空洞になり，輪郭のみが描画される「かすれ」が発生する．

**かすれが発生しないパターン:**

- Bold ウェイトのフォントが正しく埋め込まれている（方法 1）
- `Tr=0`（通常の Fill）のみが使用されている

---

## 5. 問題パターンの分類と診断基準

### 5.1 文字化け系の問題パターン

表 4: 文字化けの問題パターンと原因

| パターン | 原因 | 検出可能性 |
|---|---|---|
| A: フォント非埋め込み | FontDescriptor に FontFile/FontFile2/FontFile3 がない | 確実に検出可能 |
| B: ToUnicode CMap 欠落 | Identity-H/V 使用時に ToUnicode エントリがない | 確実に検出可能 |
| C: ToUnicode CMap 誤変換 | 康熙部首等への誤マッピング | テーブル解析で検出可能 |
| D: cmap テーブル不整合 | フォント内 cmap と CIDToGIDMap の不一致 | 埋め込みフォント解析が必要 |
| E: MeiryoUI 等の特殊ケース | pdffonts で uni=yes でも化ける | 単純な検出は困難 |

パターン A, B は pdffonts コマンドの `emb` `uni` フラグで検出できる．パターン C は ToUnicode CMap のストリームを解析し，変換先の Unicode コードポイントが表 2 に該当するかを確認することで検出できる．

パターン D は，Noto Sans JP で報告された事象のように，プリンタドライバによって異なる CID が出力される場合に発生する．パターン E は，前回の調査で MeiryoUI で確認された事象であり，単純な自動検出は困難である．

### 5.2 太字かすれ系の問題パターン

表 5: 太字かすれの問題パターンと原因

| パターン | 原因 | 検出方法 |
|---|---|---|
| F: 疑似ボールド（Tr=2） | Bold フォント不在で Stroke による太字化 | コンテンツストリームの Tr 演算子を解析 |
| G: 二重描画による疑似ボールド | 同一文字の微小オフセット二重描画 | テキスト位置の重複検出 |
| H: Bold フォント欠落 | フォント名に Bold を含むが未埋め込み | フォント辞書の解析 |

パターン F の検出には，コンテンツストリームを解析して `Tr` 演算子の使用箇所を特定する必要がある．pdf.js の API を利用すれば，OperatorList からレンダリングモードを取得できる．

### 5.3 pdffonts コマンドの限界

pdffonts は以下の情報を表示する: フォント名，種別（Type），エンコーディング，埋め込み（emb），サブセット（sub），Unicode 対応（uni）．

前回の調査で判明した限界は以下のとおりである．

- `uni=yes` でも文字化けする場合がある（MeiryoUI パターン）
- Bold フォントの有無は直接判定できない
- テキストレンダリングモードは検出範囲外
- ToUnicode CMap の内容の正当性は検証しない

pdffonts の出力だけでは，問題の有無を機械的に判定することは信頼性に欠ける．より深い解析が必要である．

---

## 6. 既存ツール・先行実装の調査

### 6.1 pdf-fix-tuc（ToUnicode CMap 修正ツール）

開発者: 細田真道氏．ライセンス: BSD-2-Clause．

PDF 内の ToUnicode CMap を解析し，変換先が優先度の低い Unicode（康熙部首等）になっているマッピングを検出する．優先度が高い Unicode コードポイント（CJK 統合漢字等）に書き換えた PDF を出力する．

書き換えテーブルは `Adobe-Japan1` の `aj17-kanji.txt` を元に自動生成される．同じ CID に複数の Unicode コードポイントが割り当てられているものについて，xdvipdfmx と同じ優先度判定ロジックで正しい変換先を決定する．

**制約事項:**

- 不可逆変換であり，元の PDF は復元できない
- Adobe-Japan1 を元にしたテーブルのため，非 Adobe-Japan1 フォントでは完全に機能しない可能性がある
- BMP 内のコードポイントへの書き換えのみ対応

### 6.2 pdf-rm-tuc（Adobe-Japan1 向け ToUnicode CMap 削除ツール）

同じく細田氏のツール．Adobe-Japan1 フォントの場合，PDF ビューア側に ToUnicode CMap が用意されているため，PDF 内の不正な ToUnicode CMap を削除することで問題を回避する．

ただし，スライド共有サービスの PDF レンダラが Adobe-Japan1 用の ToUnicode CMap を持っているとは限らないため，この手法は汎用的ではない．

### 6.3 xdvipdfmx の優先度判定ロジック

xdvipdfmx（XeTeX の PDF 生成エンジン）は，cmap テーブルの逆変換時に以下の Unicode 範囲を「優先度が低い」と判定する．

```c
static int is_PUA_or_presentation (unsigned int uni) {
  return  ((uni >= 0x2E80 && uni <= 0x2EF3) ||  // CJK Radicals Supplement
           (uni >= 0x2F00 && uni <= 0x2FD5) ||  // Kangxi Radicals
           (uni >= 0xE000 && uni <= 0xF8FF) ||  // Private Use Area
           (uni >= 0xFB00 && uni <= 0xFB4F) ||  // Alphabetic Presentation Forms
           (uni >= 0xF900 && uni <= 0xFAFF) ||  // CJK Compatibility Ideographs
           (uni >= 0x2F800 && uni <= 0x2FA1F) || // CJK Compat Ideographs Supp
           (uni >= 0xF0000 && uni <= 0xFFFFD) || // Supplementary PUA-A
           (uni >= 0x100000 && uni <= 0x10FFFD)|| // Supplementary PUA-B
           (uni == 0x00AD));                      // Soft-hyphen
}
```

複数の候補がある場合に，この関数で `true` を返すコードポイントを除外することで，正しい変換先を選択している．このロジックは診断ツールでの ToUnicode CMap 検証にも応用できる．

---

## 7. 診断ツール設計に向けた技術要件

### 7.1 PDF 解析で取得すべき情報

診断ツールが取得すべき情報を，PDF オブジェクト階層に沿って整理する．

**フォント辞書レベル:**

- Subtype（Type0, TrueType, Type1, CIDFontType0, CIDFontType2）
- BaseFont（フォント名，サブセットタグの有無）
- Encoding（CMap 名，Identity-H/V の判定）
- ToUnicode（存在の有無，ストリームの内容）
- DescendantFonts（CIDFont への参照）

**CIDFont 辞書レベル:**

- CIDSystemInfo（Registry, Ordering, Supplement）
- CIDToGIDMap（Identity か否か）
- W / DW（グリフ幅情報 → Bold 判定の補助）

**FontDescriptor レベル:**

- FontFile / FontFile2 / FontFile3（埋め込みデータの有無と種類）
- Flags（ForceBold ビット，Symbolic/NonSymbolic）
- FontWeight（ウェイト値）
- FontName（Bold を含むか）

**コンテンツストリームレベル:**

- Tr 演算子（テキストレンダリングモード）
- w 演算子（線幅 → 疑似ボールド検出）
- rg / RG 演算子（Fill 色 / Stroke 色）
- Tf 演算子（フォント選択）
- Tj / TJ 演算子（テキスト描画）

### 7.2 問題検出アルゴリズム案

```
診断フロー:

[PDF 読み込み]
    │
    ├─[1] フォント辞書の列挙
    │   └─ 各フォントについて:
    │       ├─ 埋め込み判定（FontFile* の有無）
    │       │   └─ 非埋め込み → 【警告: フォント非埋め込み（パターン A）】
    │       │
    │       ├─ ToUnicode 判定
    │       │   ├─ Identity-H/V + ToUnicode 無し
    │       │   │   └─ 【警告: テキスト抽出不可（パターン B）】
    │       │   │
    │       │   └─ ToUnicode あり → CMap 内容解析
    │       │       └─ 変換先が康熙部首等に該当するエントリの検出
    │       │           └─ 【警告: 文字化けリスク（パターン C）】
    │       │
    │       └─ Bold 関連判定
    │           ├─ フォント名に "Bold" を含む + 非埋め込み
    │           │   └─ 【警告: Bold フォント欠落（パターン H）】
    │           └─ フォント名に "Bold" を含まない
    │               └─ コンテンツストリーム解析へ
    │
    └─[2] コンテンツストリーム解析
        └─ 各ページについて:
            ├─ Tr 演算子の使用検出
            │   └─ Tr=1 or Tr=2 検出
            │       └─ 【警告: 疑似ボールド検出（パターン F）】
            │
            └─ テキスト二重描画の検出
                └─ 同一座標付近に同一テキスト
                    └─ 【警告: 二重描画検出（パターン G）】
```

### 7.3 修復アプローチの技術的実現性

表 6: 各問題パターンに対する修復手法と実現性

| パターン | 修復手法 | 技術的難易度 | ブラウザ実装可否 |
|---|---|---|---|
| A: 非埋め込み | ユーザが代替フォントをドロップして埋め込む | 高 | pdf-lib + opentype.js で可能 |
| B: ToUnicode 欠落 | 埋め込みフォントの cmap から ToUnicode 生成 | 中 | pdf-lib で CMap ストリーム挿入可能 |
| C: ToUnicode 誤変換 | pdf-fix-tuc 相当のテーブル書き換え | 中 | pdf-lib で CMap ストリーム置換可能 |
| F: 疑似ボールド | Tr=2 → Tr=0 に変更 + Bold フォント埋め込み | 高 | コンテンツストリーム書き換えが必要 |
| H: Bold 欠落 | Bold フォントをドロップして埋め込む | 高 | pdf-lib + opentype.js で可能 |

パターン C の修復は，xdvipdfmx の優先度テーブルを JavaScript に移植すれば，ブラウザ上でも実現できる．具体的には:

1. pdf.js で PDF を読み込み，各フォントの ToUnicode CMap を解析する
2. 各マッピングエントリの変換先 Unicode を検査する
3. 優先度が低いブロック（康熙部首等）に該当するものを検出する
4. pdf-lib を使って ToUnicode CMap ストリームを書き換える
5. 修正済み PDF を出力する

パターン A, F, H の修復には，ユーザがフォントファイルを提供する必要がある．OFL ライセンスの Noto Sans CJK JP 等であれば，ツール側からの自動ダウンロード提供も検討できる（ただしファイルサイズの問題がある）．

---

## 8. 残存課題と今後の方針

### 🔴 技術的に未解決の課題

1. **MeiryoUI パターンの検出**: pdffonts で `uni=yes` にもかかわらず文字化けする事象．ToUnicode CMap の内容自体は正しいが，サービス側のレンダリング処理で問題が発生する．ブラウザベースの診断ツールでは検出が困難
2. **コンテンツストリーム書き換えの安全性**: Tr 演算子の変更はページの描画結果に直接影響する．不用意な書き換えは他の要素の表示を壊す恐れがある
3. **非 Adobe-Japan1 フォントへの対応**: pdf-fix-tuc のテーブルは Adobe-Japan1 ベースである．源ノ角ゴシック等の Adobe-Identity-0 フォントでは異なるアプローチが必要になる可能性がある

### 🟡 追加調査が必要な項目

1. **各スライド共有サービスの PDF レンダラ特定**: Speaker Deck, SlideShare, Docswell がそれぞれどの PDF ライブラリで変換しているかの特定．pdf.js ベースか，Poppler ベースか，独自実装かで対策が変わる
2. **PowerPoint の PDF 出力におけるフォント処理**: PowerPoint が Bold/疑似ボールドをどう PDF に書き出すかの体系的調査
3. **pdf.js API でのコンテンツストリーム解析の実現方法**: OPS（Operator List）からテキストレンダリングモードを取得する具体的な実装方法

### 🟢 次のステップ

段階的な実装アプローチを提案する．

**第 1 段階: 診断ツール（読み取り専用）**

- pdf.js でフォント辞書情報を一覧表示する
- ToUnicode CMap の有無と内容を検証する
- 疑似ボールド（Tr 演算子）の使用を検出する
- リスクレベル（高/中/低）を表示する

**第 2 段階: ToUnicode CMap 修復**

- パターン C（康熙部首等への誤変換）を自動修復する
- xdvipdfmx の優先度テーブルを JavaScript に移植する
- pdf-lib で修正済み PDF を出力する

**第 3 段階: フォント埋め込み・置換**

- ユーザがフォントファイルをドロップして埋め込む
- Bold フォントの追加埋め込みで疑似ボールドを解消する
- Noto Sans CJK JP（OFL）による代替フォント提案

---

## 📚 参考文献

- ISO 32000-1:2008 (PDF 1.7 仕様)
- Adobe PDF Reference, 6th Edition
- Adobe CMap and CIDFont Files Specification
- Adobe-Japan1-7 文字コレクション仕様 (Adobe)
- 細田真道: pdf-fix-tuc (https://github.com/trueroad/pdf-fix-tuc)
- アンテナハウス: PDF 資料室 各種記事 (https://www.antenna.co.jp/pdf/reference/)
- golden-lucky: PDFから「使える」テキストを取り出す 第 1-6 回 (2019)
- モリサワ: フォント用語集 CMap/cmap (https://www.morisawa.co.jp/culture/dictionary/1921)
- azelpg: Type 0 フォント解説 (https://azelpg.gitlab.io/azsky2/note/prog/pdf/17_type0.html)
- bewise.jp: フォントとPDFへの埋め込みについて (2021)
- インフォルム: PDFのフォント環境 (note.com, 2024)
