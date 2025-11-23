/**
 * Configuration Constants
 */

import { EngineType } from '@domain/engines';
import { LanguageConfig } from './config.types';

export const DEFAULT_ENGINE: EngineType = 'google';

export const DEFAULT_TARGET_LANGUAGES: LanguageConfig[] = [
  { code: 'en', name: '英语' },
  { code: 'de', name: '德语' },
  { code: 'fr', name: '法语' },
  { code: 'es', name: '西班牙语' },
  { code: 'ru', name: '俄语' },
  { code: 'el', name: '希腊语' },
  { code: 'hi', name: '印地语' },
  { code: 'ar', name: '阿拉伯语' },
  { code: 'ja', name: '日语' },
  { code: 'zh-CN', name: '汉语' },
  { code: 'ko', name: '韩语' },
];

export const REQUEST_TIMEOUT = 10000;
export const MAX_RETRIES = 3;
