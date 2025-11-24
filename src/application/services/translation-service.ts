/**
 * Translation Service Module
 * Encapsulates interaction with translation engines
 */

import { HTTPClient } from '@infrastructure/http';
import { LanguageConfig, DEFAULT_TARGET_LANGUAGES } from '@config/index';
import {
  TranslationRequest,
  TranslationResult,
  EngineType,
  ITranslationEngine,
  TranslationEngineFactory,
} from '@domain/engines';

export class TranslationService {
  private engine: ITranslationEngine;
  private targetLanguages: LanguageConfig[];

  /**
   * Create a new TranslationService instance
   * @param engineType - The translation engine to use ('google' or 'bing')
   * @param httpClient - Optional HTTP client instance
   * @param proxy - Optional proxy URL
   * @param targetLanguages - Optional array of target language configurations
   */
  constructor(
    engineType: EngineType,
    httpClient?: HTTPClient,
    proxy?: string,
    targetLanguages?: LanguageConfig[]
  );

  /**
   * Legacy constructor signature for backward compatibility
   * @param httpClient - Optional HTTP client instance
   * @param proxy - Optional proxy URL
   * @param targetLanguages - Optional array of target language configurations
   */
  constructor(httpClient?: HTTPClient, proxy?: string, targetLanguages?: LanguageConfig[]);

  /**
   * Implementation of constructor with overloads
   */
  constructor(
    engineTypeOrHttpClient?: EngineType | HTTPClient,
    httpClientOrProxy?: HTTPClient | string,
    proxyOrTargetLanguages?: string | LanguageConfig[],
    targetLanguages?: LanguageConfig[]
  ) {
    // Determine which constructor signature was used
    let engineType: EngineType = 'google';
    let httpClient: HTTPClient | undefined;
    let proxy: string | undefined;
    let languages: LanguageConfig[] | undefined;

    if (typeof engineTypeOrHttpClient === 'string') {
      // New signature: (engineType, httpClient?, proxy?, targetLanguages?)
      engineType = engineTypeOrHttpClient;

      // Check if second parameter is HTTPClient or string (proxy)
      if (httpClientOrProxy instanceof HTTPClient) {
        httpClient = httpClientOrProxy;
        proxy = proxyOrTargetLanguages as string | undefined;
        languages = targetLanguages;
      } else if (typeof httpClientOrProxy === 'string') {
        // Second parameter is proxy, not httpClient
        httpClient = undefined;
        proxy = httpClientOrProxy;
        languages = proxyOrTargetLanguages as LanguageConfig[] | undefined;
      } else {
        // Second parameter is undefined
        httpClient = undefined;
        proxy = proxyOrTargetLanguages as string | undefined;
        languages = targetLanguages;
      }
    } else {
      // Legacy signature: (httpClient?, proxy?, targetLanguages?)
      httpClient = engineTypeOrHttpClient as HTTPClient | undefined;
      proxy = httpClientOrProxy as string | undefined;
      languages = proxyOrTargetLanguages as LanguageConfig[] | undefined;
    }

    // Create HTTP client if not provided
    const client = httpClient || new HTTPClient({ proxy });

    // Create translation engine using factory
    this.engine = TranslationEngineFactory.createEngine(engineType, client);

    // Set target languages
    this.targetLanguages = languages || DEFAULT_TARGET_LANGUAGES;
  }

  /**
   * Translate text from source language to target language
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const { targetLanguage } = request;

    // Find language name from config
    const languageConfig = this.targetLanguages.find((lang) => lang.code === targetLanguage);
    const languageName = languageConfig?.name || targetLanguage;

    // Delegate translation to the engine
    const result = await this.engine.translate(request);

    // Override language name with the one from our config
    return {
      ...result,
      languageName,
    };
  }

  /**
   * Batch translate text to all target languages concurrently
   */
  async batchTranslate(
    sourceLanguage: string,
    text: string,
    targetLanguages?: string[]
  ): Promise<TranslationResult[]> {
    // Use provided target languages or default to all configured languages
    const languages = targetLanguages || this.targetLanguages.map((lang) => lang.code);

    // Create translation requests for all target languages
    const translationPromises = languages.map((targetLanguage) =>
      this.translate({
        sourceLanguage,
        targetLanguage,
        text,
      })
    );

    // Use Promise.allSettled to handle all requests concurrently
    // This ensures that failure of one language doesn't affect others
    const results = await Promise.allSettled(translationPromises);

    // Collect all results (both successful and failed)
    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // If the promise itself rejected (shouldn't happen with our error handling)
        // Create a failed result
        const index = results.indexOf(result);
        const targetLanguage = languages[index];
        const languageConfig = this.targetLanguages.find((lang) => lang.code === targetLanguage);

        return {
          targetLanguage,
          languageName: languageConfig?.name || targetLanguage,
          translatedText: '',
          success: false,
          error: '翻译失败',
        };
      }
    });
  }
}
