-- ============================================================
-- RealSourcing 5.0 Commander — Core Schema Migration
-- Migration: 0008_commander_5_0_core.sql
-- Date: 2026-02-27
-- Description: 指挥官手机、OpenClaw 实例管理、询盘系统、积分系统、数字资产
-- ============================================================

-- ─── 1. commander_phones ─────────────────────────────────────
-- 指挥官手机设备注册表
-- 每台手机对应一个工厂，通过激活码完成绑定
CREATE TABLE IF NOT EXISTS `commander_phones` (
  `id`            INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `factoryId`     INT NOT NULL COMMENT '绑定的工厂 ID',
  `activationCode` VARCHAR(32) NOT NULL UNIQUE COMMENT '出厂激活码',
  `deviceModel`   VARCHAR(100) COMMENT '手机型号（如 Redmi Note 13）',
  `imei`          VARCHAR(20) COMMENT 'IMEI 编号',
  -- pending | active | suspended
  `status`        VARCHAR(20) NOT NULL DEFAULT 'pending',
  `activatedAt`   DATETIME(3),
  `wechatOpenId`  VARCHAR(100) COMMENT '老板微信 OpenID，用于推送通知',
  `wechatUnionId` VARCHAR(100),
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `idx_factory` (`factoryId`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. openclaw_instances ───────────────────────────────────
-- OpenClaw 云端实例注册表
-- dedicated = 独立版（一对一），standard = 标准版（共享）
CREATE TABLE IF NOT EXISTS `openclaw_instances` (
  `id`            INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `instanceKey`   VARCHAR(100) NOT NULL UNIQUE COMMENT '实例唯一标识，对应 clawAgentRouter 中的 agentId',
  -- dedicated | standard
  `type`          VARCHAR(20) NOT NULL DEFAULT 'standard',
  -- idle | busy | offline | error
  `status`        VARCHAR(20) NOT NULL DEFAULT 'offline',
  `factoryId`     INT COMMENT '独立版专属工厂 ID（标准版为 NULL）',
  -- 标准版的行业/地区限制
  `industry`      VARCHAR(100) COMMENT '标准版服务行业（如 solar_panel, furniture）',
  `region`        VARCHAR(100) COMMENT '标准版目标市场地区（如 SEA, EU, NA）',
  `lastHeartbeat` DATETIME(3) COMMENT '最后心跳时间',
  `taskCount`     INT NOT NULL DEFAULT 0 COMMENT '累计完成任务数',
  `metadata`      JSON COMMENT '实例配置元数据',
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `idx_type_status` (`type`, `status`),
  INDEX `idx_factory` (`factoryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. openclaw_accounts ────────────────────────────────────
-- OpenClaw 托管账号表（A 方向：老板真实账号）
-- 存储加密的 Session，不存储明文密码
CREATE TABLE IF NOT EXISTS `openclaw_accounts` (
  `id`              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `factoryId`       INT NOT NULL,
  `instanceId`      INT NOT NULL COMMENT '托管在哪个 OpenClaw 实例上',
  -- linkedin | facebook | alibaba | made_in_china | global_sources
  `platform`        VARCHAR(50) NOT NULL,
  `accountHandle`   VARCHAR(200) COMMENT '账号用户名/邮箱（脱敏显示用）',
  -- active | expired | suspended | error
  `sessionStatus`   VARCHAR(20) NOT NULL DEFAULT 'active',
  `encryptedSession` TEXT COMMENT 'AES-256 加密的 Session Cookie',
  `sessionExpiresAt` DATETIME(3),
  `lastActiveAt`    DATETIME(3),
  `followerCount`   INT COMMENT '账号粉丝/连接数（定期更新）',
  `postCount`       INT COMMENT '账号发帖数',
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `idx_factory_platform` (`factoryId`, `platform`),
  INDEX `idx_session_status` (`sessionStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. commander_tasks ──────────────────────────────────────
-- 指挥台任务表（老板发起的每一条指令）
CREATE TABLE IF NOT EXISTS `commander_tasks` (
  `id`              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `factoryId`       INT NOT NULL,
  `instanceId`      INT COMMENT '分配到的 OpenClaw 实例',
  -- rfq_monitor | hunter | scout | content | geo_build | daily_report
  `taskType`        VARCHAR(50) NOT NULL,
  -- pending | running | step1_done | step2_done | completed | failed | cancelled
  `status`          VARCHAR(30) NOT NULL DEFAULT 'pending',
  `title`           VARCHAR(200) NOT NULL COMMENT '任务标题（如"开发越南太阳能板市场"）',
  `params`          JSON COMMENT '任务参数（目标市场、行业、关键词等）',
  `creditCost`      INT NOT NULL DEFAULT 0 COMMENT '消耗积分数',
  -- 进度步骤（JSON 数组，每步包含 stepName/status/completedAt/output）
  `steps`           JSON,
  `result`          JSON COMMENT '最终结果摘要',
  `errorMessage`    TEXT,
  `bullmqJobId`     VARCHAR(100) COMMENT '对应的 BullMQ Job ID',
  `startedAt`       DATETIME(3),
  `completedAt`     DATETIME(3),
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `idx_factory_status` (`factoryId`, `status`),
  INDEX `idx_task_type` (`taskType`),
  INDEX `idx_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. inbound_leads ────────────────────────────────────────
-- 入站询盘/线索表（由 RFQ 监控或猎手 Agent 产出）
CREATE TABLE IF NOT EXISTS `inbound_leads` (
  `id`              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `factoryId`       INT NOT NULL,
  `taskId`          INT COMMENT '产生此线索的任务 ID',
  -- rfq_platform | hunter_linkedin | hunter_facebook | geo_inbound
  `source`          VARCHAR(50) NOT NULL,
  `sourcePlatform`  VARCHAR(50) COMMENT '来源平台（alibaba / linkedin / facebook 等）',
  `sourceUrl`       VARCHAR(500) COMMENT '原始询盘链接',
  -- 买家信息
  `buyerName`       VARCHAR(200),
  `buyerCompany`    VARCHAR(200),
  `buyerCountry`    VARCHAR(100),
  `buyerTitle`      VARCHAR(200) COMMENT '职位',
  `buyerContact`    VARCHAR(200) COMMENT '联系方式（邮箱/LinkedIn URL）',
  -- 询盘内容
  `originalContent` TEXT COMMENT '原始询盘内容（英文）',
  `aiSummary`       TEXT COMMENT 'AI 生成的中文摘要',
  `productCategory` VARCHAR(200) COMMENT '询盘产品品类',
  `estimatedValue`  VARCHAR(100) COMMENT '预估订单金额',
  -- 质量评分 0-100
  `qualityScore`    INT NOT NULL DEFAULT 0,
  -- new | viewed | replied | archived | converted
  `status`          VARCHAR(30) NOT NULL DEFAULT 'new',
  `viewedAt`        DATETIME(3),
  `wechatNotifiedAt` DATETIME(3) COMMENT '微信通知发送时间',
  `feishuSyncedAt`  DATETIME(3) COMMENT '飞书归档时间',
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `idx_factory_status` (`factoryId`, `status`),
  INDEX `idx_quality` (`qualityScore`),
  INDEX `idx_source` (`source`),
  INDEX `idx_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. lead_replies ─────────────────────────────────────────
-- 询盘回复表（老板中文回复 → AI 翻译 → OpenClaw 代发）
CREATE TABLE IF NOT EXISTS `lead_replies` (
  `id`              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `leadId`          INT NOT NULL,
  `factoryId`       INT NOT NULL,
  `chineseContent`  TEXT NOT NULL COMMENT '老板输入的中文回复',
  `englishContent`  TEXT COMMENT 'AI 翻译的英文版本',
  `translationModel` VARCHAR(50) COMMENT '翻译使用的模型',
  -- draft | pending_send | sent | failed
  `sendStatus`      VARCHAR(30) NOT NULL DEFAULT 'draft',
  `sentAt`          DATETIME(3),
  `sendError`       TEXT,
  `clawInstanceId`  INT COMMENT '执行发送的 OpenClaw 实例',
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `idx_lead` (`leadId`),
  INDEX `idx_factory_status` (`factoryId`, `sendStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 7. credit_ledger ────────────────────────────────────────
-- 积分流水表（充值/消耗记录）
CREATE TABLE IF NOT EXISTS `credit_ledger` (
  `id`              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `factoryId`       INT NOT NULL,
  -- recharge | task_deduct | task_refund | bonus | admin_adjust
  `type`            VARCHAR(30) NOT NULL,
  `amount`          INT NOT NULL COMMENT '正数=增加，负数=减少',
  `balanceAfter`    INT NOT NULL COMMENT '操作后余额',
  `description`     VARCHAR(500) COMMENT '流水描述',
  `taskId`          INT COMMENT '关联任务 ID（消耗/退还时）',
  `orderId`         VARCHAR(100) COMMENT '充值订单号',
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `idx_factory` (`factoryId`),
  INDEX `idx_type` (`type`),
  INDEX `idx_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 8. digital_assets ───────────────────────────────────────
-- 工厂数字资产快照表（每周更新一次）
CREATE TABLE IF NOT EXISTS `digital_assets` (
  `id`              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `factoryId`       INT NOT NULL,
  -- 账号资产统计
  `linkedinFollowers` INT COMMENT 'LinkedIn 连接数',
  `facebookFollowers` INT COMMENT 'Facebook 粉丝数',
  `alibabaInquiries` INT COMMENT '阿里巴巴月均询盘数',
  -- GEO 评分（0-100）
  `geoScore`        INT COMMENT 'AI 搜索可见度综合评分',
  `geoScoreDetails` JSON COMMENT '各维度评分明细',
  -- 询盘统计
  `monthlyLeads`    INT COMMENT '本月累计询盘数',
  `totalLeads`      INT COMMENT '累计总询盘数',
  `convertedLeads`  INT COMMENT '已转化询盘数',
  -- 飞书数据库统计
  `feishuContacts`  INT COMMENT '飞书客户数据库联系人数',
  `snapshotDate`    DATE NOT NULL COMMENT '快照日期',
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `idx_factory_date` (`factoryId`, `snapshotDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
