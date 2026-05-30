# AI PR Reviewer (AI 代码评审助手)

AI PR Reviewer 是一款面向开发者的**高端拟物玻璃态极客风、本地服务端代理运行**的 AI 辅助代码评审工具。本项目采用 **React 18 + Vite** 作为前端页面，**Node.js Express** 作为安全代理后端，全面对接**阿里云通义千问（Qwen）大模型**。

开发人员无需在前端感知或输入任何 API Key，密钥被安全存放在本地后端的 `.env` 环境配置中，规避了浏览器端密钥泄露的风险。

---

## 🌟 核心功能

1. **零密钥前端体验 (Keyless Config)**：前端 UI 精简美观，仅需输入 PR 链接即可运行，大模型 Key 统一存放在本地 Express 后端代理，安全且方便。
2. **PR 变更智能总结 (PR Summary)**：自动对 PR 进行高层级的功能描述与架构影响评估，列出关键修改点，并给出直观的代码变更比例。
3. **AI 风险评级 (Risk Evaluation)**：综合评估代码风险，输出百分制风险评分（Green-Amber-Red），并在风险说明中指出最关键的潜在缺陷。
4. **嵌入式 diff 差分比对 (Visual Diff Box)**：还原经典 diff 视图。AI 评审建议会直接**嵌入在修改行下方**，包含原代码与重构建议代码的经典红/绿（`-` 与 `+`）行级对照，并支持一键复制。
5. **本地评审历史仪表盘 (Review History)**：本地自动持久化最近 10 条评审记录，点击即可瞬间加载历史快照，无需重复请求 API。
6. **一键同步至 GitHub (GitHub Integration)**：用户可选择一键将 AI 生成的报告及所有行级审查建议直接作为 Code Review comments 发表到 GitHub PR 中。

---

## 🛠️ 技术栈与依赖项

- **前端框架**：React 18 (TypeScript) + Vite
- **后端服务**：Node.js Express + Cors + Dotenv + Nodemon
- **大语言模型**：阿里云通义千问大模型（Qwen-Plus / Qwen-Max / Qwen2.5-Coder-32B）
- **样式系统**：Vanilla CSS（拟物化玻璃态设计, Flexbox & Grid, CSS Keyframe 动画）

---

## 🚀 快速开始

### 1. 克隆与安装依赖

```bash
git clone https://github.com/lwayne7/ai-pr-reviewer.git
cd ai-pr-reviewer
npm install
```

### 2. 配置环境变量

在项目根目录下创建 `.env` 文件，填入您的阿里云 API 密钥（可参考 `.env.example`）：

```env
# 阿里云百炼 API Key (sk-...)
ALIYUN_API_KEY=sk-9c20d8db1e9747c297c36205eb6e5320
PORT=3001
```

### 3. 启动本地开发服务 (客户端与服务端并行运行)

```bash
npm run dev
```
该命令会自动并发运行客户端（Vite @ 3000端口，搭载 API 反向代理）与服务端（Express @ 3001端口）。打开浏览器访问 `http://localhost:3000` 即可使用。

### 4. 生产构建与打包

编译前端资源：
```bash
npm run build
```

启动生产环境 Express 整合服务器（此模式下 Express 会自动接管前端编译静态资源目录 `dist`）：
```bash
NODE_ENV=production npm start
```

---

## 🎯 深度设计思路与技术决策

### 1. 模型选择 (Model Selection)
系统支持切换通义千问的三款旗舰模型，满足不同评审场景：
- **Qwen-Plus (默认 / 推荐)**：快速、低延迟。通义千问的通用主力模型，日常代码 diff 审查和逻辑改动具备很高的响应效率。
- **Qwen-Max (深度推理)**：千问的大参数旗舰模型，擅长超长上下文和复杂数理逻辑推理，对复杂的重构或大改动具有更深的业务边界把控。
- **Qwen2.5-Coder-32B-Instruct (编程专家)**：阿里云专为代码场景优化的高精度模型，代码评审、漏洞捕获及行级重构代码生成的综合能力处于业界顶尖水平。

### 2. 差分比对器 (Client Diff-Hunk Binding)
后端代理拉取 PR 文件时，前端 Patch 解析器会分析 Patch 块，将评论和行号与实际修改行精确匹配。如果在渲染 AI 行级评论时，AI 标记的行号属于非法行或越界行，系统会进行**误报拦截校验**，确保生成的意见仅作用于真实修改的代码范围。

### 3. 极速响应与本地缓存
通过 `HistoryList` 进行最近十条评审的 localStorage 快照留存，免除了重复开发测试时反复拉取接口的开销。

---

## 📄 许可证

本项目基于 MIT 协议开源。
