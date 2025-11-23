/**
 * Translation Engine Interfaces
 * 
 * This module defines the core interfaces and types for translation engines.
 * All translation engines must implement these interfaces to ensure consistent behavior.
 * 
 * @module engine.interface
 */

/**
 * Request object for translation operations
 * 
 * @property sourceLanguage - Source language code (e.g., 'en', 'zh-CN')
 * @property targetLanguage - Target language code (e.g., 'en', 'zh-CN')
 * @property text - Text to be translated
 */
export interface TranslationRequest {
  sourceLanguage: string;
  targetLanguage: string;
  text: string;
}

/**
 * Result object returned from translation operations
 * 
 * @property targetLanguage - Target language code
 * @property languageName - Human-readable target language name
 * @property translatedText - Translated text (empty string if translation failed)
 * @property success - Whether the translation succeeded
 * @property error - Error message if translation failed (format: "[EngineName] error description")
 */
export interface TranslationResult {
  targetLanguage: string;
  languageName: string;
  translatedText: string;
  success: boolean;
  error?: string;
}

/**
 * Supported translation engine types
 * 
 * Note: Bing Translator API is no longer publicly available without authentication.
 * Only Google Translate is currently supported.
 */
export type EngineType = 'google';

/**
 * Common interface that all translation engines must implement
 * 
 * All engines must provide:
 * - Response parsing specific to their API format
 * - Error handling that produces consistent error messages
 * - Validation of response structure before extracting translation text
 */
export interface ITranslationEngine {
  /**
   * Translate text from source language to target language
   * 
   * @param request - Translation request containing source/target languages and text
   * @returns Promise resolving to translation result with success status and error message if failed
   */
  translate(request: TranslationRequest): Promise<TranslationResult>;
  
  /**
   * Get the engine name identifier
   * 
   * @returns Engine name (e.g., 'google', 'bing')
   */
  getName(): string;
}
