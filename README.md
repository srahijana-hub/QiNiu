# AI 语音绘图工具

一句话，画出你想象中的画面。

用户通过语音或文字描述想要绘制的内容，AI 自动生成高质量图片并展示在画布上。

## 演示视频

B站链接： https://b23.tv/hRav7bh

[![演示视频](https://img.shields.io/badge/演示视频-点击观看-red?style=for-the-badge)](https://b23.tv/hRav7bh)

## 效果展示

![56ca291327d47276b4d890c88a7837ca](D:\QiNiu\public\56ca291327d47276b4d890c88a7837ca.png)

![63a24c6c37a40630dc1b542e5ada2546](D:\QiNiu\public\63a24c6c37a40630dc1b542e5ada2546.png)

## 功能特性

- **语音输入** — 点击录音按钮，说出你想画的内容，AI 自动识别并生成图片
- **文字输入** — 不方便说话时，也可以直接输入文字描述
- **AI 生图** — 接入阿里云百炼 qwen-image-2.0 模型，生成高质量 1024x1024 图片
- **语音识别** — 基于 MiMo ASR，录音后自动转文字
- **图片保存** — 一键将生成的图片保存为 PNG 文件
- **暖色调 UI** — 简洁美观的左侧面板 + 右侧画布布局

## 技术架构

```
输入层：MediaRecorder 录音 → webm 转 WAV → MiMo ASR 语音识别
   ↓
处理层：qwen-image-2.0 生图模型（阿里云百炼）
   ↓
展示层：HTML5 Canvas 图片渲染
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| 语音识别 | MiMo ASR (mimo-v2.5-asr) |
| AI 生图 | qwen-image-2.0（阿里云百炼） |
| 画布渲染 | HTML5 Canvas API |
| 代理配置 | Vite Dev Server Proxy |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
VITE_LLM_API_KEY=你的MiMo_API_Key
VITE_LLM_API_URL=/api/chat/completions
VITE_LLM_MODEL=mimo-v2.5
VITE_ASR_MODEL=mimo-v2.5-asr
VITE_DASHSCOPE_API_KEY=你的阿里云百炼API_Key
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173` 即可使用。

## 项目结构

```
src/
├── components/         # UI 组件
│   └── Canvas.tsx      # 画布组件
├── core/
│   ├── speech/         # 语音识别模块（MiMo ASR）
│   ├── image/          # AI 生图模块（qwen-image-2.0）
│   ├── llm/            # LLM 指令解析
│   ├── nlu/            # NLU 规则引擎（降级方案）
│   ├── canvas/         # Canvas 绘图引擎
│   └── executor/       # 指令执行器
├── hooks/              # 自定义 Hooks
├── store/              # Zustand 状态管理
├── types/              # TypeScript 类型定义
├── App.tsx             # 主应用组件
├── App.css             # 应用样式
└── index.css           # 全局设计系统
```

## API 接口

详细的后端 API 文档请参考 [API 文档](./API文档.md)。

### 核心模块

| 模块 | 文件 | 说明 |
|------|------|------|
| 语音识别 | `src/core/speech/SpeechRecognizer.ts` | 录音 → WAV → MiMo ASR |
| AI 生图 | `src/core/image/ImageGenerator.ts` | qwen-image-2.0 生图 |
| LLM 解析 | `src/core/llm/LLMService.ts` | 自然语言 → 结构化指令 |
| 规则引擎 | `src/core/nlu/RuleEngine.ts` | LLM 降级方案 |

## 使用流程

1. 打开应用，点击 **开始录音** 按钮
2. 说出你想画的内容，例如"画一只猫坐在月亮上"
3. 点击 **停止录音**，AI 自动识别语音并生成图片
4. 生成完成后可以 **保存图片** 或 **清空画布** 重新创作
5. 也可以直接在文字输入框中输入描述，点击 **生成**

## 注意事项

- 需要麦克风权限才能使用语音输入
- 生图模型有内容审核，涉及版权内容（如知名动漫角色）会被 API 拦截
- 图片生成需要几秒钟，请耐心等待
- 建议使用 Chrome 浏览器以获得最佳体验
