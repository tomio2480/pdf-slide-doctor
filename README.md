# PDF Slide Doctor

スライド共有サービスでの文字化け・太字崩れリスクを事前に検出するブラウザベースの PDF フォント診断ツールである。

## 目次

- [概要](#概要)
- [使い方](#使い方)
- [診断パターン](#診断パターン)
- [開発](#開発)
- [ライセンス](#ライセンス)

## 概要

Speaker Deck や SlideShare 等のスライド共有サービスに PDF をアップロードする際、フォントの埋め込み状態や ToUnicode CMap の問題により文字化けや太字崩れが発生することがある。本ツールはアップロード前に PDF を診断し、問題の有無をリスクレベル別に表示する。

すべての処理はブラウザ上で完結する。PDF データがサーバに送信されることはない。

## 使い方

以下の URL でブラウザから利用できる。

https://tomio2480.github.io/pdf-slide-doctor/

1. ブラウザでツールを開く
2. PDF ファイルをドラッグ＆ドロップするか、ファイル選択ボタンから選ぶ
3. 診断結果がリスクレベル別に表示される

![PDF Slide Doctor の診断結果画面。リスクレベル別にパターン B（ToUnicode CMap 欠落）とパターン F（疑似ボールド）の検出結果が表示されている](docs/screenshot.png)

図 1: 診断結果の表示例

## 診断パターン

### 文字化け系

| ID | パターン | リスク | 説明 |
|----|----------|--------|------|
| A | フォント未埋め込み | 高 | フォントデータが PDF に含まれていない |
| B | ToUnicode CMap 欠落 | 高 | テキスト抽出に必要な変換テーブルがない |
| C | 康煕部首誤マッピング | 中 | ToUnicode CMap が低優先 Unicode ブロックを参照している |

### 太字崩れ系

| ID | パターン | リスク | 説明 |
|----|----------|--------|------|
| F | 疑似ボールド (Tr=2) | 中 | Fill then Stroke による太字表現が使用されている |
| H | Bold フォント名+未埋め込み | 高 | Bold ウェイトのフォントが埋め込まれていない |

## 開発

### 前提条件

- Node.js 20 以上

### セットアップ

```bash
git clone https://github.com/tomio2480/pdf-slide-doctor.git
cd pdf-slide-doctor
npm install
```

### 開発サーバ起動

```bash
npm run dev
```

### テスト

```bash
npm run test:run
```

### Lint と型チェック

```bash
npm run lint
npm run typecheck
```

### ビルド

```bash
npm run build
```

## ライセンス

MIT License
