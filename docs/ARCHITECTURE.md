# RealSourcing 5.0 — 技术架构文档

> **文档版本：** v1.0  
> **最后更新：** 2026-02-27  
> **用途：** 本文档是所有 AI Vibe Coding 会话的基准参考文件。每次开始新的开发任务前，必须先阅读本文档，确保生成的代码与整体架构保持一致。

---

## 1. 产品定位

RealSourcing 5.0 是面向中国中小外贸企业主的**数字资产托管与海外市场增长平台**。核心产品由三个部分组成：

| 产品 | 定位 | 技术形态 |
|------|------|---------|
| **OpenClaw** | AI 数字员工执行层，在海外社媒平台自动执行操作 | Python 自动化脚本，部署在阿里云 ECS |
| **Commander 手机端** | 老板专属指挥台，通知驱动 + 碎片时间查看 + 固定时间处理询盘 | React PWA（MVP阶段），后续迁移 React Native |
| **Web 管理端** | 深度配置和数据分析，OpenClaw 参数调整 | React SPA |

**两种部署模式：**

- **标准版**：共享 OpenClaw 资源，仅支持 AI 获客和简单内容发布，不含社媒账号托管
- **独立部署版**：专属 ECS 实例，支持完整的社媒账号托管、多 Agent 协同、精细化数字员工管理

---

## 2. 系统架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                          客户端层                                 │
│                                                                  │
│   Commander 手机端 (React PWA → React Native)                    │
│   Web 管理端 (React SPA)                                         │
│                                                                  │
│   通知入口：飞书个人消息卡片（含 Deep Link）                       │
└─────────────────────────┬────────────────────────────────────────┘
                          │ HTTPS REST API / WebSocket
┌─────────────────────────▼────────────────────────────────────────┐
│                    Commander 后端                                 │
│                  (Python 3.11 + FastAPI)                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │  Auth 模块   │  │  询盘状态机  │  │  通知调度模块        │    │
│  │  JWT + 租户  │  │  8种状态流转 │  │  飞书消息卡片推送    │    │
│  └──────────────┘  └──────────────┘  └─────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │  飞书集成    │  │  积分管理    │  │  Webhook 接收端      │    │
│  │  读取/写入   │  │  消耗记录    │  │  OpenClaw 事件处理   │    │
│  └──────────────┘  └──────────────┘  └─────────────────────┘    │
│                                                                  │
│  数据库：PostgreSQL 15（阿里云 RDS）                              │
│  缓存：Redis（阿里云 Redis，会话 + 队列消费状态）                  │
└─────────────────────────┬────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│              阿里云消息队列 (RocketMQ)                            │
│                                                                  │
│  Topic: inquiry.created      — 新询盘事件                        │
│  Topic: inquiry.replied      — 买家回复事件                      │
│  Topic: task.completed       — OpenClaw 任务完成事件             │
│  Topic: agent.status.changed — 数字员工状态变更事件              │
│  Topic: followup.trigger     — 自动跟进触发事件                  │
└─────────────────────────┬────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│              OpenClaw 执行层 (阿里云 ECS / Python)               │
│                                                                  │
│  独立部署版：每个客户 = 独立 ECS 实例                             │
│  标准版：共享 ECS 资源池（多租户隔离）                            │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ LinkedIn    │  │ Facebook    │  │ TikTok      │             │
│  │ Agent       │  │ Agent       │  │ Agent       │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ WhatsApp    │  │ GEO         │  │ 调研        │             │
│  │ Agent       │  │ Agent       │  │ Agent       │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  Playwright 自动化 + 住宅代理 IP 池                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. 技术选型决策

### 3.1 后端

| 技术 | 选型 | 决策理由 |
|------|------|---------|
| 语言 | Python 3.11 | 与 OpenClaw 共享代码库和工具链，飞书/阿里云 SDK 完整 |
| Web 框架 | FastAPI | 异步支持好，自动生成 OpenAPI 文档，性能接近 Node.js |
| 数据库 | PostgreSQL 15（阿里云 RDS） | 支持 JSONB（灵活存储询盘原始数据），事务完整性强 |
| ORM | SQLAlchemy 2.0 + Alembic | 类型安全，迁移管理完善 |
| 缓存 | Redis 7（阿里云 Redis） | 会话存储、消息队列消费状态、限流计数器 |
| 消息队列 | 阿里云 RocketMQ | 与阿里云生态集成，消息持久化，支持延迟消息（跟进任务调度） |
| 认证 | JWT（access token 1h + refresh token 30d） | 无状态，适合移动端 |

### 3.2 前端

| 技术 | 选型 | 决策理由 |
|------|------|---------|
| MVP 阶段 | React 19 + Vite + PWA | 快速迭代，与现有原型代码一致 |
| 正式 App | React Native（Expo） | 与 React 共享业务逻辑，AI 代码生成质量高 |
| 状态管理 | Zustand | 轻量，适合 AI Vibe Coding（比 Redux 简单） |
| UI 组件 | shadcn/ui（Web）/ React Native Paper（App） | 一致的设计语言 |
| 样式 | Tailwind CSS 4（Web）/ StyleSheet（RN） | — |

### 3.3 OpenClaw

| 技术 | 选型 | 决策理由 |
|------|------|---------|
| 自动化框架 | Playwright（Python） | 支持多浏览器，反检测能力强 |
| 代理管理 | 住宅代理 IP 池（按需采购） | 规避平台封号风险 |
| 任务调度 | APScheduler + RocketMQ 消费 | 本地定时任务 + 远程指令接收 |
| 事件推送 | RocketMQ Producer | 操作结果异步推送到 Commander 后端 |

### 3.4 通知

| 技术 | 选型 | 决策理由 |
|------|------|---------|
| 推送渠道 | 飞书机器人（个人消息卡片） | 客户已在使用飞书，配置简单，消息卡片支持按钮交互 |
| 消息格式 | 飞书消息卡片（Card JSON） | 支持富文本、按钮、颜色标注，比纯文本信息密度高 |
| Deep Link | `realsourcing://inquiry/{id}` | 从飞书通知直接跳转到 App 内对应询盘页 |
| 配置方式 | RealSourcing 团队帮助客户配置飞书机器人 Webhook | 降低客户配置门槛 |

---

## 4. 数据库 Schema

### 4.1 租户与用户

```sql
-- 租户（公司）
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,          -- 公司名称
    plan_type       VARCHAR(20) NOT NULL DEFAULT 'standard',  -- standard | enterprise
    industry        VARCHAR(100),                   -- 行业（影响报价模板选择）
    credits_balance INTEGER NOT NULL DEFAULT 0,     -- 积分余额
    feishu_webhook  VARCHAR(500),                   -- 飞书机器人 Webhook URL
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE
);

-- 用户（目前一租户一用户，多租户后续扩展）
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id),
    name            VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    password_hash   VARCHAR(200) NOT NULL,
    push_hour       INTEGER DEFAULT 8,              -- 早报推送时间（北京时间）
    push_hour_eve   INTEGER DEFAULT 18,             -- 傍晚推送时间
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 OpenClaw 实例

```sql
CREATE TABLE openclaw_instances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id),
    name            VARCHAR(100) NOT NULL,          -- 实例名称，如"李总的OpenClaw"
    ecs_instance_id VARCHAR(100),                   -- 阿里云 ECS 实例 ID
    api_endpoint    VARCHAR(300),                   -- OpenClaw 的 HTTP API 地址
    api_key         VARCHAR(200),                   -- 认证密钥
    status          VARCHAR(20) DEFAULT 'offline',  -- online | offline | error
    last_heartbeat  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 托管的社媒账号
CREATE TABLE social_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id     UUID REFERENCES openclaw_instances(id),
    tenant_id       UUID REFERENCES tenants(id),
    platform        VARCHAR(30) NOT NULL,           -- linkedin | facebook | tiktok | whatsapp
    account_name    VARCHAR(200) NOT NULL,
    account_type    VARCHAR(20) DEFAULT 'personal', -- personal | business_page
    health_status   VARCHAR(20) DEFAULT 'normal',   -- normal | warning | restricted | banned
    daily_ops_used  INTEGER DEFAULT 0,              -- 今日已用操作次数
    daily_ops_limit INTEGER DEFAULT 20,             -- 每日安全阈值
    last_active     TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE
);
```

### 4.3 询盘管理

```sql
-- 询盘主表
CREATE TABLE inquiries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id),
    -- 来源信息
    source_platform VARCHAR(30) NOT NULL,           -- linkedin | facebook | tiktok | whatsapp | alibaba | geo | custom
    source_url      VARCHAR(500),                   -- 原始消息链接
    raw_content     TEXT,                           -- 原始消息内容
    -- 买家信息
    buyer_name      VARCHAR(200),
    buyer_company   VARCHAR(200),
    buyer_country   VARCHAR(100),
    buyer_contact   VARCHAR(200),                   -- 联系方式（邮件/手机）
    -- 询盘内容
    product_name    VARCHAR(300),
    quantity        VARCHAR(100),
    requirements    TEXT,
    estimated_value INTEGER,                        -- 预估金额（USD）
    -- AI 评估
    confidence_score INTEGER,                       -- 置信度 0-100
    confidence_breakdown JSONB,                     -- {"channel":30,"content":35,"buyer":22}
    -- 状态
    status          VARCHAR(30) NOT NULL DEFAULT 'unread',
    -- unread | unquoted | quoted | no_reply | transferred | contracted | expired
    assigned_to     VARCHAR(100),                   -- 转人工时的业务员姓名
    transfer_note   TEXT,                           -- 转出备注
    -- 时间
    received_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 报价单
CREATE TABLE quotations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id      UUID REFERENCES inquiries(id),
    tenant_id       UUID REFERENCES tenants(id),
    -- 报价内容
    product_name    VARCHAR(300),
    unit_price      DECIMAL(12,2),
    currency        VARCHAR(10) DEFAULT 'USD',
    unit            VARCHAR(50),                    -- 件/套/KG/M²
    price_term      VARCHAR(20),                    -- FOB | CIF | EXW
    min_order       INTEGER,
    delivery_days   INTEGER,
    validity_days   INTEGER DEFAULT 30,
    -- 飞书关联
    feishu_table_id VARCHAR(200),                   -- 飞书多维表格 ID
    feishu_record_id VARCHAR(200),                  -- 写入飞书后的记录 ID
    -- 跟进策略
    followup_style  VARCHAR(20) DEFAULT 'business', -- aggressive | friendly | business
    -- 状态
    status          VARCHAR(20) DEFAULT 'draft',    -- draft | sent | accepted | rejected
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 回复记录
CREATE TABLE inquiry_replies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id      UUID REFERENCES inquiries(id),
    quotation_id    UUID REFERENCES quotations(id),
    reply_type      VARCHAR(20) NOT NULL,           -- ai_draft | human_confirmed | auto_followup | buyer_reply
    content_zh      TEXT,                           -- 中文内容（老板输入）
    content_en      TEXT,                           -- 英文内容（AI 翻译/生成）
    is_sent         BOOLEAN DEFAULT FALSE,
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,                    -- 买家已读时间（如平台支持）
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 自动跟进任务
CREATE TABLE followup_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id      UUID REFERENCES inquiries(id),
    quotation_id    UUID REFERENCES quotations(id),
    scheduled_at    TIMESTAMPTZ NOT NULL,           -- 计划执行时间
    followup_style  VARCHAR(20) NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',  -- pending | sent | skipped | cancelled
    executed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Agent 任务与日志

```sql
-- Agent 任务
CREATE TABLE agent_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id),
    instance_id     UUID REFERENCES openclaw_instances(id),
    task_type       VARCHAR(50) NOT NULL,
    -- inquiry_reply | market_expansion | product_publish | geo_optimize | social_post
    task_name       VARCHAR(200),
    input_data      JSONB,                          -- 任务输入参数
    output_data     JSONB,                          -- 任务输出结果
    credits_cost    INTEGER DEFAULT 0,              -- 消耗积分
    status          VARCHAR(20) DEFAULT 'pending',  -- pending | running | completed | failed
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Agent 执行日志
CREATE TABLE agent_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID REFERENCES agent_tasks(id),
    instance_id     UUID REFERENCES openclaw_instances(id),
    platform        VARCHAR(30),
    action          VARCHAR(100) NOT NULL,          -- 操作描述
    result          VARCHAR(20),                    -- success | failed | skipped
    detail          TEXT,
    logged_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.5 通知

```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id),
    user_id         UUID REFERENCES users(id),
    type            VARCHAR(30) NOT NULL,
    -- new_inquiry | buyer_reply | task_completed | agent_warning | daily_report
    title           VARCHAR(200) NOT NULL,
    body            TEXT,
    deep_link       VARCHAR(300),                   -- realsourcing://inquiry/{id}
    is_pushed       BOOLEAN DEFAULT FALSE,          -- 是否已推送飞书
    is_read         BOOLEAN DEFAULT FALSE,
    pushed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. API 接口契约

所有接口遵循 REST 规范，Base URL 为 `/api/v1`。认证方式为 `Authorization: Bearer {jwt_token}`。

### 5.1 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 手机号+密码登录，返回 access_token + refresh_token |
| POST | `/auth/refresh` | 刷新 access_token |
| POST | `/auth/logout` | 登出，撤销 refresh_token |

### 5.2 询盘管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/inquiries` | 获取询盘列表（支持 status/platform/country/value_range 筛选） |
| GET | `/inquiries/{id}` | 获取询盘详情（含回复记录、跟进状态） |
| PATCH | `/inquiries/{id}/status` | 更新询盘状态 |
| POST | `/inquiries/{id}/quote` | 创建报价（触发 OpenClaw 发送） |
| POST | `/inquiries/{id}/transfer` | 转人工业务员 |
| GET | `/inquiries/{id}/followups` | 获取跟进时间线 |

### 5.3 飞书集成

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/feishu/templates` | 获取行业报价模板列表 |
| GET | `/feishu/templates/{id}/fields` | 获取模板字段定义 |
| POST | `/feishu/quotations` | 将报价写入飞书多维表格 |

### 5.4 OpenClaw Webhook（供 OpenClaw 调用）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/webhooks/openclaw/inquiry` | 新询盘事件推送 |
| POST | `/webhooks/openclaw/reply` | 买家回复事件推送 |
| POST | `/webhooks/openclaw/task` | 任务完成事件推送 |
| POST | `/webhooks/openclaw/heartbeat` | 实例心跳（每5分钟） |

### 5.5 通知

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/notifications` | 获取通知列表 |
| PATCH | `/notifications/{id}/read` | 标记已读 |
| GET | `/notifications/settings` | 获取推送设置 |
| PUT | `/notifications/settings` | 更新推送设置（推送时间/类型） |

---

## 6. OpenClaw 与 Commander 通信协议

### 6.1 新询盘事件（OpenClaw → Commander）

```json
POST /api/v1/webhooks/openclaw/inquiry
Authorization: Bearer {openclaw_api_key}

{
  "event": "inquiry.created",
  "instance_id": "uuid",
  "timestamp": "2026-02-27T08:00:00Z",
  "data": {
    "platform": "linkedin",
    "source_url": "https://linkedin.com/messaging/...",
    "raw_content": "Hi, I'm interested in your 400W solar panels...",
    "buyer": {
      "name": "John Smith",
      "company": "SunPower Solutions",
      "country": "Vietnam",
      "profile_url": "https://linkedin.com/in/..."
    },
    "parsed": {
      "product": "400W Solar Panel",
      "quantity": "500 pcs",
      "estimated_value": 12500
    }
  }
}
```

### 6.2 Commander 下发回复指令（Commander → OpenClaw）

```json
POST {openclaw_api_endpoint}/api/tasks/reply
Authorization: Bearer {openclaw_api_key}

{
  "task_id": "uuid",
  "inquiry_id": "uuid",
  "platform": "linkedin",
  "source_url": "https://linkedin.com/messaging/...",
  "reply_content": "Dear John, Thank you for your inquiry...",
  "reply_type": "quotation"
}
```

---

## 7. 飞书通知消息卡片格式

```json
{
  "msg_type": "interactive",
  "card": {
    "header": {
      "title": { "content": "🔔 新询盘 · LinkedIn", "tag": "plain_text" },
      "template": "orange"
    },
    "elements": [
      {
        "tag": "div",
        "fields": [
          { "is_short": true, "text": { "tag": "lark_md", "content": "**买家**\nSunPower Solutions (越南)" }},
          { "is_short": true, "text": { "tag": "lark_md", "content": "**预估金额**\n$12,500" }},
          { "is_short": true, "text": { "tag": "lark_md", "content": "**产品**\n400W 太阳能组件 × 500件" }},
          { "is_short": true, "text": { "tag": "lark_md", "content": "**置信度**\n87%" }}
        ]
      },
      {
        "tag": "action",
        "actions": [
          { "tag": "button", "text": { "content": "立即处理", "tag": "plain_text" }, "type": "primary", "url": "realsourcing://inquiry/{id}" },
          { "tag": "button", "text": { "content": "稍后提醒", "tag": "plain_text" }, "type": "default" }
        ]
      }
    ]
  }
}
```

---

## 8. 多租户安全规范

所有数据库查询**必须**包含 `tenant_id` 过滤条件，禁止跨租户数据访问。后端中间件在每个请求中自动注入当前用户的 `tenant_id`，开发时通过以下方式获取：

```python
# FastAPI 依赖注入示例
async def get_current_tenant(token: str = Depends(oauth2_scheme)) -> UUID:
    payload = jwt.decode(token, SECRET_KEY)
    return UUID(payload["tenant_id"])

# 所有查询必须带 tenant_id
inquiries = db.query(Inquiry).filter(
    Inquiry.tenant_id == current_tenant_id,
    Inquiry.status == status
).all()
```

---

## 9. 开发规范（AI Vibe Coding 专用）

每次开始新的 Manus 开发会话时，必须遵循以下规范：

**代码组织：**
- 后端目录结构：`app/api/` (路由) / `app/services/` (业务逻辑) / `app/models/` (数据库模型) / `app/schemas/` (Pydantic 模型)
- 每个功能模块独立文件，禁止在单文件中混合多个业务逻辑
- 所有数据库操作通过 Service 层封装，路由层只处理 HTTP 请求/响应

**命名规范：**
- 数据库表名：复数小写下划线（`inquiries`, `agent_tasks`）
- API 路径：复数小写连字符（`/inquiries`, `/agent-tasks`）
- Python 变量：小写下划线（`tenant_id`, `inquiry_status`）
- React 组件：大驼峰（`InquiryDetail`, `LeadCard`）

**错误处理：**
- 所有 API 错误返回统一格式：`{"error": {"code": "INQUIRY_NOT_FOUND", "message": "..."}}`
- 业务错误使用 HTTP 4xx，系统错误使用 HTTP 5xx
- OpenClaw Webhook 接收失败时，RocketMQ 自动重试（最多 3 次，间隔 30s/60s/120s）

**安全规范：**
- 所有用户输入必须通过 Pydantic 模型验证
- OpenClaw API Key 存储在环境变量，禁止硬编码
- 飞书 Webhook URL 加密存储在数据库（AES-256）
