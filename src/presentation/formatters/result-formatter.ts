/**
 * Result Formatter Module
 * Responsible for formatting and displaying translation results
 */

import chalk from 'chalk';
import { promises as fs } from 'node:fs';
import { TranslationResult } from '@domain/engines';
import { TARGET_LANGUAGES } from '@config/index';

export interface FormatterOptions {
  showErrors?: boolean;
  engineName?: string;
}

export class ResultFormatter {
  /**
   * Format translation results for display
   * Results are sorted according to predefined language order
   * Successful translations are shown in green, failures in red
   */
  format(results: TranslationResult[], options?: FormatterOptions): string {
    const showErrors = options?.showErrors !== false; // Default to true
    const engineName = options?.engineName;

    // Sort results according to predefined language order
    const sortedResults = this.sortByLanguageOrder(results);

    // Format each result as a line
    const lines = sortedResults.map((result) => {
      if (result.success) {
        // Success: green color with language name and translated text
        // Optionally include engine name for debugging
        const prefix = engineName ? `[${engineName}] ` : '';
        return chalk.green(`${prefix}${result.languageName}: ${result.translatedText}`);
      } else {
        // Failure: red color with error indication
        // Normalize error message format to ensure consistency
        const errorMsg = this.normalizeErrorMessage(result.error || '翻译失败', engineName);
        if (showErrors) {
          return chalk.red(`${result.languageName}: [错误] ${errorMsg}`);
        } else {
          return chalk.red(`${result.languageName}: [错误]`);
        }
      }
    });

    return lines.join('\n');
  }

  /**
   * Format error message for display
   * Ensures consistent error message format with optional engine name
   */
  formatError(error: Error, engineName?: string): string {
    const normalizedMessage = this.normalizeErrorMessage(error.message, engineName);
    return chalk.red(`错误: ${normalizedMessage}`);
  }

  /**
   * Normalize error message to ensure consistent format
   * Removes engine-specific prefixes and optionally adds a consistent prefix
   */
  private normalizeErrorMessage(message: string, engineName?: string): string {
    // Remove any existing engine prefixes like [google], [bing], etc.
    let normalized = message.replace(/^\[[\w-]+\]\s*/, '');

    // Add engine name prefix if provided
    if (engineName) {
      normalized = `[${engineName}] ${normalized}`;
    }

    return normalized;
  }

  /**
   * Save formatted results to a file
   * Strips ANSI color codes before saving
   */
  async saveToFile(formattedOutput: string, filePath: string): Promise<void> {
    // Remove ANSI color codes for clean file output
    const cleanOutput = this.stripAnsiCodes(formattedOutput);

    try {
      await fs.writeFile(filePath, cleanOutput, 'utf-8');
    } catch (error) {
      throw new Error(
        `无法写入文件 ${filePath}: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * Strip ANSI color codes from text
   */
  private stripAnsiCodes(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /**
   * Sort results according to predefined language order in TARGET_LANGUAGES
   */
  private sortByLanguageOrder(results: TranslationResult[]): TranslationResult[] {
    // Create a map of language code to order index
    const orderMap = new Map<string, number>();
    TARGET_LANGUAGES.forEach((lang, index) => {
      orderMap.set(lang.code, index);
    });

    // Sort results based on the order in TARGET_LANGUAGES
    return [...results].sort((a, b) => {
      const orderA = orderMap.get(a.targetLanguage) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.targetLanguage) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }
}
