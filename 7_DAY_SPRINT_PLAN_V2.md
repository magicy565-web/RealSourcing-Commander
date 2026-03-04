# 7天冲刺计划：实现“AI自动回复”核心故事

> **文档目标**：基于对现有代码库的深度盘点，制定一个在 7 天内实现“AI Agent 定时从数据库提取询盘、生成回复并自动发送”核心故事的、极度务实且可落地的开发计划。

**文档作者**：Manus AI
**更新日期**：2026年3月5日
**核心原则**：**最大化复用现有代码，不引入任何新技术，聚焦打通核心数据流。**

---

## 1. 现状盘点：我们比想象的更接近终点

经过对代码库 `inquiries.ts`, `ai.ts`, `followup.ts` 等核心文件的深度盘点，我们得出一个令人振奋的结论：**“AI 自动回复”所需的大部分后端零件已经存在，只是没有被组装起来。**

| 模块 | 完成度 | 现状说明 |
| :--- | :--- | :--- |
| **询盘数据表** | **100%** | `inquiries`, `quotations`, `inquiry_replies` 表结构完整，字段齐全。 |
| **AI 服务 (`ai.ts`)** | **90%** | `generateFollowupDraft` 函数已实现，可以直接用于生成跟进邮件草稿。 |
| **回复 API (`inquiries.ts`)** | **80%** | `/api/v1/inquiries/:id/reply` 接口逻辑已存在，但目前是为“手动回复”设计的。 |
| **定时任务框架** | **60%** | `index.ts` 中已有 `setInterval` 机制，`followup.ts` 中有扫描数据库的逻辑。 |
| **自动发送能力** | **10%** | 这是最大的短板。当前回复 API 只是将回复写入数据库，没有实际的邮件发送能力。 |

**一句话总结**：我们已经有了“数据源”、“大脑”和“部分神经”，但缺少连接它们的“脊椎”和一个能实际行动的“手臂”（邮件发送）。

---

## 2. 7天冲刺计划：组装现有零件，补齐关键缺失

**核心思路**：不动大手术，只做连接和增强。我们将创建一个新的定时任务，复用 `ai.ts` 的能力，并为 `inquiries.ts` 的回复接口加上一个真正的“邮件发送”功能。

| 日期 | 核心任务 | 产出物 | 状态 |
| :--- | :--- | :--- | :--- |
| **Day 1 (3/6)** | **邮件发送服务** | 1. 注册 Resend/Mailgun 账号<br>2. 创建 `emailService.ts`，封装邮件发送函数 | `TODO` |
| **Day 2 (3/7)** | **改造回复 API** | 将 `emailService.ts` 集成到 `/reply` 接口中，实现真实邮件发送 | `TODO` |
| **Day 3 (3/8)** | **创建定时 Agent** | 1. 在 `followup.ts` 中新增 `autoReplyUnrepliedInquiries` 函数<br>2. 该函数扫描数据库，找出需要自动回复的询盘 | `TODO` |
| **Day 4 (3/9)** | **打通 AI 与发送** | 在 `autoReplyUnrepliedInquiries` 中调用 `generateFollowupDraft` 和新的回复 API | `TODO` |
| **Day 5 (3/10)**| **前端适配** | 在 `CommanderPhone.tsx` 中增加一个“自动回复日志”或类似界面，展示 Agent 工作记录 | `TODO` |
| **Day 6 (3/11)**| **端到端测试** | 1. 手动在数据库插入一条“待回复”询盘<br>2. 观察 Agent 是否自动生成并发送邮件<br>3. 在前端确认日志更新 | `TODO` |
| **Day 7 (3/12)**| **打包与交付** | 准备好演示环境，向老板展示一个能自动工作的 AI 销售助理 | `GOAL` |

### 技术实现细节

1.  **邮件发送 (Day 1-2)**：
    - 放弃自建 SMTP，直接使用 **Resend** 的免费套餐（每天 100 封邮件，足够演示）。
    - 创建 `services/emailService.ts`，一个简单的 `sendEmail` 函数即可。
    - 在 `inquiries.ts` 的 `/reply` 接口中，当回复成功写入数据库后，调用 `sendEmail` 函数。

2.  **定时 Agent (Day 3-4)**：
    - 在 `services/followup.ts` 中，创建一个新的 `async function autoReplyUnrepliedInquiries()`。
    - **核心 SQL 查询**：
      ```sql
      SELECT * FROM inquiries 
      WHERE status = 'unquoted' -- 或者任何你定义为“待AI回复”的状态
      AND updated_at < datetime('now', '-1 hour'); -- 避免回复过于频繁
      ```
    - **循环处理**：对查询到的每条询盘，调用 `generateFollowupDraft` 生成草稿，然后调用（或直接复用逻辑）`/reply` 接口的发送部分。
    - 在 `index.ts` 的 `setInterval` 中，每 5 分钟调用一次 `autoReplyUnrepliedInquiries()`。

3.  **前端展示 (Day 5)**：
    - 为了让老板“看到”AI 在工作，这是必要的。
    - 在 `CommanderPhone.tsx` 中，可以新增一个简单的 `AgentLog` 组件，从 `agent_logs` 或 `inquiry_replies` 表中读取数据显示“AI 于 xx:xx 已自动回复了来自 xx 的询盘”。

这个方案完全可行，因为它**最大化地利用了你已经写好的代码**，只在最关键的“发送”环节做了一个小小的加法。7 天时间，足够讲好这个核心故事。
