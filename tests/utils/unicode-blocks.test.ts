import { describe, it, expect } from 'vitest';
import { isLowPriorityUnicode } from '../../src/utils/unicode-blocks';

describe('isLowPriorityUnicode', () => {
  describe('CJK Radicals Supplement (U+2E80-U+2EF3)', () => {
    it('U+2E80 を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0x2E80)).toBe(true);
    });
    it('U+2EF3 を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0x2EF3)).toBe(true);
    });
    it('U+2E7F は範囲外', () => {
      expect(isLowPriorityUnicode(0x2E7F)).toBe(false);
    });
    it('U+2EF4 は範囲外', () => {
      expect(isLowPriorityUnicode(0x2EF4)).toBe(false);
    });
  });

  describe('Kangxi Radicals (U+2F00-U+2FD5)', () => {
    it('U+2F00 を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0x2F00)).toBe(true);
    });
    it('U+2FD5 を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0x2FD5)).toBe(true);
    });
    it('U+2F92 (康煕部首「見」) を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0x2F92)).toBe(true);
    });
  });

  describe('Private Use Area (U+E000-U+F8FF)', () => {
    it('U+E000 を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0xE000)).toBe(true);
    });
    it('U+F8FF を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0xF8FF)).toBe(true);
    });
  });

  describe('Alphabetic Presentation Forms (U+FB00-U+FB4F)', () => {
    it('U+FB00 を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0xFB00)).toBe(true);
    });
    it('U+FB4F を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0xFB4F)).toBe(true);
    });
  });

  describe('CJK Compatibility Ideographs (U+F900-U+FAFF)', () => {
    it('U+F900 を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0xF900)).toBe(true);
    });
    it('U+FAFF を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0xFAFF)).toBe(true);
    });
  });

  describe('CJK Compat Ideographs Supplement (U+2F800-U+2FA1F)', () => {
    it('U+2F800 を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0x2F800)).toBe(true);
    });
    it('U+2FA1F を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0x2FA1F)).toBe(true);
    });
  });

  describe('Supplementary PUA-A (U+F0000-U+FFFFD)', () => {
    it('U+F0000 を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0xF0000)).toBe(true);
    });
  });

  describe('Supplementary PUA-B (U+100000-U+10FFFD)', () => {
    it('U+100000 を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0x100000)).toBe(true);
    });
  });

  describe('Soft-hyphen', () => {
    it('U+00AD を低優先と判定する', () => {
      expect(isLowPriorityUnicode(0x00AD)).toBe(true);
    });
  });

  describe('通常文字は低優先でない', () => {
    it('U+898B (見) を通常文字と判定する', () => {
      expect(isLowPriorityUnicode(0x898B)).toBe(false);
    });
    it('U+3042 (あ) を通常文字と判定する', () => {
      expect(isLowPriorityUnicode(0x3042)).toBe(false);
    });
    it('U+0041 (A) を通常文字と判定する', () => {
      expect(isLowPriorityUnicode(0x0041)).toBe(false);
    });
    it('U+4E00 (一) を通常文字と判定する', () => {
      expect(isLowPriorityUnicode(0x4E00)).toBe(false);
    });
  });
});
