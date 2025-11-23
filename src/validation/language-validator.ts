/**
 * Language Validator
 * Validates language codes
 */

import { LanguageConfig, DEFAULT_TARGET_LANGUAGES } from '../config';
import { ValidationResult } from './validation.types';

/**
 * Get all valid language codes (including target languages)
 * @param targetLanguages Optional array of target languages to include in validation
 * @returns Set of valid language codes
 */
export function getValidLanguageCodes(targetLanguages?: LanguageConfig[]): Set<string> {
  const codes = new Set<string>();

  // Use provided languages or default to DEFAULT_TARGET_LANGUAGES
  const languages = targetLanguages || DEFAULT_TARGET_LANGUAGES;

  // Add all target language codes
  languages.forEach((lang) => codes.add(lang.code));

  // Add common source language codes that might not be in target list
  const commonCodes = [
    'en',
    'de',
    'fr',
    'es',
    'ru',
    'el',
    'hi',
    'ar',
    'ja',
    'zh-CN',
    'ko',
    'zh-TW',
    'pt',
    'it',
    'nl',
    'pl',
    'tr',
    'vi',
    'th',
    'id',
    'ms',
  ];
  commonCodes.forEach((code) => codes.add(code));

  return codes;
}

/**
 * Validates a language code
 * @param languageCode - The language code to validate
 * @param targetLanguages - Optional array of target languages to use for validation
 * @returns ValidationResult indicating if the code is valid
 */
export function validateLanguageCode(
  languageCode: string,
  targetLanguages?: LanguageConfig[]
): ValidationResult {
  const errors: string[] = [];

  if (!languageCode || typeof languageCode !== 'string') {
    errors.push('语言代码不能为空');
    return { valid: false, errors };
  }

  const trimmedCode = languageCode.trim();

  if (trimmedCode.length === 0) {
    errors.push('语言代码不能为空');
    return { valid: false, errors };
  }

  // Check if it's a valid language code format (2-5 characters, may contain hyphen)
  const languageCodePattern = /^[a-z]{2}(-[A-Z]{2})?$/;
  if (!languageCodePattern.test(trimmedCode)) {
    errors.push(`无效的语言代码格式：${trimmedCode}`);
    return { valid: false, errors };
  }

  // Check if it's in our list of valid codes
  const validCodes = getValidLanguageCodes(targetLanguages);
  if (!validCodes.has(trimmedCode)) {
    errors.push(`不支持的语言代码：${trimmedCode}`);
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}
