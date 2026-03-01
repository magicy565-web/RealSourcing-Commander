# Phase 7 开发日志 — RealSourcing Commander 5.0

> **开发日期**：2026-03-01  
> **版本标签**：v5.7.0  
> **主题**：AI 智能辅助报价 · 矩阵热力图仪表盘 · 指令实验室 2.0

---

## 一、SmartQuoteAI — AI 智能辅助报价系统

### 后端新增
- **`ai.ts`** — 新增 `generateSmartQuote()` 函数：基于询盘产品、数量、买家国家，调用 LLM 生成三档价格建议（稳健/平衡/激进），包含利润率分析、市场洞察和竞争力评估
- **`inquiries.ts`** — 新增 `POST /api/v1/inquiries/:id/smart-quote` 端点：读取询盘详情，调用 AI 生成价格建议，返回结构化报价方案
- **`api.ts`** — 新增 `inquiriesApi.smartQuote(id)` 前端方法

### 前端新增
- **`CommanderPhone.tsx`** — 在询盘详情报价页（quote step）嵌入 SmartQuoteAI 折叠卡片：
  - 折叠/展开设计，不干扰主流程
  - 三档价格卡片（稳健/平衡/激进），颜色区分（绿/蓝/橙）
  - 每档显示：建议单价、利润率、竞争力评分
  - 「一键填入」按钮，点击自动填充报价金额
  - 市场洞察文字说明
  - 消耗 2 积分，加载动画

---

## 二、Matrix 2.0 — 多账号矩阵热力图仪表盘

### 后端新增
- **`multi-account.ts`** — 新增 `GET /api/v1/multi-account/matrix` 端点：返回 7 天操作热力图数据（按实例×小时分布）、实例利用率、批量操作建议
- **`multi-account.ts`** — 新增 `POST /api/v1/multi-account/batch` 端点：支持批量唤醒/重置/暂停实例
- **`api.ts`** — 新增 `multiAccountApi.getMatrix()` 和 `multiAccountApi.batchAction()` 前端方法

### 前端新增
- **`MultiAccountManager.tsx`** — 主页面升级为 Matrix 2.0：
  - 顶部 Tab 切换（实例总览 / 矩阵热力图）
  - 新增 `MatrixHeatmap` 子组件：7×24 热力图网格，颜色深浅代表操作密度
  - 实例利用率进度条（绿/黄/红三色预警）
  - 批量操作工具栏（唤醒休眠实例、重置异常实例、暂停所有实例）
  - 副标题更新为「Matrix 2.0」

---

## 三、Command Lab 2.0 — 老板指挥台指令实验室

### 后端新增
- **`ai.ts`** — 新增 `parseComplexCommand()` 函数：将复合自然语言指令拆解为 4 阶段执行流程（分析→筛选→执行→报告），包含每步时间估算、积分消耗、风险评估
- **`boss.ts`** — 新增 `POST /api/v1/boss/command-lab` 端点：接收复合指令，调用 AI 拆解，返回可视化执行路径
- **`api.ts`** — 新增 `bossApi.commandLab(command)` 前端方法

### 前端新增
- **`BossWarroom.tsx`** — CommandScreen 升级为 Command Lab 2.0：
  - 「指令实验室」切换按钮（右上角，紫色激活态）
  - Lab 模式下：输入框 placeholder 变为「输入复合指令，AI 将拆解为可视化执行流程」
  - 「分析指令流程」按钮替换「发送指令」按钮
  - AI 拆解结果卡片：
    - 执行路径标题 + 风险等级徽章（低/中/高）
    - 4 阶段步骤列表（可折叠查看详情）
    - 每步显示：阶段图标、标签、平台、预计时间、积分消耗
    - 底部汇总：总耗时 + 总积分 + 「确认执行」按钮
    - 风险提示文字

---

## 修复记录

- 修复 `inquiries.ts` 中 `generateFollowupDraft` 调用缺少 `buyerCompany`、`style` 字段的 TypeScript 错误
- 修复 `boss.ts` 中 `parseCommand` 函数调用 `chat()` 缺少 `userPrompt` 参数的错误
- 前端构建：✅ 2661 modules，无错误

---

## 文件变更清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `apps/commander-server/src/services/ai.ts` | 修改 | 新增 `generateSmartQuote`、`parseComplexCommand` 函数 |
| `apps/commander-server/src/routes/inquiries.ts` | 修改 | 新增 `POST /:id/smart-quote` 端点；修复 followup 调用 |
| `apps/commander-server/src/routes/boss.ts` | 修改 | 新增 `POST /command-lab` 端点；修复 `chat()` 调用 |
| `apps/commander-server/src/routes/multi-account.ts` | 修改 | 新增 `GET /matrix`、`POST /batch` 端点 |
| `apps/commander-h5/client/src/lib/api.ts` | 修改 | 新增 `smartQuote`、`getMatrix`、`batchAction`、`commandLab` 方法 |
| `apps/commander-h5/client/src/pages/CommanderPhone.tsx` | 修改 | 嵌入 SmartQuoteAI 折叠卡片 |
| `apps/commander-h5/client/src/pages/MultiAccountManager.tsx` | 修改 | 升级为 Matrix 2.0（热力图 + 批量操作 + Tab 切换） |
| `apps/commander-h5/client/src/pages/BossWarroom.tsx` | 修改 | CommandScreen 升级为 Command Lab 2.0 |
