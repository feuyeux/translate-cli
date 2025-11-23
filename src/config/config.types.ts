/**
 * Configuration Type Definitions
 */

import { EngineType } from '@domain/engines';

export interface LanguageConfig {
  code: string;
  name: string;
}

export interface Config {
  languages: LanguageConfig[];
  engineType: EngineType;
}
