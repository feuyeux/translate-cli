/**
 * Google Translation Engine
 *
 * Implements translation using Google Translate's public API endpoint.
 *
 * Response Format:
 * Google returns an array where data[0] contains translation fragments:
 * ```json
 * [
 *   [
 *     ["Hello", "안녕하세요", null, null, 10],
 *     [" ", " ", null, null, 1],
 *     ["World", "세계", null, null, 3]
 *   ],
 *   null,
 *   "ko",
 *   ...
 * ]
 * ```
 *
 * Parsing Strategy:
 * - Validates response is an array with translation data at data[0]
 * - Filters out null, undefined, and empty string fragments
 * - Concatenates all valid fragments to form complete translation
 * - Throws descriptive errors for malformed responses
 *
 * Error Handling:
 * - Distinguishes between JSON parsing errors and structure validation errors
 * - Uses unified error message generator for consistent error reporting
 * - Returns TranslationResult with success=false on any error
 *
 * @module google-engine
 */

import { HTTPClient } from '@infrastructure/http';
import { HTTPError } from '@infrastructure/errors';
import { ITranslationEngine, TranslationRequest, TranslationResult } from './engine.interface';

/**
 * Unified error message generator for all translation engines
 *
 * This class ensures consistent error handling across different engines by:
 * - Categorizing errors into HTTP errors, parsing errors, and unknown errors
 * - Providing specific messages for common error scenarios (rate limiting, timeouts, etc.)
 * - Including engine name in all error messages for easy identification
 * - Using the same error classification logic for all engines
 *
 * Error Message Format: "[EngineName] error description"
 *
 * Supported Error Types:
 * - HTTP 429: Rate limiting
 * - HTTP 5xx: Server unavailable
 * - Network errors: Timeout, connection failure, DNS resolution failure
 * - Parsing errors: Invalid JSON, malformed response structure
 * - Unknown errors: Fallback for unclassified errors
 */
export class ErrorMessageGenerator {
  /**
   * Generate a user-friendly error message based on the error type
   *
   * @param error - The error object to process (HTTPError, Error, or unknown)
   * @param engineName - The name of the translation engine (e.g., 'Google', 'Bing')
   * @returns A formatted error message string in the format "[EngineName] error description"
   *
   * @example
   * ```typescript
   * // HTTP 429 error
   * ErrorMessageGenerator.generate(new HTTPError('Rate limit', 429), 'Google')
   * // Returns: "[Google] 请求过于频繁，请稍后重试"
   *
   * // Timeout error
   * ErrorMessageGenerator.generate(new HTTPError('超时'), 'Bing')
   * // Returns: "[Bing] 翻译请求超时"
   *
   * // Parsing error
   * ErrorMessageGenerator.generate(new Error('无法解析翻译响应'), 'Google')
   * // Returns: "[Google] 响应格式错误: 无法解析翻译结果"
   * ```
   */
  static generate(error: unknown, engineName: string): string {
    // HTTP errors from the HTTP client
    if (error instanceof HTTPError) {
      // Rate limiting error
      if (error.statusCode === 429) {
        return `[${engineName}] 请求过于频繁，请稍后重试`;
      }

      // Network errors (no status code)
      if (!error.statusCode) {
        // Timeout error
        if (error.message.includes('超时')) {
          return `[${engineName}] 翻译请求超时`;
        }
        // Connection error
        if (error.message.includes('无法连接')) {
          return `[${engineName}] 无法连接到翻译服务`;
        }
        // DNS resolution error
        if (error.message.includes('无法解析')) {
          return `[${engineName}] 无法解析翻译服务地址`;
        }
        // Generic network error
        return `[${engineName}] 网络错误: ${error.message}`;
      }

      // Server errors (5xx)
      if (error.statusCode >= 500) {
        return `[${engineName}] 翻译服务暂时不可用 (${error.statusCode})`;
      }

      // Other HTTP errors
      return `[${engineName}] ${error.message}`;
    }

    // Parsing errors
    if (error instanceof Error) {
      if (error.message.includes('无法解析')) {
        return `[${engineName}] 响应格式错误: 无法解析翻译结果`;
      }
      return `[${engineName}] ${error.message}`;
    }

    // Unknown errors
    return `[${engineName}] 翻译失败`;
  }
}

/**
 * Google Translation Engine implementation
 */
export class GoogleTranslationEngine implements ITranslationEngine {
  private httpClient: HTTPClient;
  private baseUrl = 'https://translate.googleapis.com/translate_a/single';

  constructor(httpClient: HTTPClient) {
    this.httpClient = httpClient;
  }

  getName(): string {
    return 'google';
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const { sourceLanguage, targetLanguage, text } = request;

    try {
      const url = this.buildTranslateUrl(sourceLanguage, targetLanguage, text);
      const responseText = await this.httpClient.get(url);
      const translatedText = this.parseTranslationResponse(responseText);

      return {
        targetLanguage,
        languageName: targetLanguage,
        translatedText,
        success: true,
      };
    } catch (error) {
      const errorMessage = this.generateErrorMessage(error);
      return {
        targetLanguage,
        languageName: targetLanguage,
        translatedText: '',
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Build Google Translate API URL with query parameters
   *
   * @param sourceLanguage - Source language code
   * @param targetLanguage - Target language code
   * @param text - Text to translate
   * @returns Complete URL for translation request
   * @private
   */
  private buildTranslateUrl(sourceLanguage: string, targetLanguage: string, text: string): string {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: sourceLanguage,
      tl: targetLanguage,
      dt: 't',
      q: text,
    });
    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * Parse Google Translate API response and extract translated text
   *
   * Google's response format is an array where:
   * - data[0] contains an array of translation fragments
   * - Each fragment is an array: [translatedText, originalText, ...]
   * - Some fragments may be null, undefined, or empty strings
   *
   * This method:
   * 1. Validates the response is an array
   * 2. Validates data[0] exists and is an array
   * 3. Filters out invalid fragments (null, undefined, empty strings)
   * 4. Extracts the first element (translated text) from each valid fragment
   * 5. Concatenates all fragments to form the complete translation
   *
   * @param responseText - Raw JSON response from Google Translate API
   * @returns Concatenated translation text from all valid fragments
   * @throws Error with descriptive message if response structure is invalid or contains no valid translations
   * @private
   *
   * @example
   * ```typescript
   * // Valid response with multiple fragments
   * const response = '[[[\"Hello\",\"안녕하세요\"],[\" \",\" \"],[\"World\",\"세계\"]],null,\"ko\"]';
   * parseTranslationResponse(response); // Returns: "Hello World"
   *
   * // Response with null fragments (filtered out)
   * const response = '[[[\"Hello\",\"안녕하세요\"],[null,null],[\"World\",\"세계\"]],null,\"ko\"]';
   * parseTranslationResponse(response); // Returns: "HelloWorld"
   * ```
   */
  private parseTranslationResponse(responseText: string): string {
    try {
      const data = JSON.parse(responseText);

      // 验证响应结构 - 检查是否为数组
      if (!Array.isArray(data)) {
        throw new Error('无法解析翻译响应: 响应不是数组格式');
      }

      // 检查是否包含翻译数据
      if (!data[0] || !Array.isArray(data[0])) {
        throw new Error('无法解析翻译响应: 缺少翻译数据');
      }

      // 提取并过滤翻译片段 - 过滤 null、undefined、空字符串
      const translations = data[0]
        .filter((item: unknown) => {
          // 确保是数组且第一个元素存在且不为 null/undefined/空字符串
          return Array.isArray(item) && item[0] !== null && item[0] !== undefined && item[0] !== '';
        })
        .map((item: unknown[]) => item[0] as string);

      // 如果没有有效的翻译片段，抛出错误
      if (translations.length === 0) {
        throw new Error('无法解析翻译响应: 响应中没有有效的翻译内容');
      }

      return translations.join('');
    } catch (error) {
      // 区分 JSON 错误和结构错误
      if (error instanceof SyntaxError) {
        throw new Error('无法解析翻译响应: JSON 格式错误');
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('无法解析翻译响应: 未知错误');
    }
  }

  /**
   * Generate user-friendly error message for Google Translate errors
   *
   * Uses the unified ErrorMessageGenerator to ensure consistent error messages
   * across all translation engines.
   *
   * @param error - Error object from HTTP request or response parsing
   * @returns Formatted error message with "[Google]" prefix
   * @private
   */
  private generateErrorMessage(error: unknown): string {
    return ErrorMessageGenerator.generate(error, 'Google');
  }
}
