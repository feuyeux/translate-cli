# 实现计划

- [x] 1. 配置 TypeScript 路径别名和构建设置
  - 在 tsconfig.json 中添加 baseUrl 和 paths 配置
  - 配置路径别名：@domain, @infrastructure, @application, @presentation, @config, @validation, @types
  - 更新 jest.config.js 添加 moduleNameMapper 以支持路径别名
  - _需求：9.4_

- [x] 2. 创建新的目录结构
  - 创建 src/domain/engines/ 目录
  - 创建 src/infrastructure/http/ 和 src/infrastructure/errors/ 目录
  - 创建 src/application/services/ 目录
  - 创建 src/presentation/cli/ 和 src/presentation/formatters/ 目录
  - 创建 src/config/ 目录
  - 创建 src/validation/ 目录
  - 创建 src/types/ 目录（如果需要共享类型）
  - _需求：1.1, 1.2_

- [x] 3. 重构领域层 - 翻译引擎模块
  - [x] 3.1 提取引擎接口定义
    - 创建 src/domain/engines/engine.interface.ts
    - 从 engines.ts 提取 TranslationRequest, TranslationResult, ITranslationEngine, EngineType 接口
    - _需求：3.3_
  
  - [x] 3.2 提取 Google 翻译引擎
    - 创建 src/domain/engines/google-engine.ts
    - 从 engines.ts 移动 GoogleTranslationEngine 类和 ErrorMessageGenerator 类
    - 更新导入路径使用新的接口文件
    - _需求：3.2_
  
  - [x] 3.3 提取 Bing 翻译引擎
    - 创建 src/domain/engines/bing-engine.ts
    - 从 engines.ts 移动 BingTranslationEngine 类
    - 更新导入路径使用新的接口文件和 ErrorMessageGenerator
    - _需求：3.2_
  
  - [x] 3.4 提取引擎工厂
    - 创建 src/domain/engines/engine-factory.ts
    - 从 engines.ts 移动 TranslationEngineFactory 类
    - 更新导入路径
    - _需求：3.4_
  
  - [x] 3.5 创建领域层 barrel exports
    - 创建 src/domain/engines/index.ts 导出所有引擎相关内容
    - 创建 src/domain/index.ts 导出领域层内容
    - _需求：1.3, 3.5_

- [x] 4. 重构基础设施层 - HTTP 和错误处理
  - [x] 4.1 提取 HTTP 错误类
    - 创建 src/infrastructure/errors/http-error.ts
    - 从 http-client.ts 移动 HTTPError 类
    - _需求：5.2, 5.4_
  
  - [x] 4.2 重构 HTTP 客户端
    - 创建 src/infrastructure/http/http-client.ts
    - 从 src/http-client.ts 移动 HTTPClient 类和 HTTPOptions 接口
    - 更新导入路径使用新的 HTTPError 位置
    - _需求：5.1, 5.3_
  
  - [x] 4.3 创建基础设施层 barrel exports
    - 创建 src/infrastructure/errors/index.ts 导出错误类
    - 创建 src/infrastructure/http/index.ts 导出 HTTP 客户端
    - 创建 src/infrastructure/index.ts 导出所有基础设施组件
    - _需求：1.3, 5.5_

- [x] 5. 重构配置管理模块
  - [x] 5.1 提取配置类型定义
    - 创建 src/config/config.types.ts
    - 从 config.ts 移动 LanguageConfig 和 Config 接口
    - _需求：4.3_
  
  - [x] 5.2 提取配置常量
    - 创建 src/config/config.constants.ts
    - 从 config.ts 移动 DEFAULT_ENGINE, DEFAULT_TARGET_LANGUAGES, REQUEST_TIMEOUT, MAX_RETRIES
    - _需求：4.4_
  
  - [x] 5.3 重构配置加载器
    - 创建 src/config/config-loader.ts
    - 从 config.ts 移动 ConfigLoader 类和 loadConfig 函数
    - 更新导入路径使用新的类型和常量文件
    - 保留 TARGET_LANGUAGES 和 loadTargetLanguages 的废弃导出以保持向后兼容
    - _需求：4.2_
  
  - [x] 5.4 创建配置模块 barrel exports
    - 创建 src/config/index.ts 导出所有配置相关内容
    - 确保导出废弃的 API 以保持向后兼容
    - _需求：1.3, 4.5_

- [x] 6. 重构验证逻辑模块
  - [x] 6.1 提取验证类型定义
    - 创建 src/validation/validation.types.ts
    - 从 validation.ts 移动 ValidationResult 接口
    - _需求：6.3_
  
  - [x] 6.2 创建语言验证器
    - 创建 src/validation/language-validator.ts
    - 从 validation.ts 移动 validateLanguageCode 和 getValidLanguageCodes 函数
    - 更新导入路径
    - _需求：6.2_
  
  - [x] 6.3 创建文本验证器
    - 创建 src/validation/text-validator.ts
    - 从 validation.ts 移动 validateText 函数
    - 更新导入路径
    - _需求：6.2_
  
  - [x] 6.4 创建输入验证器
    - 创建 src/validation/input-validator.ts
    - 从 validation.ts 移动 validateInput 函数
    - 更新导入路径使用新的验证器文件
    - _需求：6.2_
  
  - [x] 6.5 创建验证模块 barrel exports
    - 创建 src/validation/index.ts 导出所有验证相关内容
    - _需求：1.3, 6.5_

- [x] 7. 重构应用层 - 翻译服务
  - [x] 7.1 重构翻译服务
    - 创建 src/application/services/translation-service.ts
    - 从 src/translator.ts 移动 TranslationService 类
    - 更新导入路径使用路径别名（@domain, @infrastructure, @config）
    - _需求：8.1, 8.2, 8.4_
  
  - [x] 7.2 创建应用层 barrel exports
    - 创建 src/application/services/index.ts 导出翻译服务
    - 创建 src/application/index.ts 导出所有应用服务
    - _需求：1.3, 8.5_

- [x] 8. 重构表示层 - CLI 和格式化器
  - [x] 8.1 重构结果格式化器
    - 创建 src/presentation/formatters/result-formatter.ts
    - 从 src/formatter.ts 移动 ResultFormatter 类和 FormatterOptions 接口
    - 更新导入路径使用路径别名
    - _需求：7.1, 7.3_
  
  - [x] 8.2 重构 CLI 入口
    - 创建 src/presentation/cli/cli.ts
    - 从 src/cli.ts 移动所有 CLI 代码
    - 更新导入路径使用路径别名（@validation, @application, @presentation, @config, @domain）
    - 保持 shebang (#!/usr/bin/env node) 在文件顶部
    - _需求：7.2, 7.4_
  
  - [x] 8.3 创建表示层 barrel exports
    - 创建 src/presentation/formatters/index.ts 导出格式化器
    - 创建 src/presentation/cli/index.ts 导出 CLI
    - 创建 src/presentation/index.ts 导出所有表示层组件
    - _需求：1.3, 7.5_

- [x] 9. 更新测试文件
  - [x] 9.1 更新边界测试文件
    - 移动 src/engines.boundary.test.ts 到 src/domain/engines/engines.boundary.test.ts
    - 更新所有导入路径使用新的模块结构
    - 更新 MockHTTPClient 的导入路径
    - _需求：9.2_

- [x] 10. 更新 package.json 构建配置
  - 更新 bin 字段指向新的 CLI 位置：./dist/presentation/cli/cli.js
  - 验证 main 字段是否需要更新
  - _需求：9.5_

- [x] 11. 删除旧文件
  - 删除 src/cli.ts
  - 删除 src/config.ts
  - 删除 src/engines.ts
  - 删除 src/formatter.ts
  - 删除 src/http-client.ts
  - 删除 src/translator.ts
  - 删除 src/validation.ts
  - _需求：1.1_

- [x] 12. 第一次检查点 - 验证编译和测试
  - 运行 `npm run build` 确保 TypeScript 编译成功
  - 运行 `npm test` 确保所有测试通过
  - 检查 dist/ 目录结构是否与 src/ 一致
  - 如果有问题，询问用户并解决
  - _需求：9.1, 9.2, 9.5, 10.1_

- [ ]* 13. 编写结构验证测试
  - [ ]* 13.1 编写文件命名约定测试
    - 创建测试验证所有文件使用 kebab-case 命名
    - **属性 1: 文件命名遵循 kebab-case**
    - **验证：需求 2.1**
  
  - [ ]* 13.2 编写类命名约定测试
    - 创建测试验证所有类使用 PascalCase 命名
    - **属性 2: 类命名遵循 PascalCase**
    - **验证：需求 2.2**
  
  - [ ]* 13.3 编写接口命名约定测试
    - 创建测试验证所有接口使用 PascalCase 且不使用 I 前缀
    - **属性 3: 接口命名遵循 PascalCase 且不使用 I 前缀**
    - **验证：需求 2.3**
  
  - [ ]* 13.4 编写方法命名约定测试
    - 创建测试验证所有方法使用 camelCase 命名
    - **属性 4: 方法命名遵循 camelCase**
    - **验证：需求 2.4**
  
  - [ ]* 13.5 编写常量命名约定测试
    - 创建测试验证所有导出常量使用 UPPER_SNAKE_CASE 命名
    - **属性 5: 导出常量命名遵循 UPPER_SNAKE_CASE**
    - **验证：需求 2.5**
  
  - [ ]* 13.6 编写依赖关系验证测试
    - 创建测试验证应用层服务依赖于接口而非具体实现
    - **属性 6: 服务依赖于接口而非具体实现**
    - **验证：需求 8.4**
  
  - [ ]* 13.7 编写导入路径验证测试
    - 创建测试验证导入语句优先使用 barrel exports
    - **属性 7: 导入语句优先使用 barrel exports**
    - **验证：需求 9.3**
  
  - [ ]* 13.8 编写构建输出结构测试
    - 创建测试验证 dist/ 目录结构与 src/ 一致
    - **属性 8: 构建输出结构与源代码结构一致**
    - **验证：需求 9.5**

- [ ]* 14. 编写 API 兼容性测试
  - 创建测试验证所有公共 API 仍然可以通过旧的方式导入
  - 测试配置加载、翻译服务、引擎工厂等公共接口
  - **属性 9: 公共 API 保持向后兼容**
  - **验证：需求 10.3**

- [x] 15. 手动端到端测试
  - 运行 CLI 命令测试基本翻译功能：`npm run dev ko "안녕하세요"`
  - 测试使用配置文件：`npm run dev -c languages.conf.example ko "안녕하세요"`
  - 测试引擎选择：`npm run dev -e bing ko "안녕하세요"`
  - 测试代理选项：`npm run dev -p 127.0.0.1:8080 ko "안녕하세요"`
  - 测试错误场景：无效语言代码、空文本等
  - 验证输出格式和错误消息与重构前一致
  - _需求：10.2, 10.4, 10.5_

- [x] 16. 最终检查点 - 完整验证
  - 确保所有测试通过
  - 确保 CLI 功能正常
  - 确保构建输出正确
  - 确保文档已更新（如果需要）
  - 询问用户是否有其他问题
