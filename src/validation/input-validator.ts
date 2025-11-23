/**
 * Input Validator
 * Validates combined language code and text input
 */

import { LanguageConfig } from '../config';
import { ValidationResult } from './validation.types';
import { validateLanguageCode } from './language-validator';
import { validateText } from './text-validator';

/**
 * Validates both language code and text input
 * @param sourceLanguage - The source language code
 * @param text - The text to translate
 * @param targetLanguages - Optional array of target languages to use for validation
 * @returns ValidationResult with all validation errors
 */
export function validateInput(
  sourceLanguage: string,
  text: string,
  targetLanguages?: LanguageConfig[]
): ValidationResult {
  const allErrors: string[] = [];

  const languageResult = validateLanguageCode(sourceLanguage, targetLanguages);
  if (!languageResult.valid) {
    allErrors.push(...languageResult.errors);
  }

  const textResult = validateText(text);
  if (!textResult.valid) {
    allErrors.push(...textResult.errors);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
