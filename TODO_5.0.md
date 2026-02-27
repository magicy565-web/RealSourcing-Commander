# RealSourcing 5.0 Commander — 开发 TODO

> **产品定位**：数字资产托管 + 海外市场增长服务  
> **核心交付**：指挥官手机 + OpenClaw 云端数字员工  
> **MVP 目标**：8 周内交付第一批种子客户可用版本  
> **最后更新**：2026-02-27

---

## 阶段一：基础设施（Week 1-2）

### 数据库扩展

- [ ] **[DB-01]** 新增 `commander_phones` 表（设备注册、激活码、绑定工厂）
- [ ] **[DB-02]** 新增 `openclaw_instances` 表（独立版/标准版、状态、绑定工厂）
- [ ] **[DB-03]** 新增 `openclaw_accounts` 表（托管账号、平台类型、加密 Session）
- [ ] **[DB-04]** 新增 `commander_tasks` 表（任务类型、状态、进度、积分消耗）
- [ ] **[DB-05]** 新增 `inbound_leads` 表（询盘来源、原始内容、AI 摘要、状态）
- [ ] **[DB-06]** 新增 `lead_replies` 表（老板回复、翻译内容、发送状态）
- [ ] **[DB-07]** 新增 `credit_ledger` 表（积分流水、充值/消耗记录）
- [ ] **[DB-08]** 新增 `digital_assets` 表（工厂数字资产快照、GEO 评分）
- [ ] **[DB-09]** 编写 `0008_commander_5_0_core.sql` 迁移文件
- [ ] **[DB-10]** 更新 `drizzle/schema.ts` 添加所有新表的 TypeScript 类型定义

### 微信通知服务

- [ ] **[WX-01]** 注册微信公众号/服务号，申请模板消息权限
- [ ] **[WX-02]** 创建 `server/_core/wechatService.ts`，封装微信模板消息 API
- [ ] **[WX-03]** 定义三级通知模板：
  - `LEAD_ARRIVED`（新询盘到达，高优先级，立即推送）
  - `TASK_PROGRESS`（Agent 任务进度，中优先级，分步推送）
  - `DAILY_REPORT`（每日战报，低优先级，早 8 点推送）
- [ ] **[WX-04]** 实现微信 OAuth 绑定流程（老板扫码绑定手机号）
- [ ] **[WX-05]** 编写微信通知单元测试

### BullMQ 队列扩展

- [ ] **[Q-01]** 在 `queue.ts` 中新增 `commander:rfq-monitor` 队列（RFQ 监控任务）
- [ ] **[Q-02]** 在 `queue.ts` 中新增 `commander:hunter-agent` 队列（猎手 Agent 任务）
- [ ] **[Q-03]** 在 `queue.ts` 中新增 `commander:content-agent` 队列（内容 Agent 任务）
- [ ] **[Q-04]** 在 `queue.ts` 中新增 `commander:geo-builder` 队列（GEO 建造者任务）
- [ ] **[Q-05]** 在 `queue.ts` 中新增 `commander:daily-report` 队列（每日战报生成）
- [ ] **[Q-06]** 创建 `server/_core/commanderQueueWorker.ts`，实现所有新队列的 Worker

---

## 阶段二：短期获客引擎（Week 3-4）

### RFQ 监控 Worker（短期结果核心）

- [ ] **[RFQ-01]** 创建 `server/_core/rfqMonitorWorker.ts`
- [ ] **[RFQ-02]** 实现 OpenClaw 任务指令：登录阿里巴巴国际站后台，抓取新询盘
- [ ] **[RFQ-03]** 实现 OpenClaw 任务指令：登录 Made-in-China 后台，抓取新询盘
- [ ] **[RFQ-04]** 实现 OpenClaw 任务指令：监控 Global Sources 询盘
- [ ] **[RFQ-05]** 实现询盘 AI 摘要（调用现有 `aiService.ts`，生成中文摘要）
- [ ] **[RFQ-06]** 实现询盘质量评分（0-100 分，基于买家背景、需求明确度）
- [ ] **[RFQ-07]** 询盘入库并触发微信通知（调用 `wechatService.ts`）
- [ ] **[RFQ-08]** 询盘同步归档到飞书多维表格（调用现有 `feishuService.ts`）

### 询盘回复流程

- [ ] **[REPLY-01]** 实现老板在指挥台用中文回复询盘的 API
- [ ] **[REPLY-02]** 实现 AI 将中文回复翻译成英文（调用现有 `aiService.ts`）
- [ ] **[REPLY-03]** 实现 OpenClaw 代为发送回复（通过托管账号）
- [ ] **[REPLY-04]** 实现回复发送状态回调（成功/失败通知老板）
- [ ] **[REPLY-05]** 实现对话记录归档到飞书

---

## 阶段三：指挥台 App（Week 3-4）

### Commander App H5（手机端）

- [ ] **[APP-01]** 完善"今日战报" Tab：接入真实询盘数据 API
- [ ] **[APP-02]** 完善"发起指令" Tab：接入任务创建 API，实现积分扣减确认
- [ ] **[APP-03]** 完善"任务中心" Tab：接入任务状态实时更新（WebSocket 或轮询）
- [ ] **[APP-04]** 完善"数字资产" Tab：接入飞书客户数据库统计 API
- [ ] **[APP-05]** 实现询盘详情页：显示买家背景、原始内容、AI 摘要
- [ ] **[APP-06]** 实现询盘回复页：中文输入 → 英文预览 → 确认发送
- [ ] **[APP-07]** 实现积分余额展示和充值入口
- [ ] **[APP-08]** 实现手机端 PWA 配置（可添加到桌面）
- [ ] **[APP-09]** 适配 375px-430px 手机屏幕，确保触控友好

### 账号托管绑定流程

- [ ] **[BIND-01]** 实现账号绑定引导页（首次使用时的 Onboarding）
- [ ] **[BIND-02]** 实现 OpenClaw 安全登录代理（老板输入账号密码，OpenClaw 登录并保存 Session）
- [ ] **[BIND-03]** 实现 Session 加密存储（AES-256，密钥与账号 ID 绑定）
- [ ] **[BIND-04]** 实现账号健康状态监控（Session 失效时微信通知老板重新授权）

---

## 阶段四：OpenClaw 独立版/标准版（Week 5-6）

### OpenClaw 实例管理

- [ ] **[CLAW-01]** 在 `clawAgentRouter.ts` 中扩展实例注册接口，支持 `type: 'dedicated' | 'standard'`
- [ ] **[CLAW-02]** 实现标准版任务路由：按行业/地区分配任务，同行业不共享实例
- [ ] **[CLAW-03]** 实现独立版专属队列：一个实例只处理一家工厂的任务
- [ ] **[CLAW-04]** 实现实例负载监控：CPU/内存/任务队列深度
- [ ] **[CLAW-05]** 实现实例自动扩缩容策略（标准版）

### 猎手 Agent（主动获客）

- [ ] **[HUNTER-01]** 创建 `server/_core/hunterAgentWorker.ts`
- [ ] **[HUNTER-02]** 实现 LinkedIn 目标买家搜索（按行业、职位、地区筛选）
- [ ] **[HUNTER-03]** 实现买家公司背景信息抓取（官网、LinkedIn 公司页）
- [ ] **[HUNTER-04]** 实现买家意向评分（基于公司规模、近期动态、职位匹配度）
- [ ] **[HUNTER-05]** 输出结构化买家画像，存入 `inbound_leads` 表

### 内容 Agent（开发信生成）

- [ ] **[CONTENT-01]** 创建 `server/_core/contentAgentWorker.ts`
- [ ] **[CONTENT-02]** 实现个性化英文开发信生成（基于买家画像 + 工厂产品知识库）
- [ ] **[CONTENT-03]** 实现开发信质量评分和人工审核队列
- [ ] **[CONTENT-04]** 实现开发信发送（通过 LinkedIn/Email，由 OpenClaw 执行）

---

## 阶段五：长期 GEO 引擎（Week 7-8）

### GEO 建造者 Agent

- [ ] **[GEO-01]** 创建 `server/_core/geoBuilderWorker.ts`
- [ ] **[GEO-02]** 实现工厂"数字孪生"页面生成（结构化数据 + Schema.org 标记）
- [ ] **[GEO-03]** 实现商业目录同步（Thomasnet、Kompass、Europages）
- [ ] **[GEO-04]** 实现行业论坛问答监控（Reddit、Quora、行业 BBS）
- [ ] **[GEO-05]** 实现 AI 可见度评分计算（每周更新一次）
- [ ] **[GEO-06]** 实现月度 GEO 报告生成，推送到飞书

### Web 管理端（老板 PC 端）

- [ ] **[WEB-01]** 完善总览仪表盘：月度询盘趋势图、市场分布地图
- [ ] **[WEB-02]** 完善询盘管理页：筛选、搜索、批量操作
- [ ] **[WEB-03]** 完善 Agent 任务管理页：任务列表、日志、手动触发
- [ ] **[WEB-04]** 完善数字资产页：飞书客户数据库嵌入视图
- [ ] **[WEB-05]** 完善 GEO 监控页：AI 可见度趋势、引用来源列表
- [ ] **[WEB-06]** 实现 OpenClaw 实例状态监控面板（管理员视图）

---

## 积分系统

- [ ] **[CREDIT-01]** 实现积分充值 API（对接支付宝/微信支付）
- [ ] **[CREDIT-02]** 实现积分消耗逻辑（任务发起时扣减，失败时退还）
- [ ] **[CREDIT-03]** 实现积分余额不足时的微信通知和充值引导
- [ ] **[CREDIT-04]** 实现积分流水查询 API

---

## 运营与监控

- [ ] **[OPS-01]** 实现每日战报自动生成（早 8 点，汇总前一天的询盘和任务）
- [ ] **[OPS-02]** 实现 OpenClaw 异常告警（Session 失效、任务失败、超时）
- [ ] **[OPS-03]** 实现种子客户 Onboarding 流程（手机激活 → 账号绑定 → 首次任务）
- [ ] **[OPS-04]** 实现客户成功仪表盘（内部使用，监控每个种子客户的健康度）

---

## 种子期验证 KPI

| 指标 | 目标值 | 验证时间 |
| :--- | :--- | :--- |
| 种子客户数 | 5-10 家（同一行业） | Week 4 前完成签约 |
| 每客户月均询盘推送 | ≥ 10 条 | Week 6 验证 |
| 询盘有效率（老板认可） | ≥ 60% | Week 6 验证 |
| 老板回复率 | ≥ 30% | Week 8 验证 |
| 种子客户续费意愿 | ≥ 80% | Week 8 验证 |

---

## 技术债务与注意事项

- **账号安全**：OpenClaw 托管账号的 Session 必须使用 AES-256 加密存储，密钥不得写入代码
- **平台合规**：LinkedIn 自动化操作需严格控制频率（每日连接请求 ≤ 20 个），避免封号
- **数据归属**：所有客户数据归工厂老板所有，合同中必须明确声明
- **人工兜底**：MVP 阶段所有 Agent 输出必须经过人工审核，不得直接自动发送
- **复用优先**：所有新功能优先复用 `aiService.ts`、`feishuService.ts`、`queue.ts` 现有能力

---

*文档由 Manus AI 生成，基于 RealSourcing 5.0 PRD v1.0*
