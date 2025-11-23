/**
 * Translation Engines Module
 * 
 * This module provides translation engine implementations for Google Translate.
 * Each engine handles its specific response format and provides unified error handling.
 * 
 * Note: Bing Translator has been removed as the public API is no longer available
 * without authentication. To use Bing Translator, you would need to implement
 * Microsoft Translator Text API with proper API keys.
 * 
 * @module engines
 */

export * from './engine.interface';
export * from './google-engine';
export * from './engine-factory';
