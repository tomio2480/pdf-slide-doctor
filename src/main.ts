import '@picocss/pico/css/pico.min.css';
import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import { createDropZone } from './ui/drop-zone';
import { renderReport } from './ui/report';
import { extractFonts } from './analyzer/font-extractor';
import { extractTextRenderingModes, detectPseudoBold } from './analyzer/pattern-f';
import { detectUnembeddedFonts } from './analyzer/pattern-a';
import { detectMissingToUnicode } from './analyzer/pattern-b';
import { detectKangxiMismapping } from './analyzer/pattern-c';
import { extractTextContentItems, detectSpacedLetters, detectArcLayoutItems } from './analyzer/pattern-d';
import { detectBoldUnembedded } from './analyzer/pattern-h';
import { scanRawFontDicts } from './analyzer/raw-pdf-parser';
import { refineFontsWithRawScan } from './analyzer/refine-to-unicode';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { DiagnosticReport, DiagnosticItem } from './analyzer/types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const appContainer = document.getElementById('app');
if (!appContainer) throw new Error('#app element not found');

const reportContainer = document.createElement('div');
reportContainer.id = 'report';

createDropZone(appContainer, {
  onFileSelected: (file) => {
    analyzePdf(file);
  },
  onError: () => {
    // エラーは drop-zone 内で表示される
  },
});

appContainer.appendChild(reportContainer);

async function analyzePdf(file: File): Promise<void> {
  reportContainer.innerHTML = '';
  const loading = document.createElement('p');
  loading.setAttribute('aria-busy', 'true');
  loading.textContent = '解析中...';
  reportContainer.appendChild(loading);

  let pdfDoc: PDFDocumentProxy | undefined;
  try {
    const arrayBuffer = await file.arrayBuffer();
    // pdf.js 用と raw スキャン用にバッファを複製する（pdf.js が ArrayBuffer を detach する場合があるため）
    const rawScanBuffer = arrayBuffer.slice(0);
    pdfDoc = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      fontExtraProperties: true,
      cMapUrl: `${import.meta.env.BASE_URL}cmaps/`,
      cMapPacked: true,
    }).promise;

    const rawFonts = await extractFonts(pdfDoc);
    const trInfos = await extractTextRenderingModes(pdfDoc);
    const textItems = await extractTextContentItems(pdfDoc);

    // raw PDF スキャンで ToUnicode 合成を補正する
    const rawEntries = scanRawFontDicts(rawScanBuffer);
    const fonts = refineFontsWithRawScan(rawFonts, rawEntries);

    // loadedName → name 変換
    const nameMap = new Map(fonts.map((f) => [f.loadedName, f.name]));
    const resolvedTrInfos = trInfos.map((info) => ({
      ...info,
      fontName: nameMap.get(info.fontName) ?? info.fontName,
    }));

    // 各パターン検出
    const patternH = detectBoldUnembedded(fonts);
    const patternHFontNames = new Set(patternH.map((item) => item.fontName));

    const patternA = detectUnembeddedFonts(fonts).filter(
      (item) => !patternHFontNames.has(item.fontName),
    );
    const patternB = detectMissingToUnicode(fonts);
    const patternC = detectKangxiMismapping(fonts);
    const patternF = detectPseudoBold(resolvedTrInfos, fonts);
    const resolvedTextItems = textItems.map((item) => ({
      ...item,
      fontName: nameMap.get(item.fontName) ?? item.fontName,
    }));
    const patternD = [
      ...detectSpacedLetters(resolvedTextItems),
      ...detectArcLayoutItems(resolvedTextItems),
    ];

    const allItems: DiagnosticItem[] = [
      ...patternA,
      ...patternB,
      ...patternC,
      ...patternD,
      ...patternF,
      ...patternH,
    ];

    const report: DiagnosticReport = {
      fileName: file.name,
      pageCount: pdfDoc.numPages,
      fonts,
      items: allItems,
    };

    renderReport(reportContainer, report);
  } catch (error) {
    reportContainer.innerHTML = '';
    const errorP = document.createElement('p');
    errorP.textContent = `解析エラー: ${error instanceof Error ? error.message : String(error)}`;
    reportContainer.appendChild(errorP);
  } finally {
    pdfDoc?.destroy();
  }
}
