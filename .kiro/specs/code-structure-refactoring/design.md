# 设计文档

## 概述

本设计文档描述了批量翻译 CLI 工具的代码结构重构方案。当前代码采用扁平化结构，所有模块文件直接位于 `src/` 目录下。重构目标是将代码重新组织为分层架构，提高可维护性、可测试性和可扩展性。

### 当前结构

```
src/
├── cli.ts                    # CLI 入口点
├── config.ts                 # 配置加载
├── engines.ts                # 翻译引擎实现
├── formatter.ts              # 结果格式化
├── http-client.ts            # HTTP 客户端
├── translator.ts             # 翻译服务
├── validation.ts             # 输入验证
└── engines.boundary.test.ts  # 边界测试
```

### 目标结构

```
src/
├── domain/                   # 领域层
│   ├── engines/             # 翻译引擎
│   │   ├── engine.interface.ts
│   │   ├── google-engine.ts
│   │   ├── bing-engine.ts
│   │   ├── engine-factory.ts
│   │   └── index.ts
│   └── index.ts
├── infrastructure/          # 基础设施层
│   ├── http/
│   │   ├── http-client.ts
│   │   └── index.ts
│   ├── errors/
│   │   ├── http-error.ts
│   │   └── index.ts
│   └── index.ts
├── application/             # 应用层
│   ├── services/
│   │   ├── translation-service.ts
│   │   └── index.ts
│   └── index.ts
├── presentation/            # 表示层
│   ├── cli/
│   │   ├── cli.ts
│   │   └── index.ts
│   ├── formatters/
│   │   ├── result-formatter.ts
│   │   └── index.ts
│   └── index.ts
├── config/                  # 配置管理
│   ├── config.types.ts
│   ├── config.constants.ts
│   ├── config-loader.ts
│   └── index.ts
├── validation/              # 验证逻辑
│   ├── validation.types.ts
│   ├── language-validator.ts
│   ├── text-validator.ts
│   ├── input-validator.ts
│   └── index.ts
└── types/                   # 共享类型
    └── index.ts
```

## 架构

### 分层架构原则

本重构采用经典的分层架构模式，将系统划分为四个主要层次：

1. **领域层 (Domain Layer)**: 包含核心业务逻辑和领域模型，不依赖于外部技术实现
2. **基础设施层 (Infrastructure Layer)**: 处理外部服务交互、网络通信、错误处理等技术细节
3. **应用层 (Application Layer)**: 协调领域层和基础设施层，实现用例编排
4. **表示层 (Presentation Layer)**: 处理用户界面交互、输入输出格式化

### 依赖关系

```
表示层 → 应用层 → 领域层
           ↓
      基础设施层
```

- 表示层依赖应用层
- 应用层依赖领域层和基础设施层
- 领域层不依赖其他层（依赖倒置）
- 基础设施层实现领域层定义的接口

## 组件和接口

### 1. 领域层 (Domain Layer)

#### 1.1 翻译引擎接口

**文件**: `src/domain/engines/engine.interface.ts`

```typescript
export interface TranslationRequest {
  sourceLanguage: string;
  targetLanguage: string;
  text: string;
}

export interface TranslationResult {
  targetLanguage: string;
  languageName: string;
  translatedText: string;
  success: boolean;
  error?: string;
}

export interface ITranslationEngine {
  translate(request: TranslationRequest): Promise<TranslationResult>;
  getName(): string;
}

export type EngineType = 'google' | 'bing';
```

**职责**:
- 定义翻译引擎的通用接口
- 定义请求和响应的数据结构
- 支持的引擎类型枚举

#### 1.2 Google 翻译引擎

**文件**: `src/domain/engines/google-engine.ts`

**职责**:
- 实现 Google Translate API 的响应解析
- 处理 Google 特定的响应格式（嵌套数组结构）
- 过滤无效的翻译片段（null、undefined、空字符串）
- 生成统一的错误消息

**关键方法**:
- `translate()`: 执行翻译请求
- `parseTranslationResponse()`: 解析 Google API 响应
- `buildTranslateUrl()`: 构建请求 URL

#### 1.3 Bing 翻译引擎

**文件**: `src/domain/engines/bing-engine.ts`

**职责**:
- 实现 Bing Translator API 的响应解析
- 处理 Bing 特定的响应格式（translations 数组）
- 验证响应结构的每一层
- 生成统一的错误消息

**关键方法**:
- `translate()`: 执行翻译请求
- `parseTranslationResponse()`: 解析 Bing API 响应
- `buildTranslateUrl()`: 构建请求 URL

#### 1.4 引擎工厂

**文件**: `src/domain/engines/engine-factory.ts`

**职责**:
- 创建翻译引擎实例
- 提供可用引擎类型查询
- 验证引擎类型有效性

**关键方法**:
- `createEngine()`: 根据类型创建引擎实例
- `getAvailableEngines()`: 获取所有可用引擎类型

### 2. 基础设施层 (Infrastructure Layer)

#### 2.1 HTTP 客户端

**文件**: `src/infrastructure/http/http-client.ts`

**职责**:
- 执行 HTTP GET/POST 请求
- 实现指数退避重试逻辑
- 处理超时和网络错误
- 支持代理配置
- 将 axios 错误转换为统一的 HTTPError

**关键特性**:
- 可配置的超时时间（默认 10 秒）
- 可配置的重试次数（默认 3 次）
- 智能重试策略（仅重试瞬态错误）
- 代理支持（使用 https-proxy-agent）

#### 2.2 HTTP 错误

**文件**: `src/infrastructure/errors/http-error.ts`

**职责**:
- 定义统一的 HTTP 错误类
- 包含状态码和原始错误信息
- 支持错误分类（网络错误 vs HTTP 错误）

**错误类型**:
- 网络错误：无状态码（超时、连接失败、DNS 解析失败）
- HTTP 错误：有状态码（429 限流、5xx 服务器错误等）

### 3. 应用层 (Application Layer)

#### 3.1 翻译服务

**文件**: `src/application/services/translation-service.ts`

**职责**:
- 协调翻译引擎和 HTTP 客户端
- 实现批量翻译逻辑
- 管理目标语言配置
- 处理并发翻译请求
- 映射语言代码到语言名称

**关键方法**:
- `translate()`: 单个翻译请求
- `batchTranslate()`: 批量翻译到多个目标语言
- 使用 `Promise.allSettled()` 确保单个失败不影响其他翻译

**设计决策**:
- 支持两种构造函数签名以保持向后兼容
- 使用工厂模式创建翻译引擎
- 并发执行所有翻译请求以提高性能

### 4. 表示层 (Presentation Layer)

#### 4.1 CLI 入口

**文件**: `src/presentation/cli/cli.ts`

**职责**:
- 解析命令行参数
- 加载配置
- 验证输入
- 调用翻译服务
- 格式化和显示结果
- 处理错误和退出码

**使用的库**:
- `commander`: 命令行参数解析
- 支持选项：`--proxy`, `--config`, `--engine`

#### 4.2 结果格式化器

**文件**: `src/presentation/formatters/result-formatter.ts`

**职责**:
- 格式化翻译结果为可读输出
- 使用颜色区分成功和失败（chalk）
- 按预定义语言顺序排序结果
- 规范化错误消息格式
- 可选显示引擎名称

**格式化规则**:
- 成功：绿色显示 "语言名: 翻译文本"
- 失败：红色显示 "语言名: [错误] 错误消息"
- 结果按 `TARGET_LANGUAGES` 中的顺序排序

### 5. 配置管理 (Config)

#### 5.1 配置类型

**文件**: `src/config/config.types.ts`

**职责**:
- 定义配置相关的 TypeScript 接口
- `LanguageConfig`: 语言代码和名称
- `Config`: 完整配置对象（语言列表 + 引擎类型）

#### 5.2 配置常量

**文件**: `src/config/config.constants.ts`

**职责**:
- 定义默认配置值
- `DEFAULT_ENGINE`: 默认翻译引擎（google）
- `DEFAULT_TARGET_LANGUAGES`: 默认目标语言列表
- `REQUEST_TIMEOUT`: 请求超时时间（10000ms）
- `MAX_RETRIES`: 最大重试次数（3）

#### 5.3 配置加载器

**文件**: `src/config/config-loader.ts`

**职责**:
- 从文件系统加载配置文件
- 解析配置文件内容
- 处理多种分隔符（:, =, ,）
- 支持注释行（# 开头）
- 实现配置优先级逻辑

**配置优先级**:
1. 命令行选项（`--config`, `--engine`）
2. 环境变量（`TRANSLATE_CONFIG_PATH`, `TRANSLATE_ENGINE`）
3. 默认位置（`./languages.conf`）
4. 内置默认值

**配置文件格式**:
```
# 翻译引擎
engine=google

# 目标语言
en:English
de:German
fr:French
```

### 6. 验证逻辑 (Validation)

#### 6.1 验证类型

**文件**: `src/validation/validation.types.ts`

**职责**:
- 定义验证结果接口
- `ValidationResult`: 包含 valid 标志和错误列表

#### 6.2 语言验证器

**文件**: `src/validation/language-validator.ts`

**职责**:
- 验证语言代码格式（2-5 字符，可包含连字符）
- 验证语言代码是否在支持列表中
- 生成有效语言代码集合

**验证规则**:
- 格式：`/^[a-z]{2}(-[A-Z]{2})?$/`（例如：en, zh-CN）
- 支持的代码：目标语言 + 常见源语言代码

#### 6.3 文本验证器

**文件**: `src/validation/text-validator.ts`

**职责**:
- 验证文本不为空
- 验证文本不是纯空白字符
- 类型检查（确保是字符串）

#### 6.4 输入验证器

**文件**: `src/validation/input-validator.ts`

**职责**:
- 组合语言和文本验证
- 聚合所有验证错误
- 提供统一的验证入口点

## 数据模型

### TranslationRequest

```typescript
interface TranslationRequest {
  sourceLanguage: string;  // 源语言代码（例如：'ko', 'en'）
  targetLanguage: string;  // 目标语言代码（例如：'en', 'zh-CN'）
  text: string;           // 待翻译文本
}
```

### TranslationResult

```typescript
interface TranslationResult {
  targetLanguage: string;   // 目标语言代码
  languageName: string;     // 人类可读的语言名称
  translatedText: string;   // 翻译后的文本（失败时为空字符串）
  success: boolean;         // 翻译是否成功
  error?: string;          // 错误消息（格式：[引擎名] 错误描述）
}
```

### LanguageConfig

```typescript
interface LanguageConfig {
  code: string;  // 语言代码（例如：'en', 'zh-CN'）
  name: string;  // 语言名称（例如：'英语', '汉语'）
}
```

### Config

```typescript
interface Config {
  languages: LanguageConfig[];  // 目标语言列表
  engineType: EngineType;       // 翻译引擎类型
}
```

### HTTPError

```typescript
class HTTPError extends Error {
  message: string;           // 用户友好的错误描述
  statusCode?: number;       // HTTP 状态码（网络错误时为 undefined）
  originalError?: Error;     // 原始错误对象（用于调试）
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;    // 验证是否通过
  errors: string[];  // 错误消息列表
}
```

## 正确性属性

*属性是系统所有有效执行中应该保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性反思

在分析需求文档中的接受标准后，我们识别出以下可测试的属性。大多数需求是关于代码组织和文件结构的，这些主要通过示例测试来验证（检查特定文件是否存在于正确位置）。少数需求涉及命名约定和 API 兼容性，这些可以作为属性进行测试。

**冗余性分析**：
- 命名约定属性（2.1-2.5）各自验证不同的命名规则，不存在冗余
- 文件结构示例（3.1-8.5）验证不同的目录和文件，不存在冗余
- 向后兼容性属性（10.3）独立验证 API 兼容性

### 属性 1: 文件命名遵循 kebab-case

*对于任意* 源代码文件，其文件名应该使用 kebab-case 格式（小写字母和连字符）

**验证：需求 2.1**

### 属性 2: 类命名遵循 PascalCase

*对于任意* TypeScript 类声明，其类名应该使用 PascalCase 格式（每个单词首字母大写）

**验证：需求 2.2**

### 属性 3: 接口命名遵循 PascalCase 且不使用 I 前缀

*对于任意* TypeScript 接口声明，其接口名应该使用 PascalCase 格式且不以字母 "I" 开头

**验证：需求 2.3**

### 属性 4: 方法命名遵循 camelCase

*对于任意* TypeScript 类方法，其方法名应该使用 camelCase 格式（首字母小写，后续单词首字母大写）

**验证：需求 2.4**

### 属性 5: 导出常量命名遵循 UPPER_SNAKE_CASE

*对于任意* 导出的常量声明，其常量名应该使用 UPPER_SNAKE_CASE 格式（全大写字母和下划线）

**验证：需求 2.5**

### 属性 6: 服务依赖于接口而非具体实现

*对于任意* 应用层服务类，其导入语句应该引用领域层接口，而不是直接引用基础设施层的具体实现类

**验证：需求 8.4**

### 属性 7: 导入语句优先使用 barrel exports

*对于任意* 跨目录的导入语句，应该优先从目录的 index.ts 文件导入，而不是直接导入具体文件

**验证：需求 9.3**

### 属性 8: 构建输出结构与源代码结构一致

*对于任意* 源代码目录结构，构建后的 dist/ 目录应该保持相同的目录层次结构

**验证：需求 9.5**

### 属性 9: 公共 API 保持向后兼容

*对于任意* 重构前导出的公共接口、类型和函数，重构后应该仍然可以通过相同的方式导入和使用

**验证：需求 10.3**

## 错误处理

### 错误处理策略

重构过程中的错误处理遵循以下原则：

1. **编译时错误优先**: 通过 TypeScript 类型系统在编译时捕获错误
2. **渐进式迁移**: 支持旧导入路径的临时兼容层，避免一次性破坏所有代码
3. **清晰的错误消息**: 当导入路径错误时，提供清晰的错误消息指导修复

### 重构过程中的错误类型

#### 1. 导入路径错误

**场景**: 文件移动后，旧的导入路径失效

**处理方式**:
- TypeScript 编译器会报告 "Cannot find module" 错误
- 使用 IDE 的自动导入功能或手动更新导入路径
- 通过 barrel exports (index.ts) 简化导入路径

**示例**:
```typescript
// 错误：旧路径
import { GoogleTranslationEngine } from './engines';

// 正确：新路径
import { GoogleTranslationEngine } from './domain/engines';
```

#### 2. 循环依赖错误

**场景**: 重构后可能引入循环依赖

**处理方式**:
- 遵循分层架构原则，确保依赖关系单向
- 使用依赖倒置原则，让高层模块依赖接口而非实现
- 如果发现循环依赖，重新审视模块职责划分

**预防措施**:
- 领域层不依赖其他层
- 应用层依赖领域层接口
- 基础设施层实现领域层接口
- 表示层依赖应用层

#### 3. 类型定义丢失

**场景**: 移动文件后类型定义未正确导出

**处理方式**:
- 确保每个目录的 index.ts 正确导出所有公共类型
- 使用 `export type` 和 `export interface` 明确导出类型
- 验证 tsconfig.json 的 declaration 选项已启用

#### 4. 测试文件导入错误

**场景**: 测试文件的导入路径需要更新

**处理方式**:
- 更新所有测试文件的导入路径
- 运行测试套件验证所有测试通过
- 使用相对路径或配置的路径别名

### 向后兼容性保证

为确保重构不破坏现有功能：

1. **保持公共 API 不变**: 所有导出的接口、类型和函数保持相同的签名
2. **保持配置格式不变**: 配置文件格式和加载逻辑不变
3. **保持错误消息不变**: 错误消息格式和内容保持一致
4. **保持 CLI 接口不变**: 命令行参数和选项保持不变

### 错误恢复策略

如果重构过程中遇到问题：

1. **使用版本控制**: 通过 Git 回滚到重构前的状态
2. **分步骤重构**: 每次只重构一个模块，逐步验证
3. **保持测试通过**: 每个步骤后运行测试，确保功能正常
4. **文档更新**: 及时更新导入路径文档

## 测试策略

### 测试方法

本重构项目采用以下测试方法：

#### 1. 单元测试

**目的**: 验证重构后各个模块的功能保持不变

**测试内容**:
- 翻译引擎的响应解析逻辑
- HTTP 客户端的重试和错误处理
- 配置加载和解析逻辑
- 输入验证逻辑
- 结果格式化逻辑

**测试工具**: Jest

**现有测试**:
- `engines.boundary.test.ts`: 边界情况测试（需要更新导入路径）

**测试原则**:
- 保持现有测试用例不变
- 仅更新导入路径
- 确保所有测试通过

#### 2. 集成测试

**目的**: 验证重构后各层之间的集成正常

**测试内容**:
- CLI → 应用层 → 领域层 → 基础设施层的完整流程
- 配置加载 → 翻译服务 → 引擎选择的集成
- 错误处理在各层之间的传播

**测试方法**:
- 使用真实的配置文件测试配置加载
- 使用 mock HTTP 客户端测试翻译流程
- 测试各种错误场景的处理

#### 3. 结构验证测试

**目的**: 验证代码结构符合设计要求

**测试内容**:
- 文件和目录结构是否正确
- 命名约定是否遵循（kebab-case, PascalCase, camelCase, UPPER_SNAKE_CASE）
- barrel exports 是否正确配置
- 依赖关系是否符合分层架构

**测试方法**:
- 编写自动化脚本检查文件结构
- 使用 ESLint 规则检查命名约定
- 使用静态分析工具检查依赖关系

#### 4. 编译测试

**目的**: 验证代码可以成功编译

**测试内容**:
- TypeScript 编译无错误
- 所有导入路径正确
- 类型定义完整

**测试方法**:
- 运行 `npm run build`
- 检查编译输出无错误
- 验证 dist/ 目录结构

#### 5. 端到端测试

**目的**: 验证 CLI 工具的完整功能

**测试内容**:
- 命令行参数解析
- 配置文件加载
- 翻译功能
- 错误处理和显示

**测试方法**:
- 手动运行 CLI 命令测试各种场景
- 验证输出格式和内容
- 测试各种错误情况

### 测试框架和工具

**单元测试框架**: Jest
- 已配置在项目中
- 支持 TypeScript (ts-jest)
- 支持 mock 和 spy

**属性测试库**: fast-check
- 已安装在项目中
- 用于生成随机测试数据
- 验证命名约定等属性

**静态分析工具**:
- TypeScript 编译器: 类型检查
- ESLint: 代码风格和命名约定检查
- Prettier: 代码格式化

### 测试执行顺序

1. **重构前**: 运行所有现有测试，确保通过
2. **重构中**: 每移动一个模块，更新导入路径并运行测试
3. **重构后**: 运行完整测试套件，包括：
   - 单元测试: `npm test`
   - 编译测试: `npm run build`
   - 端到端测试: 手动运行 CLI 命令
   - 结构验证: 运行自定义验证脚本

### 测试覆盖率目标

- 保持现有测试覆盖率不降低
- 重点测试重构后的导入路径和模块集成
- 确保所有公共 API 都有测试覆盖

## 实现计划

### 路径别名配置

为简化导入路径，在 `tsconfig.json` 中配置路径别名：

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@domain/*": ["domain/*"],
      "@infrastructure/*": ["infrastructure/*"],
      "@application/*": ["application/*"],
      "@presentation/*": ["presentation/*"],
      "@config/*": ["config/*"],
      "@validation/*": ["validation/*"],
      "@types/*": ["types/*"]
    }
  }
}
```

**优点**:
- 避免复杂的相对路径（`../../../`）
- 更清晰地表达模块所属层次
- 便于重构和移动文件

**使用示例**:
```typescript
// 使用路径别名
import { GoogleTranslationEngine } from '@domain/engines';
import { HTTPClient } from '@infrastructure/http';
import { TranslationService } from '@application/services';

// 而不是
import { GoogleTranslationEngine } from '../../../domain/engines';
```

### Barrel Exports 模式

每个目录使用 `index.ts` 统一导出：

**优点**:
- 简化导入语句
- 隐藏内部实现细节
- 便于重构内部结构

**示例**:

`src/domain/engines/index.ts`:
```typescript
export * from './engine.interface';
export * from './google-engine';
export * from './bing-engine';
export * from './engine-factory';
```

使用时：
```typescript
import { GoogleTranslationEngine, BingTranslationEngine, TranslationEngineFactory } from '@domain/engines';
```

### 渐进式迁移策略

1. **第一阶段**: 创建新目录结构，复制文件
2. **第二阶段**: 更新文件内容和导入路径
3. **第三阶段**: 创建 barrel exports (index.ts)
4. **第四阶段**: 更新所有导入语句使用新路径
5. **第五阶段**: 删除旧文件
6. **第六阶段**: 运行测试验证

### 重构检查清单

- [ ] 所有文件已移动到正确的目录
- [ ] 所有文件命名符合 kebab-case
- [ ] 所有类命名符合 PascalCase
- [ ] 所有接口命名符合 PascalCase 且无 I 前缀
- [ ] 所有方法命名符合 camelCase
- [ ] 所有导出常量命名符合 UPPER_SNAKE_CASE
- [ ] 每个目录都有 index.ts 文件
- [ ] 所有导入路径已更新
- [ ] tsconfig.json 已配置路径别名
- [ ] TypeScript 编译无错误
- [ ] 所有测试通过
- [ ] CLI 功能正常
- [ ] 构建输出结构正确
- [ ] 公共 API 保持兼容

## 设计决策和理由

### 决策 1: 采用分层架构

**理由**:
- 清晰的职责分离
- 便于测试和维护
- 支持未来扩展（添加新引擎、新功能）
- 符合 SOLID 原则

**权衡**:
- 增加了目录层次
- 需要更多的 barrel exports
- 但提高了代码可维护性

### 决策 2: 使用路径别名

**理由**:
- 避免复杂的相对路径
- 更清晰地表达模块层次
- 便于重构

**权衡**:
- 需要配置 tsconfig.json
- 需要配置 Jest 的 moduleNameMapper
- 但大大提高了代码可读性

### 决策 3: 保持向后兼容

**理由**:
- 不破坏现有功能
- 降低重构风险
- 用户无需修改配置

**权衡**:
- 限制了某些重构选项
- 但确保了平滑过渡

### 决策 4: 将 HTTPError 移到基础设施层

**理由**:
- HTTPError 是技术实现细节
- 与 HTTP 客户端紧密相关
- 符合基础设施层的职责

**权衡**:
- 需要更新所有引用 HTTPError 的地方
- 但使层次划分更清晰

### 决策 5: 翻译引擎放在领域层

**理由**:
- 翻译引擎包含核心业务逻辑（响应解析）
- 定义了翻译的领域模型
- 不依赖具体的 HTTP 实现（通过接口）

**权衡**:
- 引擎需要依赖 HTTP 客户端接口
- 但实现了依赖倒置

### 决策 6: 配置管理独立成模块

**理由**:
- 配置逻辑复杂（多种优先级、多种格式）
- 被多个层使用
- 便于测试和维护

**权衡**:
- 增加了一个顶层目录
- 但提高了配置管理的清晰度

### 决策 7: 验证逻辑独立成模块

**理由**:
- 验证逻辑可以被多个层使用
- 便于复用和测试
- 支持未来添加更多验证规则

**权衡**:
- 增加了一个顶层目录
- 但提高了验证逻辑的可维护性

## 总结

本设计文档描述了批量翻译 CLI 工具的代码结构重构方案。通过采用分层架构、路径别名和 barrel exports 模式，我们将提高代码的可维护性、可测试性和可扩展性。重构过程将保持向后兼容，确保所有现有功能正常工作。

