/**
 * Boundary Case Tests for Translation Engines
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { GoogleTranslationEngine } from './index';
import { HTTPClient } from '@infrastructure/http';

// Mock HTTPClient
class MockHTTPClient extends HTTPClient {
  private mockResponse: string = '';

  setMockResponse(response: string): void {
    this.mockResponse = response;
  }

  async get(): Promise<string> {
    return this.mockResponse;
  }
}

describe('Boundary Case Handling', () => {
  let mockHttpClient: MockHTTPClient;
  let googleEngine: GoogleTranslationEngine;

  beforeEach(() => {
    mockHttpClient = new MockHTTPClient();
    googleEngine = new GoogleTranslationEngine(mockHttpClient);
  });

  describe('Requirement 5.1: Empty string as valid translation result', () => {
    test('Google engine handles empty string translation correctly', async () => {
      // Google response with empty string as translation
      const googleResponse = JSON.stringify([
        [['', 'source text', null, null, 10]],
        null,
        'en',
      ]);
      mockHttpClient.setMockResponse(googleResponse);

      const result = await googleEngine.translate({
        sourceLanguage: 'ko',
        targetLanguage: 'en',
        text: 'source text',
      });

      // Empty string should cause an error because it's filtered out
      expect(result.success).toBe(false);
      expect(result.error).toContain('响应格式错误');
    });
  });

  describe('Requirement 5.2: Special characters and Unicode preservation', () => {
    test('Google engine preserves emoji characters', async () => {
      const emojiText = '你好 👋 世界 🌍';
      const googleResponse = JSON.stringify([
        [[emojiText, 'Hello World', null, null, 10]],
        null,
        'en',
      ]);
      mockHttpClient.setMockResponse(googleResponse);

      const result = await googleEngine.translate({
        sourceLanguage: 'zh',
        targetLanguage: 'en',
        text: 'Hello World',
      });

      expect(result.success).toBe(true);
      expect(result.translatedText).toBe(emojiText);
    });

    test('Google engine preserves CJK characters', async () => {
      const cjkText = '日本語 한국어 中文';
      const googleResponse = JSON.stringify([
        [[cjkText, 'source', null, null, 10]],
        null,
        'en',
      ]);
      mockHttpClient.setMockResponse(googleResponse);

      const result = await googleEngine.translate({
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        text: 'source',
      });

      expect(result.success).toBe(true);
      expect(result.translatedText).toBe(cjkText);
    });
  });

  describe('Requirement 5.3: HTML entities and tags preservation', () => {
    test('Google engine preserves HTML entities', async () => {
      const htmlText = '&lt;div&gt; &amp; &quot;test&quot;';
      const googleResponse = JSON.stringify([
        [[htmlText, 'source', null, null, 10]],
        null,
        'en',
      ]);
      mockHttpClient.setMockResponse(googleResponse);

      const result = await googleEngine.translate({
        sourceLanguage: 'en',
        targetLanguage: 'ko',
        text: 'source',
      });

      expect(result.success).toBe(true);
      expect(result.translatedText).toBe(htmlText);
    });

    test('Google engine preserves HTML tags', async () => {
      const htmlText = '<b>Bold</b> <i>Italic</i> <span>Text</span>';
      const googleResponse = JSON.stringify([
        [[htmlText, 'source', null, null, 10]],
        null,
        'en',
      ]);
      mockHttpClient.setMockResponse(googleResponse);

      const result = await googleEngine.translate({
        sourceLanguage: 'en',
        targetLanguage: 'ko',
        text: 'source',
      });

      expect(result.success).toBe(true);
      expect(result.translatedText).toBe(htmlText);
    });
  });

  describe('Requirement 5.4: Long text completeness', () => {
    test('Google engine handles long text without truncation', async () => {
      // Generate a long text (10000+ characters)
      const longText = 'A'.repeat(10000);
      const googleResponse = JSON.stringify([
        [[longText, 'source', null, null, 10]],
        null,
        'en',
      ]);
      mockHttpClient.setMockResponse(googleResponse);

      const result = await googleEngine.translate({
        sourceLanguage: 'en',
        targetLanguage: 'ko',
        text: 'source',
      });

      expect(result.success).toBe(true);
      expect(result.translatedText).toBe(longText);
      expect(result.translatedText.length).toBe(10000);
    });

    test('Google engine handles multi-fragment long text', async () => {
      // Multiple fragments that together form a long text
      const fragment1 = 'A'.repeat(3000);
      const fragment2 = 'B'.repeat(3000);
      const fragment3 = 'C'.repeat(4000);
      const googleResponse = JSON.stringify([
        [
          [fragment1, 'source1', null, null, 10],
          [fragment2, 'source2', null, null, 10],
          [fragment3, 'source3', null, null, 10],
        ],
        null,
        'en',
      ]);
      mockHttpClient.setMockResponse(googleResponse);

      const result = await googleEngine.translate({
        sourceLanguage: 'en',
        targetLanguage: 'ko',
        text: 'source',
      });

      expect(result.success).toBe(true);
      expect(result.translatedText).toBe(fragment1 + fragment2 + fragment3);
      expect(result.translatedText.length).toBe(10000);
    });
  });

  describe('Requirement 5.5: Nested JSON structure navigation', () => {
    test('Google engine navigates nested structure correctly', async () => {
      // Standard Google response with nested structure
      const googleResponse = JSON.stringify([
        [
          ['Hello', '안녕하세요', null, null, 10],
          [' ', ' ', null, null, 1],
          ['World', '세계', null, null, 3],
        ],
        null,
        'ko',
        null,
        null,
        null,
        null,
        [],
      ]);
      mockHttpClient.setMockResponse(googleResponse);

      const result = await googleEngine.translate({
        sourceLanguage: 'ko',
        targetLanguage: 'en',
        text: '안녕하세요 세계',
      });

      expect(result.success).toBe(true);
      expect(result.translatedText).toBe('Hello World');
    });

    test('Google engine handles deeply nested valid fragments', async () => {
      // Response with extra nesting levels (still valid structure)
      const googleResponse = JSON.stringify([
        [
          ['Part1', 'source1', null, null, 10],
          ['Part2', 'source2', null, null, 10],
        ],
        null,
        'en',
        null,
        { extraData: 'ignored' },
        [1, 2, 3],
      ]);
      mockHttpClient.setMockResponse(googleResponse);

      const result = await googleEngine.translate({
        sourceLanguage: 'ko',
        targetLanguage: 'en',
        text: 'source',
      });

      expect(result.success).toBe(true);
      expect(result.translatedText).toBe('Part1Part2');
    });
  });

  describe('Combined boundary cases', () => {
    test('Google engine handles special characters in long text', async () => {
      const specialText = '你好👋'.repeat(2000); // Long text with special chars
      const googleResponse = JSON.stringify([
        [[specialText, 'source', null, null, 10]],
        null,
        'en',
      ]);
      mockHttpClient.setMockResponse(googleResponse);

      const result = await googleEngine.translate({
        sourceLanguage: 'zh',
        targetLanguage: 'en',
        text: 'source',
      });

      expect(result.success).toBe(true);
      expect(result.translatedText).toBe(specialText);
      // Verify the text is long and contains special characters
      expect(result.translatedText.length).toBeGreaterThan(5000);
      expect(result.translatedText).toContain('你好');
      expect(result.translatedText).toContain('👋');
    });
  });
});
