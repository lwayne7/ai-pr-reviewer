# AI PR Reviewer (AI 代码评审助手)

AI PR Reviewer 是一款面向开发者的**高颜值、零后端、纯客户端运行**的 AI 辅助代码评审工具。它可以帮助团队大幅提升 Pull Request (PR) 审查效率，智能识别代码缺陷与安全风险，并自动生成行级重构建议，支持将 AI 审查结果直接写回 GitHub。

---

## 🌟 核心功能

1. **PR 变更智能总结 (PR Summary)**: 自动对 PR 进行高层级的功能描述与架构影响评估，列出关键修改点，并给出直观的代码变更比例。
2. **AI 风险评级 (Risk Evaluation)**: 综合评估代码风险，输出百分制风险评分（Green-Amber-Red），并在风险说明中指出最关键的潜在缺陷。
3. **交互式 diff 审查 (Diff Explorer)**: 还原类似 GitHub/GitLab 的经典代码 diff 视图。AI 行级评审建议会直接**嵌入在新增/修改的代码行下方**，包括详细的问题分析及一键复制的重构代码。
4. **一键同步至 GitHub (GitHub Integration)**: 用户可选择一键将 AI 生成的报告及所有行级审查建议直接作为 Code Review comments 发表到 GitHub PR 中。
5. **本地隐私安全**: 所有的 API 请求与数据解析均在浏览器客户端直接完成，您的 GitHub PAT 和 Gemini 密钥均保存在本地 `localStorage`，绝不上传到任何第三方中转服务器，保障企业代码安全。

---

## 🛠️ 技术栈与依赖项

- **核心框架**: React 18 (TypeScript) + Vite
- **代码语言**: TypeScript, JSX/TSX
- **样式系统**: Vanilla CSS (极客风暗黑拟物玻璃态设计, Flexbox & CSS Grid, CSS Keyframe 动画)
- **大模型 SDK**: `@google/generative-ai`

---

## 🚀 快速开始

### 1. 克隆与安装依赖

```bash
git clone https://github.com/lwayne7/ai-pr-reviewer.git
cd ai-pr-reviewer
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```
打开浏览器访问控制台输出的地址（默认为 `http://localhost:3000`）。

### 3. 构建打包

```bash
npm run build
```

---

## 🎯 深度设计思路与技术决策

### 1. 模型选择 (Model Selection)
系统支持在前端直接进行模型切换：
- **Gemini 2.5 Flash (默认)**: 我们选用其作为默认分析模型。它拥有极快的响应速度（低延迟）和出色的性价比。更重要的是，它拥有 **100万 tokens 的超大上下文窗口**，且对结构化 JSON（Structured Outputs）输出的支持非常精准，在低温度系数下能严格按照给定的 Schema 生成标准 JSON。
- **Gemini 1.5 Pro (深度推理)**: 针对特别复杂、涉及大范围重构或算法逻辑调整的 PR，用户可切换至 1.5 Pro。该模型具备更强的常识推理和逻辑归纳能力，能更好地识别深层次的死锁、边界漏洞和多线程竞态问题。

### 2. 上下文获取与解析方式 (Context Acquisition)
- **获取机制**: 应用利用 GitHub REST API，在用户提供 GITHUB_TOKEN 后，以标准请求抓取 PR 描述、元数据及 Changed Files。针对每个变更文件，直接抓取其包含 diff 信息的内容。
- **Diff 差异解析器**: 我们在客户端实现了一个轻量高效的 Git Patch Parser (`src/services/github.ts -> parsePatch`)。它将 Git 的 `@@ -l,s +r,a @@` 格式 Diff 块解析为包含行号映射的结构化对象。这一设计使得我们可以：
  1. 精准提取出哪些行是**真正新增或修改过的（右侧行号存在，且非上下文行）**。
  2. 保证 AI 给出的行号在目标文件中真实存在，避免 AI 在未改动的代码行上进行“无端猜测”或给出越界的行号。

### 3. 误报与漏报控制 (Noise Control)
AI 评审最大的痛点在于“幻觉”和“过度报错（噪点）”。本系统从以下几个维度进行了严格控制：
- **System Instruction 角色定义**: 注入 Senior Auditor 角色指令，严禁大模型对空格、换行、拼写及个人风格等非关键问题报错。
- **低温度设置 (Temperature = 0.1)**: 极低温度可以极大降低模型的发散性与不确定性，保证输出稳定且逻辑高度一致。
- **行号边界约束**: 严格要求模型只对修改的行进行评论。在提示词中明确告知：只允许对右侧 diff 新增的行生成 `AIReviewComment`，避免大模型“点评”无关历史代码。
- **Structured Output 约束**: 采用 `responseSchema` 强制让模型返回特定 Schema，对于没有发现漏洞的文件，直接返回空数组 `[]`，防止模型胡乱填充信息。

### 4. 未来扩展方向 (Future Roadmap)
- **CI/CD 及 GitHub Action 集成**: 将此核心分析模块打包为 GitHub Action。在开发者提交 PR 时自动触发，生成 AI Review 并直接提交到 PR，实现开发周期的完全自动化。
- **跨文件全局 RAG 辅助**: 当 diff 很大或涉及其他未修改文件中的类/接口定义时，利用大上下文的优势，自动将相关的依赖文件或类签名注入到 Prompt 中，提供更加准确的跨文件上下文感知。
- **一键 Apply 建议 (Auto-Fix Commit)**: 在 Web 端和 GitHub 评论区提供“Apply Correction”按钮，直接通过 Git Tree API 在该 PR 分支上生成一次新的 commit，免去开发者手动修改的步骤。

---

## 📄 许可证

本项目基于 MIT 协议开源。
