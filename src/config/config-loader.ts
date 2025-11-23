/**
 * Configuration Loader
 * Handles configuration loading, parsing, and defaults
 */

import * as fs from 'fs';
import * as path from 'path';
import { EngineType, TranslationEngineFactory } from '@domain/engines';
import { Config, LanguageConfig } from './config.types';
import { DEFAULT_ENGINE, DEFAULT_TARGET_LANGUAGES } from './config.constants';

/**
 * Configuration Loader
 */
class ConfigLoader {
  private static readonly SUPPORTED_DELIMITERS = [':', ',', '='];
  private static readonly COMMENT_PREFIX = '#';
  private static readonly DEFAULT_CONFIG_FILENAME = 'languages.conf';
  private static readonly ENV_VAR_NAME = 'TRANSLATE_CONFIG_PATH';
  private static readonly ENGINE_ENV_VAR_NAME = 'TRANSLATE_ENGINE';

  loadConfig(configPath?: string, engineType?: EngineType): Config {
    const warnings: string[] = [];
    const engine = this.loadEngineType(configPath, engineType);
    const configFilePath = this.findConfigFile(configPath);

    if (!configFilePath) {
      if (configPath) {
        console.error(`Error: Configuration file not found: ${configPath}`);
        console.log('Falling back to default language list');
      }
      return {
        languages: DEFAULT_TARGET_LANGUAGES,
        engineType: engine,
      };
    }

    try {
      const content = fs.readFileSync(configFilePath, 'utf-8');
      const parsedLanguages = this.parseConfigFile(content);

      parsedLanguages.warnings.forEach((warning) => {
        console.warn(`Warning: ${warning}`);
      });

      if (parsedLanguages.languages.length === 0) {
        console.warn('Warning: No valid language entries found in configuration file, using defaults');
        return {
          languages: DEFAULT_TARGET_LANGUAGES,
          engineType: engine,
        };
      }

      return {
        languages: parsedLanguages.languages,
        engineType: engine,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error: Error reading configuration file: ${errorMessage}`);
      console.log('Falling back to default language list');
      return {
        languages: DEFAULT_TARGET_LANGUAGES,
        engineType: engine,
      };
    }
  }

  private loadEngineType(configPath?: string, engineType?: EngineType): EngineType {
    // Priority 1: CLI option
    if (engineType && this.isValidEngineType(engineType)) {
      return engineType;
    }
    if (engineType) {
      console.warn(`Warning: Invalid engine type from CLI option: ${engineType}`);
    }

    // Priority 2: Environment variable
    const envEngine = process.env[ConfigLoader.ENGINE_ENV_VAR_NAME];
    if (envEngine && this.isValidEngineType(envEngine)) {
      return envEngine.toLowerCase() as EngineType;
    }
    if (envEngine) {
      console.warn(`Warning: Invalid engine type from environment variable: ${envEngine}`);
    }

    // Priority 3: Configuration file
    const configFilePath = this.findConfigFile(configPath);
    if (configFilePath) {
      try {
        const content = fs.readFileSync(configFilePath, 'utf-8');
        const fileEngine = this.parseEngineFromFile(content);
        if (fileEngine && this.isValidEngineType(fileEngine)) {
          return fileEngine as EngineType;
        }
        if (fileEngine) {
          console.warn(`Warning: Invalid engine type from configuration file: ${fileEngine}`);
        }
      } catch (error) {
        // Silently fall through to default
      }
    }

    // Priority 4: Default
    return DEFAULT_ENGINE;
  }

  private isValidEngineType(engineType: string): boolean {
    const availableEngines = TranslationEngineFactory.getAvailableEngines();
    return availableEngines.includes(engineType.toLowerCase() as EngineType);
  }

  private parseEngineFromFile(content: string): string | null {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '' || trimmedLine.startsWith(ConfigLoader.COMMENT_PREFIX)) {
        continue;
      }
      const lowerLine = trimmedLine.toLowerCase();
      for (const delimiter of ConfigLoader.SUPPORTED_DELIMITERS) {
        if (lowerLine.startsWith('engine')) {
          const parts = trimmedLine.split(delimiter);
          if (parts.length === 2 && parts[0].trim().toLowerCase() === 'engine') {
            return parts[1].trim().toLowerCase();
          }
        }
      }
    }
    return null;
  }

  private findConfigFile(configPath?: string): string | null {
    // Priority 1: CLI option
    if (configPath && fs.existsSync(configPath)) {
      return configPath;
    }

    // Priority 2: Environment variable
    const envPath = process.env[ConfigLoader.ENV_VAR_NAME];
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }

    // Priority 3: Default location
    const defaultPath = path.join(process.cwd(), ConfigLoader.DEFAULT_CONFIG_FILENAME);
    if (fs.existsSync(defaultPath)) {
      return defaultPath;
    }

    return null;
  }

  private parseConfigFile(content: string): { languages: LanguageConfig[]; warnings: string[] } {
    const lines = content.split('\n');
    const languages: LanguageConfig[] = [];
    const warnings: string[] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      if (trimmedLine === '' || trimmedLine.startsWith(ConfigLoader.COMMENT_PREFIX)) {
        return;
      }

      if (trimmedLine.toLowerCase().startsWith('engine')) {
        return;
      }

      const parsed = this.parseLine(trimmedLine);
      if (parsed) {
        const config: LanguageConfig = {
          code: parsed.code,
          name: parsed.name,
        };
        if (config.code.length > 0 && config.name.length > 0) {
          languages.push(config);
        } else {
          warnings.push(`Line ${lineNumber}: Invalid language configuration - code or name is empty`);
        }
      } else {
        warnings.push(`Line ${lineNumber}: Malformed entry - expected format: code<delimiter>name`);
      }
    });

    return { languages, warnings };
  }

  private parseLine(line: string): { code: string; name: string } | null {
    for (const delimiter of ConfigLoader.SUPPORTED_DELIMITERS) {
      const parts = line.split(delimiter);
      if (parts.length === 2) {
        return {
          code: parts[0].trim(),
          name: parts[1].trim(),
        };
      }
    }
    return null;
  }
}

/**
 * Load complete configuration
 */
export function loadConfig(configPath?: string, engineType?: EngineType): Config {
  const loader = new ConfigLoader();
  return loader.loadConfig(configPath, engineType);
}

/**
 * @deprecated Use DEFAULT_TARGET_LANGUAGES instead
 */
export const TARGET_LANGUAGES: LanguageConfig[] = DEFAULT_TARGET_LANGUAGES;

/**
 * @deprecated Use loadConfig() instead
 */
export function loadTargetLanguages(configPath?: string): LanguageConfig[] {
  const config = loadConfig(configPath);
  return config.languages;
}
