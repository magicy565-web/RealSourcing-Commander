# RealSourcing Commander 接力开发方案

> **文档目标**：基于对现有代码库的全面分析，制定一份清晰、可执行的接力开发计划，以完成“第一阶段：情报与流量闭环”的核心功能。

---

## 一、 现状分析 (Gap Analysis)

在克隆并深入分析 `magicy565-web/RealSourcing-Commander` 仓库后，我们总结出现有代码库与项目第一阶段目标之间的主要差距：

### 1. 后端 (commander-server)

| 模块 | 已实现状态 | 差距与待办 |
| :--- | :--- | :--- |
| **核心框架** | 基于 Hono + TypeScript，结构清晰。 | 无重大差距。 |
| **数据库** | 使用 `better-sqlite3`，已定义多张核心表。 | **关键表缺失**：缺少 `agents`, `leads`, `finance_records` 表。`tasks` 表由 `task_queue` 实现，但字段不完全匹配。 |
| **任务队列** | 已集成 BullMQ 和 Redis (`commanderQueue.ts`)。 | **Worker 未实现**：`rfqMonitorWorker.ts` 仅有骨架和 `TODO` 注释，缺少与 AgentBay/OpenClaw 的实际交互逻辑。 |
| **AI 服务** | 已封装 `ai.ts`，对接阿里云 DashScope。 | **Agent 专属能力缺失**：缺少针对线索识别、爆款分析、选题生成的特定 AI prompt 和解析逻辑。 |
| **API 接口** | 存在大量存量接口。 | **Agent 相关接口缺失**：缺少管理 `agents`、`leads` 的 CRUD 接口，以及触发 Agent 任务的专用接口。 |

### 2. 前端 (commander-h5)

| 模块 | 已实现状态 | 差距与待办 |
| :--- | :--- | :--- |
| **项目结构** | 基于 React + Vite + TypeScript，组件化良好。 | 无重大差距。 |
| **Agent 页面** | 已创建 `CommentLeadAgent.tsx`, `VideoTrendAgent.tsx`, `ContentIntelAgent.tsx` 三个文件。 | **纯静态页面**：所有页面均使用 Mock 数据，**未与任何后端 API 对接**，功能完全不可用。 |
| **API 客户端** | `lib/api.ts` 中已封装 `fetch` 请求。 | **Agent API 未定义**：缺少与 Agent 管理、线索获取、任务触发等相关的 API 调用函数。 |

**核心结论**：项目当前具备了扎实的底层框架，但在核心的 **Agent 业务逻辑** 和 **前后端数据链路** 两个层面存在巨大鸿沟。前端页面仅为空壳，后端缺少关键的数据表和 Worker 实现。接下来的开发需要将技术文档中的设计无缝融入现有代码库。

---

## 二、 优先级与开发规划

我们将严格按照“后端先行、数据驱动、前后端联调”的顺序，分步完成第一阶段开发目标。

### 第 1 步：补齐数据库核心 Schema

- **任务**：在 `apps/commander-server/src/db/index.ts` 中，补充创建 `agents`, `tasks`, `leads`, `finance_records` 四张核心表。
- **标准**：表结构严格遵循 `RealSourcingCommanderAgent全家桶：深度技术架构与实现细节(V1.0).md` 中定义的字段。

### 第 2 步：实现统一 Agent 执行框架

- **任务**：
    1.  创建 `apps/commander-server/src/routes/agents.ts`，提供 Agent 的 CRUD 管理接口。
    2.  重构 `apps/commander-server/src/_core/commanderQueue.ts`，使其与新的 `tasks` 表联动，实现任务的创建、状态更新和结果回写。
    3.  创建 `apps/commander-server/src/_core/agentWorker.ts` 作为所有 Agent 的通用 Worker 模板，实现与 AgentBay 的基础通信（创建会话、执行脚本、销毁会话）。
- **标准**：能够通过 API 创建一个 Agent，并向其派发一个任务，任务状态能在 `tasks` 表中正确流转（`pending` -> `running` -> `completed`/`failed`）。

### 第 3 步：实现第一梯队 Agent 核心逻辑

- **任务**：
    1.  **Agent 01 (线索猎手)**：在 `agentWorker.ts` 中实现。调用 LLM 识别意向，并将结果存入 `leads` 表。
    2.  **Agent 02 (爆款雷达)**：在 `agentWorker.ts` 中实现。实现视频数据抓取、互动率计算和视觉分析逻辑。
    3.  **Agent 03 (选题助手)**：在 `agentWorker.ts` 中实现。汇总分析结果，生成选题和脚本。
- **标准**：三个 Agent 的核心逻辑均可独立运行，并产生符合预期的输出结果。

### 第 4 步：前后端数据链路打通

- **任务**：
    1.  在 `apps/commander-h5/src/lib/api.ts` 中添加所有与 Agent 相关的 API 调用函数。
    2.  改造 `CommentLeadAgent.tsx`, `VideoTrendAgent.tsx`, `ContentIntelAgent.tsx` 页面，移除所有 Mock 数据，替换为真实的 API 调用。
    3.  实现页面与后端的完整交互，包括：获取 Agent 列表、触发任务、轮询状态、展示结果（线索、爆款视频、选题）。
- **标准**：用户可以在手机端完整地使用第一梯队三个 Agent 的所有功能。

---

## 三、 下一步行动

立即开始执行 **第二阶段：制定接力开发详细方案（差距分析与优先级规划）** 的第一项任务：**补齐数据库核心 Schema**。
