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
import { detectBoldUnembedded } from './analyzer/pattern-h';
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

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      fontExtraProperties: true,
    }).promise;

    const fonts = await extractFonts(pdfDoc);
    const trInfos = await extractTextRenderingModes(pdfDoc);

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
    const patternF = detectPseudoBold(resolvedTrInfos);

    const allItems: DiagnosticItem[] = [
      ...patternA,
      ...patternB,
      ...patternC,
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
    pdfDoc.destroy();
  } catch (error) {
    reportContainer.innerHTML = '';
    const errorP = document.createElement('p');
    errorP.textContent = `解析エラー: ${error instanceof Error ? error.message : String(error)}`;
    reportContainer.appendChild(errorP);
  }
}
