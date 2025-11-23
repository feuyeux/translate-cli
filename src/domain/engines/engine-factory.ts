/**
 * Translation Engine Factory
 * 
 * Factory class for creating translation engine instances.
 * Provides a centralized way to instantiate engines and query available engine types.
 * 
 * @module engine-factory
 */

import { HTTPClient } from '@infrastructure/http';
import { EngineType, ITranslationEngine } from './engine.interface';
import { GoogleTranslationEngine } from './google-engine';

/**
 * Translation Engine Factory
 */
export class TranslationEngineFactory {
  /**
   * Create a translation engine instance
   * 
   * @param engineType - Type of engine to create (currently only 'google')
   * @param httpClient - HTTP client instance for making requests
   * @returns Translation engine instance implementing ITranslationEngine
   * @throws Error if engine type is not recognized
   * 
   * @example
   * ```typescript
   * const httpClient = new HTTPClient();
   * const googleEngine = TranslationEngineFactory.createEngine('google', httpClient);
   * ```
   */
  static createEngine(engineType: EngineType, httpClient: HTTPClient): ITranslationEngine {
    switch (engineType) {
      case 'google':
        return new GoogleTranslationEngine(httpClient);
      default:
        throw new Error(
          `Unknown engine type: ${engineType}. Available engines: ${this.getAvailableEngines().join(', ')}`
        );
    }
  }

  /**
   * Get list of all available engine types
   * 
   * @returns Array of supported engine type identifiers
   */
  static getAvailableEngines(): EngineType[] {
    return ['google'];
  }
}
