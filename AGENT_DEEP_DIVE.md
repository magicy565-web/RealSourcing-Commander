# RealSourcing Commander AI 全家桶深度开发文档 (V2.0)

> **文档目标**：本文件旨在为 RealSourcing Commander 的 12 个 AI Agent 提供一份具备足够技术深度的开发与实现指南。文档将超越 V1.0 的初步设计，深入探讨每个 Agent 从"模拟演示"到"生产可用"所需的核心技术细节、业务逻辑、数据模型、Prompt 工程、API 集成、异常处理与性能优化方案。

**文档作者**：Manus AI
**更新日期**：2026年3月4日
**版本**：V2.0（深度版）

---

## 目录

- [第一章：第一梯队 — 情报与流量全链路 (Agent 01-03)](#第一章第一梯队--情报与流量全链路-agent-01-03)
  - [Agent 01: 线索猎手 (Leads Hunter)](#agent-01-线索猎手-leads-hunter)
  - [Agent 02: 爆款雷达 (Trend Radar)](#agent-02-爆款雷达-trend-radar)
  - [Agent 03: 选题助手 (Content Pilot)](#agent-03-选题助手-content-pilot)
- [第二章：第二梯队 — 内容生产与分发全链路 (Agent 04-06)](#第二章第二梯队--内容生产与分发全链路-agent-04-06)
  - [Agent 04: 数字分身 (Digital Human)](#agent-04-数字分身-digital-human)
  - [Agent 05: 全网分发 (Auto Poster)](#agent-05-全网分发-auto-poster)
  - [Agent 06: SEO 优化师 (SEO Optimizer)](#agent-06-seo-优化师-seo-optimizer)
- [第三章：第三梯队 — 线索转化与私域运营 (Agent 07-08)](#第三章第三梯队--线索转化与私域运营-agent-07-08)
  - [Agent 07: 私信客服 (DM Closer)](#agent-07-私信客服-dm-closer)
  - [Agent 08: 邮件跟进 (Email Follower)](#agent-08-邮件跟进-email-follower)
- [第四章：第四梯队 — 经营管理与后端支撑 (Agent 09-12)](#第四章第四梯队--经营管理与后端支撑-agent-09-12)
  - [Agent 09: 收单收款 (Payment Pilot)](#agent-09-收单收款-payment-pilot)
  - [Agent 10: 财务预算 (Finance Pilot)](#agent-10-财务预算-finance-pilot)
  - [Agent 11: 物流管理 (Logistics Sentinel)](#agent-11-物流管理-logistics-sentinel)
  - [Agent 12: 阳光政务 (Gov-Compliance)](#agent-12-阳光政务-gov-compliance)
- [第五章：横切关注点 — 框架、规范与优化](#第五章横切关注点--框架规范与优化)

---

## 第一章：第一梯队 — 情报与流量全链路 (Agent 01-03)

第一梯队的核心使命是解决外贸业务中最关键的两个前置问题：**“客户在哪里”** (流量) 和 **“对客户说什么”** (内容)。它由线索猎手、爆款雷达和选题助手三个 Agent 构成，形成一个从线索发现、竞品分析到内容策略的完整情报闭环。

### Agent 01: 线索猎手 (Leads Hunter)

**当前实现**：通过 LLM 模拟生成 5-8 条包含询盘意图的评论数据，并存入 `leads` 表。

**深度开发方案**：

#### 1. 业务逻辑深化

真实的社媒线索挖掘远不止关键词匹配。深度版本需要实现一个多阶段、多策略的漏斗式挖掘流程。

| 阶段 | 核心任务 | 实现细节 |
| :--- | :--- | :--- |
| **阶段一：广泛抓取 (Broad Crawling)** | 使用 Playwright 或类似工具，以 Headless 模式静默抓取目标账号（竞品、行业KOL）最近 30 天内所有视频的全部评论。 | - **动态加载处理**：实现自动向下滚动，直到“没有更多评论”的标志出现。<br>- **并发抓取**：为每个目标账号启动一个独立的抓取进程，提高效率。<br>- **数据暂存**：将原始评论数据（包括 user_handle, user_name, comment_text, timestamp）存入 Redis 或临时 SQLite 表，避免重复抓取。 |
| **阶段二：粗筛与意图识别 (Coarse Filtering & Intent Recognition)** | 使用第一层轻量级 NLP 模型或关键词规则，快速过滤掉明显无关的评论。 | - **关键词规则库**：建立一个可配置的关键词库，如 `price`, `how much`, `interested`, `send me details`, `DM me` 等，并支持多语言。<br>- **轻量级分类器**：训练一个小型文本分类模型（如 FastText 或 DistilBERT），对评论进行“询盘/非询盘”二元分类。 |
| **阶段三：精筛与多维度分析 (Fine-grained Analysis)** | 对粗筛后的潜在线索，调用 `gpt-4.1-mini` 进行深度分析。 | - **Prompt 升级**：构建一个包含丰富上下文的 Prompt，要求 LLM 不仅判断意向，还要提取**购买力信号**（如“we need 1000pcs”）、**身份信号**（如“I'm a wholesaler from USA”）和**紧迫度信号**（如“need it urgently”）。<br>- **结构化输出**：强制 LLM 以 JSON 格式输出分析结果，包含 `intent_label`, `intent_score`, `purchasing_power`, `identity_signals`, `urgency`, `contact_info` 等字段。 |
| **阶段四：数据清洗与入库 (Data Cleansing & Storage)** | 对 LLM 返回的结构化数据进行校验和清洗，存入 `leads` 主表。 | - **数据校验**：验证 `contact_info` 字段的格式（邮箱、电话号码）。<br>- **去重机制**：基于 `user_handle` 和 `comment_text` 的哈希值进行去重，避免同一用户重复入库。<br>- **关联订单**：如果该用户后续在系统中成交，需将 `lead_id` 与 `order_id` 关联，用于评估线索质量。 |

#### 2. 数据模型 (`leads` 表)

```sql
CREATE TABLE leads (
  id TEXT PRIMARY KEY,                -- 线索ID (lead_xxx)
  tenant_id TEXT NOT NULL,            -- 租户ID
  agent_task_id TEXT,                 -- 来源Agent任务ID
  source_platform TEXT NOT NULL,      -- 来源平台 (tiktok, instagram, youtube)
  source_video_url TEXT,              -- 来源视频URL
  source_comment_id TEXT UNIQUE,      -- 评论ID，用于去重
  user_handle TEXT NOT NULL,          -- 用户Handle (@username)
  user_name TEXT,                     -- 用户昵称
  user_avatar_url TEXT,               -- 用户头像URL
  user_bio TEXT,                      -- 用户个人简介 (AI分析)
  content TEXT NOT NULL,              -- 评论原文
  -- AI 分析结果 --
  intent_label TEXT NOT NULL,         -- 意向标签 (inquiry, interest, general, spam)
  intent_score INTEGER NOT NULL,      -- 意向得分 (0-100)
  purchasing_power TEXT,              -- 购买力信号 (e.g., "1000pcs")
  identity_signals TEXT,              -- 身份信号 (e.g., "wholesaler")
  urgency TEXT,                       -- 紧迫度信号 (e.g., "urgently")
  contact_info TEXT,                  -- 联系方式 (JSON: {"email": [], "phone": [], "whatsapp": []})
  ai_summary TEXT,                    -- AI 生成的中文摘要
  -- 状态管理 --
  status TEXT NOT NULL DEFAULT 'new', -- 状态 (new, contacted, converted, ignored)
  assigned_to TEXT,                   -- 指派给的销售人员ID
  created_at TEXT NOT NULL,           -- 创建时间
  updated_at TEXT NOT NULL            -- 更新时间
);
```

#### 3. 性能与成本优化

- **降低 LLM 调用成本**：只有通过第一轮粗筛的评论才会进入 LLM 精筛，预计可过滤掉 80% 的无关评论。
- **使用缓存**：对于已经分析过的用户（`user_handle`），其 `user_bio` 等信息可以被缓存，无需重复分析。
- **异步处理**：整个流程应采用异步任务队列（如 BullMQ），将抓取、分析、入库等步骤解耦，提高系统的响应速度和鲁棒性。

---

### Agent 02: 爆款雷达 (Trend Radar)

**当前实现**：通过 LLM 模拟生成竞品视频数据，并存入 `trend_videos` 表。

**深度开发方案**：

#### 1. 业务逻辑深化

爆款分析不能只停留在表面数据，需要深入到视觉、听觉、文本和情感等多个维度。

| 维度 | 核心任务 | 实现细节 |
| :--- | :--- | :--- |
| **数据采集** | 抓取竞品账号近 30 天发布的 Top 10% 互动率的视频。 | - **互动率计算**：`(Likes + Comments + Shares) / Views`。需要可靠的视频数据源 API 或稳定的抓取脚本。<br>- **视频下载**：将筛选出的视频无水印下载到本地 S3，用于后续分析。 |
| **视觉分析 (Visual Analysis)** | 逐帧分析视频，识别关键元素。 | - **多模态 LLM**：使用 `gpt-4.1-nano` 或类似模型，对视频进行切片（如每 2 秒一张），识别**场景**（工厂、办公室、户外）、**物体**（产品、人物）、**画面风格**（快节奏、电影感）和**字幕风格**。<br>- **封面分析**：单独分析视频封面，提取钩子元素（如夸张表情、醒目文字）。 |
| **音频分析 (Audio Analysis)** | 识别背景音乐和语音节奏。 | - **BGM 识别**：对接 Shazam 或类似服务的 API，识别热门背景音乐。<br>- **语音转文本**：使用 Whisper API 将视频中的语音转为文字，并分析语速、停顿和关键词。 |
| **文本分析 (Text Analysis)** | 分析标题、描述和热门评论。 | - **标题党检测**：分析标题的模式，如“你绝对想不到...”、“...的 5 个秘密”。<br>- **评论情感分析**：对热门评论进行情感分析，了解观众的主要反馈是“惊叹”、“质疑”还是“喜爱”。 |
| **综合报告生成** | 将以上所有维度的分析结果汇总，生成一份结构化的“爆款密码”报告。 | - **Prompt 工程**：设计一个总览性 Prompt，输入所有分析结果，要求 LLM 总结出该视频的**爆款公式**，例如：“快节奏剪辑 + 痛点前置 + 热门BGM + 引导性提问标题”。 |

#### 2. 数据模型 (`trend_videos` 表)

```sql
CREATE TABLE trend_videos (
  id TEXT PRIMARY KEY,                -- 视频ID (video_xxx)
  tenant_id TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  video_url TEXT NOT NULL UNIQUE,
  account_handle TEXT NOT NULL,
  title TEXT,
  -- 核心指标 --
  views INTEGER, likes INTEGER, comments INTEGER, shares INTEGER, engagement_rate REAL,
  -- AI 分析结果 --
  is_viral INTEGER DEFAULT 0,         -- 是否爆款 (1/0)
  visual_analysis TEXT,               -- 视觉分析 (JSON: {scenes, objects, style, cover_hook})
  audio_analysis TEXT,                -- 音频分析 (JSON: {bgm, speech_speed, keywords})
  text_analysis TEXT,                 -- 文本分析 (JSON: {title_pattern, comment_sentiment})
  ai_summary TEXT,                    -- AI 生成的爆款公式总结
  created_at TEXT NOT NULL
);
```

---

### Agent 03: 选题助手 (Content Pilot)

**当前实现**：通过 LLM 模拟生成 4 段式脚本。

**深度开发方案**：

#### 1. 业务逻辑深化

选题助手不应只是一个简单的脚本生成器，而应成为一个基于数据、紧跟热点、并能形成内容矩阵的策略中心。

1.  **输入源多样化**：
    *   **内部数据**：聚合 Agent 02 (爆款雷达) 的分析报告。
    *   **外部数据**：对接 Google Trends API、TikTok Creative Center 等，获取行业飙升关键词和热门话题。
    *   **用户自定义**：允许用户输入自己的产品卖点、目标客户画像和希望强调的信息。

2.  **内容矩阵策略**：
    *   **内容类型分类**：将选题分为**引流款 (Traffic)**、**利润款 (Profit)**、**品牌款 (Brand)** 三种类型。
    *   **选题生成**：LLM 根据不同的内容类型，结合输入源，生成多个选题方向，并给出每个方向的**“爆款潜力分”**。

3.  **四段式脚本深度生成**：
    *   **Hook (钩子)**：不再是单一钩子，而是生成 3 个不同版本的钩子（如提问式、悬念式、痛点式），供用户选择。
    *   **Value (价值)**：结合用户输入的产品卖点，将卖点转化为对客户有吸引力的价值点。
    *   **Proof (证明)**：引导用户提供证明材料（如客户评价、工厂实拍、资质证书），并将其融入脚本。
    *   **CTA (行动号召)**：根据内容类型，生成不同的 CTA（如引流款引导关注，利润款引导询盘）。

4.  **反馈闭环**：
    *   追踪由该脚本生成的视频（Agent 04/05）的最终表现数据。
    *   将表现数据（播放量、互动率）回传给选题助手，用于优化未来的选题和脚本生成模型，形成**强化学习闭环**。

#### 2. 数据模型 (`content_suggestions` 表)

```sql
CREATE TABLE content_suggestions (
  id TEXT PRIMARY KEY,                -- 选题ID (sugg_xxx)
  tenant_id TEXT NOT NULL,
  source_trend_id TEXT,               -- 关联的爆款视频ID
  -- 选题核心 --
  title TEXT NOT NULL,                -- 选题标题
  content_type TEXT NOT NULL,         -- 内容类型 (traffic, profit, brand)
  hot_score INTEGER,                  -- 热度分 (0-100)
  -- 脚本内容 (JSON) --
  script_hooks TEXT,                  -- 钩子 (JSON: ["hook1", "hook2", "hook3"])
  script_value TEXT,                  -- 价值点
  script_proof TEXT,                  -- 证明
  script_cta TEXT,                    -- 行动号召
  -- 状态与反馈 --
  status TEXT NOT NULL DEFAULT 'pending', -- 状态 (pending, approved, filmed, published, failed)
  performance_data TEXT,              -- 表现数据 (JSON: {views, likes, ...})
  created_at TEXT NOT NULL
);
```



---

## 第二章：第二梯队 — 内容生产与分发全链路 (Agent 04-06)

在第一梯队解决了“情报”问题后，第二梯队的核心使命是解决外贸企业在社交媒体时代面临的巨大挑战：**“如何低成本、规模化、可持续地生产和分发高质量视频内容”**。它由数字分身、全网分发和SEO优化师三个 Agent 构成，旨在将内容策略无缝转化为在线影响力。

### Agent 04: 数字分身 (Digital Human)

**当前实现**：一个空的 `runDigitalHuman` 函数骨架，仅包含模拟的延迟和日志。

**深度开发方案**：

#### 1. 业务逻辑深化

数字人视频生成需要一个灵活、可配置且注重品牌一致性的生产线。

1.  **多供应商策略 (Multi-Provider Strategy)**：
    *   不锁定单一供应商，框架层面应支持多家数字人 API，如 **HeyGen**、**Synthesia**、**D-ID** 等。
    *   通过配置文件，允许用户根据成本、Avatar 形象、语音声线等因素动态选择最优供应商。

2.  **动态 Avatar/Voice 库**：
    *   根据视频的目标市场（如北美、欧洲、东南亚），自动推荐或匹配最合适的 Avatar 形象（人种、着装）和语音（语言、口音）。
    *   允许用户上传自己的专属 Avatar 或克隆自己的声音，实现高度品牌定制。

3.  **自动化后期处理 (Automated Post-Production)**：
    *   **动态字幕**：调用视频生成 API 的字幕功能，或使用本地 Whisper 模型生成 SRT 字幕文件，并使用 `ffmpeg` 将其硬编码到视频中。
    *   **品牌元素注入**：在视频的固定位置（如右上角）自动叠加品牌 Logo 水印，并在视频开头或结尾添加标准化的品牌介绍动画（Intro/Outro）。

#### 2. API 集成与工作流

这是一个典型的异步长任务，需要稳健的工作流管理。

| 步骤 | 操作 | 关键技术点 |
| :--- | :--- | :--- |
| 1. **任务创建** | 从 `content_suggestions` 表获取已批准的脚本，结合配置（Avatar, Voice, BGM）创建任务。 | - **参数映射**：将内部统一的配置参数映射为特定供应商 API 所需的格式。 |
| 2. **提交与轮询** | 调用供应商的视频生成 API 提交任务，获得 `task_id`，然后以指数退避策略轮询任务状态。 | - **指数退避 (Exponential Backoff)**：初始轮询间隔 5 秒，失败则 10 秒、20 秒... 避免过于频繁的请求。<br>- **超时与重试**：设置合理的超时时间（如 15 分钟），超时则标记为失败并触发重试机制。 |
| 3. **下载与存储** | 任务成功后，从返回的 URL 下载 MP4 视频文件。 | - **流式下载**：对于大文件，使用流式下载以减少内存占用。<br>- **上传至 S3**：将最终视频上传至客户专属的 S3 Bucket，并生成永久访问链接。 |
| 4. **后期处理** | （可选）下载视频到本地，使用 `ffmpeg` 添加水印和片头片尾。 | - **FFmpeg 命令封装**：`ffmpeg -i input.mp4 -i logo.png -filter_complex "overlay=W-w-10:10" output.mp4` |
| 5. **状态更新** | 将 S3 链接、成本、耗时等信息更新回 `digital_human_tasks` 表。 | - **成本核算**：根据供应商的计费规则（如按秒、按视频）和 API 返回的数据，精确记录本次生成的成本。 |

#### 3. 数据模型 (`digital_human_tasks` 表)

```sql
CREATE TABLE digital_human_tasks (
  id TEXT PRIMARY KEY,                -- 任务ID (dht_xxx)
  tenant_id TEXT NOT NULL,
  suggestion_id TEXT,                 -- 关联的选题ID
  provider TEXT NOT NULL,             -- 供应商 (heygen, synthesia)
  config TEXT NOT NULL,               -- 生成配置 (JSON: {avatar_id, voice_id, bgm_url})
  status TEXT NOT NULL,               -- 状态 (pending, processing, success, failed)
  error_message TEXT,                 -- 错误信息
  video_url TEXT,                     -- 最终视频的S3 URL
  duration_seconds REAL,              -- 视频时长
  cost_usd REAL,                      -- 成本（美元）
  created_at TEXT NOT NULL,
  completed_at TEXT
);
```

---

### Agent 05: 全网分发 (Auto Poster)

**当前实现**：一个空的 `runAutoPoster` 函数骨架。

**深度开发方案**：

#### 1. 业务逻辑深化

自动分发的核心在于**“模拟真人操作”**和**“平台适应性”**。

1.  **官方 API 优先，浏览器自动化为辅**：
    *   **YouTube/Instagram**：优先使用官方提供的 Graph API 或 Data API 进行上传，更稳定、更可靠。
    *   **TikTok**：由于其官方上传 API 限制较多，采用 Playwright 进行浏览器自动化上传作为主要方案。这需要一个高度健壮的脚本来应对 UI 变化。

2.  **智能发布时间 (Smart Scheduling)**：
    *   分析目标账号的历史数据，找出观众在线高峰期（如目标市场的工作日傍晚）。
    *   允许用户设置“发布窗口”（如“每天下午 4-7 点之间随机发布”），避免行为模式过于固定而被平台识别。

3.  **内容适应性改造 (Content Adaptation)**：
    *   **标题/描述微调**：使用 LLM 对原始标题和描述进行同义词替换或语序调整，为每个平台生成略有不同的版本，避免被判为重复内容。
    *   **首评互动 (First Comment Engagement)**：发布后，立即使用账号自身在评论区发布第一条评论，如“完整版教程在我的主页链接！”或“你最想了解哪个功能？”，以引导互动。

#### 2. 浏览器自动化健壮性设计

这是 Agent 05 成功的关键，需要抵御平台频繁的 UI 更新和反爬策略。

- **选择器策略 (Selector Strategy)**：避免使用脆弱的、自动生成的 CSS class。优先使用稳定的 `data-testid`、`aria-label` 或基于文本内容的选择器。
- **操作确认与重试 (Action Confirmation & Retry)**：每次点击或输入后，都应等待一个预期的结果出现（如某个元素可见、URL 发生变化）。如果未出现，则进行有限次数的重试。
- **会话持久化 (Session Persistence)**：将登录后的 Cookies 加密保存在数据库中，并在每次任务开始时加载，避免重复进行繁琐的登录和 2FA 验证。
- **异常截图与录屏**：当发生无法处理的异常时，自动进行截图和录屏，并将媒体文件上传至 S3，方便开发人员快速定位问题。

#### 3. 数据模型 (`distribution_tasks` 表)

```sql
CREATE TABLE distribution_tasks (
  id TEXT PRIMARY KEY,                -- 分发ID (dist_xxx)
  tenant_id TEXT NOT NULL,
  digital_human_task_id TEXT,         -- 关联的数字人视频任务ID
  platform TEXT NOT NULL,             -- 目标平台 (tiktok, youtube_shorts, instagram_reels)
  status TEXT NOT NULL,               -- 状态 (scheduled, publishing, success, failed)
  post_url TEXT,                      -- 发布后的帖子URL
  error_log_url TEXT,                 -- 异常日志/截图的S3 URL
  scheduled_at TEXT NOT NULL,         -- 计划发布时间
  published_at TEXT                   -- 实际发布时间
);
```

---

### Agent 06: SEO 优化师 (SEO Optimizer)

**当前实现**：一个空的 `runSEOOptimizer` 函数骨架。

**深度开发方案**：

#### 1. 业务逻辑深化

SEO 优化是一个持续的过程，需要从关键词研究、内容优化到效果追踪的完整闭环。

1.  **三层关键词策略 (Three-Layer Keyword Strategy)**：
    *   **核心关键词**：用户定义的核心产品词（如 `laser cutting machine`）。
    *   **长尾关键词**：通过 Google Keyword Planner 或 Ahrefs API，围绕核心词扩展出上百个长尾词（如 `100w fiber laser cutter for metal`）。
    *   **疑问关键词**：通过 AnswerThePublic 或类似工具，找到用户在搜索时会问的问题（如 `how to choose a laser cutter`）。

2.  **AI 驱动的优化 (AI-Driven Optimization)**：
    *   在 Agent 05 发布**之前**，Agent 06 介入，对标题、描述和标签进行最终优化。
    *   **Prompt 设计**：向 LLM 提供视频脚本、目标平台和三层关键词库，要求其生成：
        *   **3 个高点击率的标题**：结合紧迫感、好奇心等元素。
        *   **一段包含 3-5 个长尾关键词的自然描述**。
        *   **20 个相关的标签 (Hashtags)**：混合核心词、长尾词和热门趋势词。

3.  **效果追踪与迭代 (Performance Tracking & Iteration)**：
    *   发布后，Agent 06 定期（如每周）检查已发布视频的**关键词排名**（需要专业的第三方排名追踪 API）。
    *   如果某个视频在核心关键词下排名不佳，Agent 06 可以自动进行二次优化（如修改标题、添加评论区链接），或将该视频标记为“表现不佳”，为未来的内容策略提供数据参考。

#### 2. 数据模型 (`seo_reports` 表)

```sql
CREATE TABLE seo_reports (
  id TEXT PRIMARY KEY,                -- 报告ID (seo_xxx)
  tenant_id TEXT NOT NULL,
  distribution_task_id TEXT,          -- 关联的分发任务ID
  target_keywords TEXT NOT NULL,      -- 优化的目标关键词 (JSON Array)
  -- 优化内容 --
  generated_titles TEXT,              -- AI生成的标题建议 (JSON Array)
  generated_description TEXT,         -- AI生成的描述
  generated_tags TEXT,                -- AI生成的标签 (JSON Array)
  -- 效果追踪 --
  keyword_rankings TEXT,              -- 关键词排名数据 (JSON: {"keyword": "rank", ...})
  last_checked_at TEXT,               -- 上次排名检查时间
  created_at TEXT NOT NULL
);
```


---

## 第三章：第三梯队 — 线索转化与私域运营 (Agent 07-08)

流量和内容的最终目的是为了“成交”。第三梯队聚焦于将前两个梯队获取的公域流量高效转化为私域线索，并进行持续、智能的跟进，解决**“询盘响应慢”**和**“客户跟不紧”**的核心痛点。它由私信客服和邮件跟进两个 Agent 组成，是连接市场与销售的关键桥梁。

### Agent 07: 私信客服 (DM Closer)

**当前实现**：一个空的 `runDMCloser` 函数骨架。

**深度开发方案**：

#### 1. 业务逻辑深化

一个优秀的私信客服 Agent 必须能够准确理解用户意图，并能执行多样化的对话策略，而不仅仅是简单的 Q&A。

1.  **多层意图识别模型 (Multi-Layer Intent Recognition)**：
    *   **第一层：通用意图识别**。对所有新进私信进行分类：`询盘`、`售后`、`寒暄`、`垃圾信息`。
    *   **第二层：询盘意图细分**。对于被标记为 `询盘` 的私信，进一步细分为：`价格咨询`、`技术参数`、`寻求合作`、`索要样本`。
    *   **实现**：使用 `gpt-4.1-mini` 并结合 Few-shot Learning，提供每种意图的 3-5 个典型例子，让模型学习分类。

2.  **动态知识库与 RAG (Retrieval-Augmented Generation)**：
    *   **知识库构建**：将产品手册、FAQ、历史优秀回复等文档向量化，存入向量数据库（如 Pinecone, ChromaDB）。
    *   **RAG 流程**：当识别到用户意图后，Agent 首先根据用户问题从向量数据库中检索最相关的 3-5 个知识片段，然后将这些片段作为上下文，连同用户问题一起提交给 LLM，生成更精准、更具事实性的回复。

3.  **多轮对话管理与状态机**：
    *   Agent 必须能够记住对话的上下文。每次回复前，都需要加载与该用户的历史聊天记录。
    *   设计一个对话状态机：`[新对话]` -> `[意图识别中]` -> `[信息收集中]` (如引导用户提供邮箱/WhatsApp) -> `[转人工/留资成功]` -> `[对话结束]`。

4.  **安全与风险控制**：
    *   **报价锁定**：Agent 绝不能直接报具体价格。当识别到价格咨询时，标准回复应是：“为了给您最准确的报价，我需要了解您的具体需求和数量。请留下您的邮箱或 WhatsApp，我们的销售经理会马上跟进。”
    *   **人工介入触发器**：当用户连续两次提出 Agent 无法理解的问题、表达不满情绪、或使用特定关键词（如 `complaint`, `manager`）时，系统应立即暂停自动回复，并通过钉钉或企业微信向相关销售人员发送高优提醒。

#### 2. 数据模型 (`dm_conversations` 表)

```sql
CREATE TABLE dm_conversations (
  id TEXT PRIMARY KEY,                -- 对话ID (dmc_xxx)
  tenant_id TEXT NOT NULL,
  platform TEXT NOT NULL,             -- 平台 (tiktok, instagram)
  user_handle TEXT NOT NULL,          -- 用户Handle
  -- 对话状态与内容 --
  status TEXT NOT NULL,               -- 对话状态 (open, pending_human, closed)
  last_message_summary TEXT,          -- 最新消息摘要
  conversation_history TEXT,          -- 完整对话历史 (JSON Array of {sender, message, timestamp})
  -- AI 分析与分类 --
  main_intent TEXT,                   -- 主要意图 (inquiry, support, etc.)
  sub_intent TEXT,                    -- 子意图 (price, tech_spec, etc.)
  assigned_to TEXT,                   -- 指派的销售人员ID
  lead_id TEXT,                       -- 关联的线索ID
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

### Agent 08: 邮件跟进 (Email Follower)

**当前实现**：一个空的 `runEmailFollower` 函数骨架。

**深度开发方案**：

#### 1. 业务逻辑深化

邮件跟进的核心是**“个性化”**和**“自动化序列”**，需要构建一个强大的邮件营销引擎。

1.  **可编排的邮件序列 (Orchestrated Email Sequences)**：
    *   **可视化编辑器**：提供一个拖拽式的界面，让用户可以设计自己的邮件跟进流程（Sequence）。例如：
        *   `Day 1`: 发送产品介绍邮件。
        *   `Day 3`: 如果未回复，发送客户案例邮件。
        *   `Day 7`: 如果仍未回复，发送最后一次跟进邮件。
        *   `If Opened/Clicked`: 如果用户打开或点击了邮件中的链接，立即从该序列中移除，并转入“高意向”序列。
    *   **模板库**：内置多种经过验证的高打开率邮件模板（如 AIDA 模型、PAS 模型），用户可以一键套用。

2.  **深度个性化 (Hyper-Personalization)**：
    *   **动态变量注入**：邮件内容中可以插入丰富的动态变量，如 `{{lead.user_name}}`, `{{lead.source_comment}}`, `{{product.name}}`。
    *   **AI 内容润色**：在发送前，使用 LLM 对邮件内容进行“个性化重写”。例如，将 `{{lead.source_comment}}` 作为上下文，让 AI 生成一句独特的开场白：“Hi {{lead.user_name}}, I saw your comment about our product on TikTok and wanted to share more details...”

3.  **智能事件触发器 (Smart Event Triggers)**：
    *   **回复意图分析**：当收到客户回复时，Agent 自动分析回复的意图：`积极` (e.g., "sounds great, let's talk"), `消极` (e.g., "not interested"), `观望` (e.g., "let me think about it")。
    *   **自动调整序列**：根据回复意图，自动将客户移动到不同的邮件序列中，或立即提醒销售人员人工介入。
    *   **行为追踪**：集成邮件追踪像素（Tracking Pixel），监控邮件的打开率和链接点击率，这些行为本身也应作为触发器来调整跟进策略。

#### 2. API 集成与安全

- **邮件服务商集成**：支持通过 API 与主流邮件服务商（如 SendGrid, Mailgun, AWS SES）集成，以确保高送达率，而不是使用简单的 SMTP 直连。
- **域名与发件人信誉**：必须配置好 SPF, DKIM, DMARC 记录，以避免被标记为垃圾邮件。Agent 需要定期检查域名健康度。
- **退订与合规**：所有外发邮件必须包含清晰的退订链接，并与一个退订名单数据库同步，严格遵守 CAN-SPAM 和 GDPR 法规。

#### 3. 数据模型 (`email_sequences` 与 `sequence_contacts`)

```sql
CREATE TABLE email_sequences (
  id TEXT PRIMARY KEY,                -- 序列ID (seq_xxx)
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,                 -- 序列名称 (e.g., "新线索跟进序列")
  steps TEXT NOT NULL,                -- 序列步骤 (JSON Array of {day, template_id, condition})
  is_active INTEGER DEFAULT 1
);

CREATE TABLE sequence_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequence_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  status TEXT NOT NULL,               -- 状态 (active, paused, completed, unsubscribed)
  current_step INTEGER NOT NULL,      -- 当前进行到第几步
  last_sent_at TEXT,                  -- 上次发送时间
  engagement_log TEXT,                -- 互动日志 (JSON Array of {type: 'open'|'click', timestamp})
  UNIQUE(sequence_id, lead_id)
);
```


---

## 第四章：第四梯队 — 经营管理与后端支撑 (Agent 09-12)

第四梯队是整个 Commander 系统的基石，负责处理“钱、货、税”等核心经营管理环节。它们确保了前台业务的顺利运转有坚实的后端支持，并为管理者提供决策所需的数据洞察，解决**“账目不清、物流混乱、政策不明”**的后顾之忧。

### Agent 09: 收单收款 (Payment Pilot)

**当前实现**：一个空的 `runPaymentPilot` 函数骨架。

**深度开发方案**：

1.  **多渠道支付网关集成**：通过 API 全面对接 **Stripe**, **PayPal**, **Airwallex (空中云汇)**, **PingPong** 等主流跨境支付工具。
2.  **WebHook 驱动的实时入账**：配置支付网关的 WebHook，一旦有款项入账（如客户支付样品费、小额订单），Agent 能在秒级内收到通知。
3.  **智能订单匹配**：通过支付备注中的订单号、客户邮箱或姓名，自动将入账流水与 `orders` 表中的订单进行关联，更新订单状态为“已支付”。
4.  **逾期账单自动催款**：定期扫描 `orders` 表中状态为“待支付”且已超期的订单，自动触发 Agent 08 (邮件跟进)，发送定制化的催款邮件序列。
5.  **数据模型 (`payment_records` 表)**：

    ```sql
    CREATE TABLE payment_records (
      id TEXT PRIMARY KEY,              -- 支付记录ID (pay_xxx)
      tenant_id TEXT NOT NULL,
      order_id TEXT,                    -- 关联的内部订单ID
      gateway TEXT NOT NULL,            -- 支付网关 (stripe, paypal, etc.)
      gateway_txn_id TEXT NOT NULL UNIQUE, -- 网关交易ID
      amount REAL NOT NULL,             -- 金额
      currency TEXT NOT NULL,           -- 币种
      status TEXT NOT NULL,             -- 状态 (succeeded, pending, failed)
      payer_info TEXT,                  -- 付款人信息 (JSON)
      received_at TEXT NOT NULL         -- 到账时间
    );
    ```

---

### Agent 10: 财务预算 (Finance Pilot)

**当前实现**：一个空的 `runFinancePilot` 函数骨架。

**深度开发方案**：

1.  **多维成本自动归集**：
    *   **广告成本**：通过 API 对接 TikTok Ads, Google Ads, Facebook Ads，每日自动拉取广告花费数据。
    *   **物流成本**：从 Agent 11 (物流管理) 的 `shipment_records` 表中获取每笔订单的实际运费。
    *   **支付成本**：从 Agent 09 (收单收款) 的 `payment_records` 表中获取每笔交易的支付手续费。
    *   **固定成本**：允许用户在 UI 上配置每月固定支出，如房租、人力成本等。

2.  **实时 LTV/CAC 与 ROI 计算**：
    *   **CAC (客户获取成本)**：`总广告支出 / 新增客户数`。
    *   **LTV (客户生命周期价值)**：特定客户在一段时间内的累计订单金额。
    *   **ROI (投资回报率)**：`(总收入 - 总成本) / 总成本`。Agent 每日生成一份 ROI 报告，并与设定的目标进行比较，低于阈值则自动预警。

3.  **AI 财务健康度诊断**：每月初，Agent 自动生成一份财务健康度报告，使用 LLM 对数据进行自然语言解读，指出潜在风险（如“广告 ROI 连续三周下降”）和优化建议（如“B 产品的利润率远高于 A 产品，建议增加其广告预算”）。

4.  **数据模型 (`finance_reports` 表)**：

    ```sql
    CREATE TABLE finance_reports (
      id TEXT PRIMARY KEY,              -- 报告ID (fin_rep_xxx)
      tenant_id TEXT NOT NULL,
      period TEXT NOT NULL,             -- 报告周期 (e.g., "2026-03")
      total_revenue REAL,               -- 总收入
      total_cost REAL,                  -- 总成本 (JSON: {ad_cost, shipping_cost, ...})
      profit REAL,                      -- 利润
      roi REAL,                         -- 投资回报率
      ai_analysis TEXT,                 -- AI 生成的财务分析与建议
      generated_at TEXT NOT NULL
    );
    ```

---

### Agent 11: 物流管理 (Logistics Sentinel)

**当前实现**：一个空的 `runLogisticsSentinel` 函数骨架。

**深度开发方案**：

1.  **多货代 API 集成**：对接 **17Track**, **AfterShip**, **Cainiao (菜鸟)** 等主流物流追踪平台 API，实现对全球超过 500 家承运商的轨迹追踪。
2.  **主动式轨迹监控**：对于已发货的订单，Agent 每日自动查询其最新物流状态。一旦发现异常状态（如 `运输延误`, `海关扣留`, `投递失败`），立即更新 `shipment_records` 表状态并触发预警。
3.  **智能延误预警与客户安抚**：
    *   当检测到“运输延误”时，系统自动向相关销售人员发送通知。
    *   同时，可以配置自动触发 Agent 08 (邮件跟进)，向客户发送一封安抚邮件，告知其包裹的最新情况并表达歉意，化被动为主动。
4.  **运费比价与渠道推荐**：在发货前，允许用户输入包裹重量、尺寸和目的地，Agent 调用各货代 API 的询价接口，实时返回不同渠道的运费和预计时效，帮助用户选择性价比最高的发货方案。

5.  **数据模型 (`shipment_records` 表)**：

    ```sql
    CREATE TABLE shipment_records (
      id TEXT PRIMARY KEY,              -- 物流ID (ship_xxx)
      tenant_id TEXT NOT NULL,
      order_id TEXT NOT NULL,           -- 关联的订单ID
      tracking_number TEXT NOT NULL UNIQUE, -- 运单号
      carrier TEXT NOT NULL,            -- 承运商
      status TEXT NOT NULL,             -- 物流状态 (in_transit, delivered, exception)
      latest_update TEXT,               -- 最新轨迹信息
      tracking_history TEXT,            -- 完整轨迹历史 (JSON)
      estimated_delivery_date TEXT,     -- 预计送达日期
      shipped_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    ```

---

### Agent 12: 阳光政务 (Gov-Compliance)

**当前实现**：一个空的 `runGovCompliance` 函数骨架。

**深度开发方案**：

1.  **多国海关与税务网站监控**：配置 Playwright 脚本，定期（如每周）访问目标国家（如美国、欧盟）的海关、税务部门官方网站。
2.  **增量内容爬取与变更检测**：Agent 会缓存上次访问的页面哈希值。如果哈希值发生变化，说明页面有更新，Agent 将下载新页面内容。
3.  **LLM 驱动的政策解读**：
    *   **Prompt 设计**：将新旧页面内容同时提交给 LLM，要求其对比差异，并以结构化 JSON 格式总结出政策变动点，特别是与用户产品相关的**关税税率 (Tariff)**、**认证要求 (Certification)**、**禁运清单 (Embargo List)** 等。
    *   **风险评级**：要求 LLM 对每个变动点进行风险评级（高、中、低），并给出简明的行动建议。

4.  **出口退税进度追踪**：对于中国出口商，可以开发对接“电子口岸”或地方税务局系统的功能，定期查询出口退税的办理状态，并在状态变更时（如“已受理”、“已审核”、“已退税”）推送通知。

5.  **数据模型 (`compliance_alerts` 表)**：

    ```sql
    CREATE TABLE compliance_alerts (
      id TEXT PRIMARY KEY,              -- 警报ID (comp_xxx)
      tenant_id TEXT NOT NULL,
      source_country TEXT NOT NULL,     -- 政策来源国
      source_url TEXT NOT NULL,         -- 政策原文URL
      policy_title TEXT,                -- 政策标题
      change_summary TEXT NOT NULL,     -- AI 总结的变动内容
      risk_level TEXT NOT NULL,         -- 风险等级 (high, medium, low)
      action_suggestion TEXT,           -- AI 建议的行动
      detected_at TEXT NOT NULL
    );
    ```


---

## 第五章：横切关注点 — 框架、规范与优化

为了确保 12 个 Agent 能够高效、稳定、安全地协同工作，必须建立一套统一的横切技术规范。本章将详细阐述支撑整个 AI 全家桶的底层框架、Prompt 工程规范、数据库设计哲学以及错误处理与性能优化策略。

### 1. 统一 Agent 执行框架 (The Worker Core)

当前的 `agentWorker.ts` 实现了一个基于 Hono 和 SQLite 的轻量级单体框架。为了支撑生产级的深度应用，需要对其进行架构升级。

**目标架构：微服务与事件驱动**

| 组件 | 推荐技术 | 核心职责 |
| :--- | :--- | :--- |
| **Agent Manager (API Gateway)** | Node.js + Hono/Fastify | - **任务管理**：提供 RESTful API 用于触发、查询、取消 Agent 任务。<br>- **身份验证**：校验用户身份与权限。<br>- **请求校验**：验证输入参数的合法性。<br>- **任务分发**：将任务消息推送到消息队列。 |
| **Message Queue (消息队列)** | **Redis Streams** 或 **BullMQ** | - **任务解耦**：将 API Gateway 与 Worker 解耦，提高系统可用性。<br>- **持久化与重试**：确保即使 Worker 宕机，任务也不会丢失，并支持自动重试。<br>- **优先级调度**：允许高优先级任务（如私信回复）插队到低优先级任务（如数据分析）之前。 |
| **Agent Worker (执行器)** | **Python + FastAPI** | - **订阅任务**：从消息队列中拉取待执行的任务。<br>- **执行业务逻辑**：调用 Playwright, 第三方 API, LLM 等完成具体工作。<br>- **状态上报**：通过 WebSocket 或回调 URL，实时向 Manager 汇报进度和结果。 |
| **State & Cache (状态与缓存)** | **Redis** | - **任务状态缓存**：缓存任务的实时进度，供前端轮询。<br>- **API 结果缓存**：缓存第三方 API 的调用结果，减少重复请求。<br>- **分布式锁**：防止同一任务被多个 Worker 实例重复执行。 |

**工作流示例 (Agent 01: 线索猎手)**

1.  前端点击“开始扫描”，调用 Agent Manager 的 `/api/v1/agents/leads_hunter/trigger` 接口。
2.  Agent Manager 校验权限，生成 `task_id`，并将一个包含 `task_id` 和 `targetAccounts` 的消息推送到 Redis 的 `leads_hunter_queue` 中。
3.  一个空闲的 Python Worker 从队列中获取该任务，开始执行 Playwright 抓取流程。
4.  Worker 通过 WebSocket 向 Manager 实时发送进度更新：`{task_id, progress: 10, step: "正在加载评论..."}`。
5.  Manager 将进度信息写入 Redis 缓存。
6.  前端通过 `/api/v1/tasks/{task_id}` 接口轮询任务状态，从 Redis 缓存中获取实时进度。
7.  Worker 完成任务，将最终结果（如发现的线索数量）通过回调 URL POST 给 Manager。
8.  Manager 将结果存入主数据库（PostgreSQL），并标记任务为 `success`。

### 2. Prompt 工程规范 (Prompt Engineering)

为了保证 LLM 输出的稳定性和可控性，必须建立一套标准化的 Prompt 结构。

**推荐的 `CREO` 框架**：

- **C (Context)**: 上下文。清晰地告知 LLM 它需要了解的背景信息。
  > *“You are a social media marketing expert for a B2B company that sells laser cutting machines.”*
- **R (Role & Rule)**: 角色与规则。明确定义 LLM 的角色和必须遵守的规则。
  > *“Your role is to analyze a user's comment and identify their purchasing intent. You MUST only respond in the JSON format specified below. Do not add any explanatory text.”*
- **E (Example)**: 示例。提供 1-3 个输入和期望输出的例子 (Few-shot Learning)，能极大提高输出的准确性和格式稳定性。
  > *“Here is an example:
  > Input: `"Wow, how much for this machine? Need one for my workshop in Texas."`
  > Output: `{ "`{"intent_label": "inquiry", "intent_score": 95, "identity_signals": ["workshop owner"], "contact_info": {"location": "Texas"}}`"”*
- **O (Output)**: 输出格式。精确定义期望的输出格式，对于 JSON，最好提供一个完整的 schema。
  > *“Now, analyze the following comment and provide your output in the exact JSON structure as the example above.”*

### 3. 统一数据库 Schema 设计

从长远来看，SQLite 在高并发写入和复杂查询场景下会成为瓶颈。推荐使用 **PostgreSQL** 作为主数据库，因为它提供了更丰富的数据类型、更强的事务支持和更好的扩展性。

**设计哲学**：

- **多租户设计 (Multi-tenancy)**：所有核心表都必须包含 `tenant_id` 字段，并建立索引，确保数据在租户之间严格隔离。
- **外键约束**：在表之间建立明确的外键关系（如 `leads.agent_task_id` -> `tasks.id`），保证数据的完整性和一致性。
- **JSONB 数据类型**：对于非结构化或半结构化的配置、日志和 AI 分析结果，灵活使用 PostgreSQL 的 `JSONB` 类型，它支持索引和高效查询。
- **统一命名规范**：所有表名使用复数形式（如 `leads`, `orders`），所有字段名使用蛇形命名法（`snake_case`）。

### 4. 错误处理与性能优化

- **幂等性 (Idempotency)**：所有触发任务的 API 都应设计为幂等的。即使客户端因为网络问题重试了请求，也只会创建一个任务。这可以通过在创建任务时检查是否存在具有相同参数的、在最近（如 5 分钟内）创建的任务来实现。
- **优雅降级 (Graceful Degradation)**：在 `agentWorker.ts` 中为每个 Agent 实现的 `generateFallback...` 函数是一个很好的实践。当第三方 API 或核心服务不可用时，系统应能自动切换到备用方案或返回缓存数据，而不是直接崩溃。
- **性能监控与 APM**：集成如 **Sentry** 或 **DataDog** 等应用性能监控（APM）工具。这些工具可以自动捕获未处理的异常，追踪慢查询和慢速 API 调用，为性能优化提供数据支持。
- **成本控制**：为 LLM 调用和第三方 API 调用设置严格的预算和速率限制。在代码中建立一个中央化的成本计算器，每次调用都记录成本，当接近预算时自动发送预警或降级服务。
