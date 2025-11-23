# Batch Translate CLI

批量翻译 CLI 工具，使用 Google Translate 将文本翻译成多种目标语言。

## 安装

```bash
npm install
npm run build
npm link
```

## 使用方法

### 基本用法

```bash
translate <源语言代码> <文本>
```

示例：
```bash
translate ko "안녕하세요"
translate en "Hello, world!"
```

### 使用代理

```bash
translate --proxy 127.0.0.1:8080 ko "안녕하세요"
translate -p 127.0.0.1:8080 en "Hello"
```

### 使用自定义配置文件

```bash
translate --config path/to/languages.conf ko "안녕하세요"
translate -c path/to/languages.conf ko "안녕하세요"
```

## 配置文件

### 配置文件格式

创建 `languages.conf` 文件来自定义目标语言列表：

```
# 注释以 # 开头
en:英语
de:德语
fr:法语
es:西班牙语
zh-CN:汉语
```

**支持的分隔符：** `:` (冒号), `,` (逗号), `=` (等号)

### 配置文件位置

1. 使用 `--config` 或 `-c` 选项指定路径
2. 设置环境变量 `TRANSLATE_CONFIG_PATH`
3. 当前目录下的 `languages.conf` 文件（默认）
4. 如果未找到配置文件，使用默认语言列表

### 默认目标语言

- 英语 (en)
- 德语 (de)
- 法语 (fr)
- 西班牙语 (es)
- 俄语 (ru)
- 希腊语 (el)
- 印地语 (hi)
- 阿拉伯语 (ar)
- 日语 (ja)
- 汉语 (zh-CN)
- 韩语 (ko)

## 命令行选项

```
Usage: translate [options] <source-language> <text>

Arguments:
  source-language      源语言代码 (例如: ko, en, ja)
  text                 要翻译的文本

Options:
  -V, --version        显示版本号
  -p, --proxy <proxy>  代理服务器 (例如: 127.0.0.1:8080)
  -c, --config <path>  配置文件路径 (默认: ./languages.conf)
  -h, --help           显示帮助信息
```

## 示例

```bash
$ translate -p 127.0.0.1:55497 ko "딸기"

翻译结果:

[google] 英语: strawberry
[google] 德语: Erdbeere
[google] 法语: fraise
[google] 西班牙语: fresa
[google] 俄语: клубника
[google] 希腊语: φράουλα
[google] 印地语: स्ट्रॉबेरी
[google] 阿拉伯语: الفراولة
[google] 日语: いちご
[google] 汉语: 草莓
[google] 韩语: 딸기
```
