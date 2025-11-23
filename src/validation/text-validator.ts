/**
 * Text Validator
 * Validates text input
 */

import { ValidationResult } from './validation.types';

/**
 * Validates text input (checks for empty or whitespace-only text)
 * @param text - The text to validate
 * @returns ValidationResult indicating if the text is valid
 */
export function validateText(text: string): ValidationResult {
  const errors: string[] = [];

  if (!text || typeof text !== 'string') {
    errors.push('文本不能为空');
    return { valid: false, errors };
  }

  // Check if text is only whitespace
  if (text.trim().length === 0) {
    errors.push('文本不能为空或仅包含空白字符');
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}
