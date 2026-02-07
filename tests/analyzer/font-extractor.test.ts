import { describe, it, expect, vi } from 'vitest';
import { extractFonts } from '../../src/analyzer/font-extractor';

function createMockPdfDoc(pages: Array<{
  fonts: Record<string, Record<string, unknown>>;
  opFnArray: number[];
  opArgsArray: unknown[][];
}>) {
  return {
    numPages: pages.length,
    getPage: vi.fn(async (pageNum: number) => {
      const page = pages[pageNum - 1];
      return {
        getOperatorList: vi.fn(async () => ({
          fnArray: page.opFnArray,
          argsArray: page.opArgsArray,
        })),
        commonObjs: {
          get: vi.fn((id: string) => page.fonts[id]),
        },
        cleanup: vi.fn(),
      };
    }),
  };
}

describe('extractFonts', () => {
  it('1ページ1フォントの場合に正しく抽出する', async () => {
    const OPS_SET_FONT = 37;
    const doc = createMockPdfDoc([{
      fonts: {
        'g_d0_f1': {
          loadedName: 'g_d0_f1',
          name: 'NotoSansJP-Regular',
          type: 'Type0',
          subtype: 'CIDFontType0C',
          composite: true,
          missingFile: false,
          bold: false,
          toUnicode: null,
        },
      },
      opFnArray: [OPS_SET_FONT],
      opArgsArray: [['g_d0_f1', 12]],
    }]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fonts = await extractFonts(doc as any);
    expect(fonts).toHaveLength(1);
    expect(fonts[0].name).toBe('NotoSansJP-Regular');
    expect(fonts[0].composite).toBe(true);
    expect(fonts[0].pageNumbers).toEqual(new Set([1]));
  });

  it('複数ページで同じフォントが使われている場合にページ番号を集約する', async () => {
    const OPS_SET_FONT = 37;
    const fontData = {
      loadedName: 'g_d0_f1',
      name: 'TestFont',
      type: 'Type0',
      subtype: 'CIDFontType0C',
      composite: true,
      missingFile: false,
      bold: false,
      toUnicode: null,
    };
    const doc = createMockPdfDoc([
      {
        fonts: { 'g_d0_f1': fontData },
        opFnArray: [OPS_SET_FONT],
        opArgsArray: [['g_d0_f1', 12]],
      },
      {
        fonts: { 'g_d0_f1': fontData },
        opFnArray: [OPS_SET_FONT],
        opArgsArray: [['g_d0_f1', 12]],
      },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fonts = await extractFonts(doc as any);
    expect(fonts).toHaveLength(1);
    expect(fonts[0].pageNumbers).toEqual(new Set([1, 2]));
  });

  it('フォントがないページをスキップする', async () => {
    const doc = createMockPdfDoc([{
      fonts: {},
      opFnArray: [],
      opArgsArray: [],
    }]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fonts = await extractFonts(doc as any);
    expect(fonts).toHaveLength(0);
  });
});
