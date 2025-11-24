#!/usr/bin/env node

/**
 * CLI Entry Point
 * Handles command-line argument parsing and orchestrates the translation workflow
 */

import { Command } from 'commander';
import { validateInput } from '@validation/index';
import { TranslationService } from '@application/services';
import { ResultFormatter } from '../formatters/result-formatter';
import { loadConfig } from '@config/index';
import { TranslationEngineFactory, EngineType } from '@domain/engines';

async function main() {
  const program = new Command();

  program
    .name('translate')
    .description('Batch translate text into multiple target languages')
    .version('1.0.0')
    .argument('<source-language>', 'Source language code (e.g., ko, en, ja)')
    .argument('<text>', 'Text to translate')
    .option('-p, --proxy <proxy>', 'Proxy server (e.g., 127.0.0.1:55497)')
    .option('-c, --config <path>', 'Path to configuration file (default: ./languages.conf)')
    .option('-e, --engine <type>', 'Translation engine to use (google|bing)', 'google')
    .option('-o, --output <path>', 'Save results to specified file')
    .action(
      async (
        sourceLanguage: string,
        text: string,
        options: { proxy?: string; config?: string; engine?: string; output?: string }
      ) => {
        let config;
        try {
          // Validate engine option against available engines
          const availableEngines = TranslationEngineFactory.getAvailableEngines();
          if (options.engine && !availableEngines.includes(options.engine as EngineType)) {
            console.error(`Invalid engine: ${options.engine}`);
            console.error(`Available engines: ${availableEngines.join(', ')}`);
            process.exit(1);
          }

          // Load configuration including languages and engine type
          config = loadConfig(options.config, options.engine as EngineType);

          // Validate input
          const validationResult = validateInput(sourceLanguage, text, config.languages);

          if (!validationResult.valid) {
            // Display validation errors
            console.error('输入验证失败:');
            validationResult.errors.forEach((error) => {
              console.error(`  - ${error}`);
            });
            process.exit(1);
          }

          // Perform batch translation
          const translationService = new TranslationService(
            config.engineType,
            undefined,
            options.proxy,
            config.languages
          );
          const targetLanguageCodes = config.languages.map((lang) => lang.code);
          const results = await translationService.batchTranslate(
            sourceLanguage,
            text,
            targetLanguageCodes
          );

          // Format and display results
          const formatter = new ResultFormatter();
          const output = formatter.format(results, { engineName: config.engineType });

          // Save to file if output path is specified
          if (options.output) {
            try {
              await formatter.saveToFile(output, options.output);
              console.log(`\n翻译结果已保存到: ${options.output}\n`);
            } catch (error) {
              console.error(`保存文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
              process.exit(1);
            }
          } else {
            // Display to console if no output file specified
            console.log('\n翻译结果:\n');
            console.log(output);
            console.log('');
          }
          process.exit(0);
        } catch (error) {
          // Handle unexpected errors
          const formatter = new ResultFormatter();
          if (error instanceof Error) {
            console.error(formatter.formatError(error, config?.engineType));
          } else {
            console.error('发生未知错误');
          }
          process.exit(1);
        }
      }
    );

  // Add help information about configuration and usage
  program.addHelpText(
    'after',
    `
翻译引擎:
  可以通过 --engine 或 -e 选项指定翻译引擎。
  
  可用引擎: google, bing
  
  引擎选择优先级:
    1. --engine 或 -e 命令行选项
    2. TRANSLATE_ENGINE 环境变量
    3. 配置文件中的 engine 设置
    4. 默认引擎 (google)

配置文件:
  可以通过配置文件自定义目标语言列表和默认翻译引擎。
  配置文件格式为每行一个语言:
    语言代码:语言名称
  
  支持的分隔符: : , =
  注释行以 # 开头
  
  配置文件位置 (按优先级):
    1. --config 或 -c 选项指定的路径
    2. TRANSLATE_CONFIG_PATH 环境变量指定的路径
    3. 当前目录下的 languages.conf 文件
    4. 如果未找到配置文件，使用默认语言列表

  配置文件示例:
    # 翻译引擎 (google 或 bing)
    engine=google
    
    # 目标语言配置
    en:English
    de:German
    fr:French
    zh-CN:Chinese

示例:
  $ translate ko "안녕하세요"
  $ translate en "Hello, world!"
  $ translate -c ./my-languages.conf ko "안녕하세요"
  $ translate -e bing ko "안녕하세요"
  $ translate --engine google en "Hello, world!"
  $ translate -o results.txt ko "안녕하세요"
  $ translate --output translations.txt en "Hello, world!"
  `
  );

  // Parse command-line arguments
  program.parse(process.argv);

  // If no arguments provided, show help
  if (process.argv.length <= 2) {
    program.help();
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
