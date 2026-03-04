/**
 * Phase 9 — AI 全家桶 Agent 管理路由
 *
 * GET    /api/v1/agents                  — 获取 Agent 列表
 * POST   /api/v1/agents                  — 创建 Agent
 * GET    /api/v1/agents/:id              — 获取 Agent 详情
 * PATCH  /api/v1/agents/:id              — 更新 Agent 配置
 * DELETE /api/v1/agents/:id              — 删除 Agent
 * POST   /api/v1/agents/:id/trigger      — 手动触发 Agent 任务
 * GET    /api/v1/agents/:id/tasks        — 获取 Agent 任务历史
 * GET    /api/v1/agents/tasks/:taskId    — 获取任务详情
 * POST   /api/v1/agents/tasks/:taskId/cancel — 取消任务
 *
 * GET    /api/v1/agents/leads            — 获取线索列表
 * PATCH  /api/v1/agents/leads/:id        — 更新线索状态
 * GET    /api/v1/agents/trends           — 获取竞品视频列表
 * GET    /api/v1/agents/suggestions      — 获取选题建议列表
 * PATCH  /api/v1/agents/suggestions/:id  — 更新选题状态
 */
import { Hono } from "hono";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { nanoid } from "nanoid";
import { runAgentTask } from "../_core/agentWorker.js";

type AgentEnv = { Variables: { user: any } };
const agents = new Hono<AgentEnv>();
agents.use("*", authMiddleware);

// ─── 辅助函数 ─────────────────────────────────────────────────
function safeJson(v: any, fallback: any = {}) {
  if (!v) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

// ─── 预置 Agent 模板 ──────────────────────────────────────────
const AGENT_TEMPLATES = [
  {
    type: "leads_hunter",
    name: "线索猎手",
    description: "监控 TikTok/IG 评论区，AI 识别询盘意向并抓取联系方式",
    defaultConfig: {
      platforms: ["tiktok", "instagram"],
      targetAccounts: [],
      keywords: ["How much", "Price", "Interested", "Where to buy", "MOQ", "wholesale"],
      intentThreshold: 60,
    },
  },
  {
    type: "trend_radar",
    name: "爆款雷达",
    description: "深度分析竞品视频的视觉、情绪、节奏规律，拆解爆款公式",
    defaultConfig: {
      platforms: ["tiktok"],
      competitorAccounts: [],
      analysisDays: 30,
      topN: 5,
    },
  },
  {
    type: "content_pilot",
    name: "选题助手",
    description: "基于竞品动态和行业热点，AI 生成高转化选题和脚本框架",
    defaultConfig: {
      suggestionsPerRun: 3,
      scriptStyle: "4段式",
      industry: "general",
    },
  },
  {
    type: "digital_human",
    name: "数字分身",
    description: "自动将 AI 脚本转化为多语种数字人视频，无需真人出镜",
    defaultConfig: {
      heygenAvatarId: "",
      heygenVoiceId: "",
      outputLanguages: ["en", "zh"],
    },
  },
  {
    type: "auto_poster",
    name: "全网分发",
    description: "自动将视频分发至 TikTok, YouTube, Reels, Shorts",
    defaultConfig: {
      platforms: ["tiktok", "youtube"],
      postSchedule: "09:00",
    },
  },
  {
    type: "dm_closer",
    name: "私信客服",
    description: "24 小时自动回复私信，引导客户留资或跳转 WhatsApp",
    defaultConfig: {
      platforms: ["tiktok", "instagram"],
      responseDelay: 60,
      knowledgeBaseEnabled: true,
    },
  },
  {
    type: "email_follower",
    name: "邮件跟进",
    description: "自动发送开发信和跟进邮件，根据回复内容智能调整策略",
    defaultConfig: {
      sequenceSteps: 3,
      intervalDays: 3,
      emailStyle: "formal",
    },
  },
];

// ─── GET /agents — 获取 Agent 列表 ───────────────────────────
agents.get("/", async (c) => {
  const user = c.get("user");
  const tenantId = user.tenantId;

  // 确保 agents 表存在（兼容旧数据库）
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY, tenant_id TEXT, name TEXT NOT NULL, type TEXT NOT NULL,
      description TEXT, config TEXT DEFAULT '{}', cron_expr TEXT,
      status TEXT DEFAULT 'idle', is_enabled INTEGER DEFAULT 1,
      last_run_at TEXT, last_result TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const rows = db.prepare(
    "SELECT * FROM agents WHERE tenant_id = ? ORDER BY created_at ASC"
  ).all(tenantId) as any[];

  // 如果没有 Agent，自动初始化前 3 个（第一梯队）
  if (rows.length === 0) {
    const now = new Date().toISOString();
    const firstThree = AGENT_TEMPLATES.slice(0, 3);
    for (const tpl of firstThree) {
      const id = `agent-${tpl.type}-${nanoid(6)}`;
      db.prepare(`
        INSERT INTO agents (id, tenant_id, name, type, description, config, status, is_enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'idle', 1, ?, ?)
      `).run(id, tenantId, tpl.name, tpl.type, tpl.description, JSON.stringify(tpl.defaultConfig), now, now);
    }
    const newRows = db.prepare(
      "SELECT * FROM agents WHERE tenant_id = ? ORDER BY created_at ASC"
    ).all(tenantId) as any[];
    return c.json(newRows.map(r => ({ ...r, config: safeJson(r.config), last_result: safeJson(r.last_result) })));
  }

  return c.json(rows.map(r => ({ ...r, config: safeJson(r.config), last_result: safeJson(r.last_result) })));
});

// ─── POST /agents — 创建 Agent ────────────────────────────────
agents.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const { type, name, description, config, cron_expr } = body;

  if (!type || !name) {
    return c.json({ error: "type 和 name 为必填项" }, 400);
  }

  const id = `agent-${type}-${nanoid(6)}`;
  const now = new Date().toISOString();
  const template = AGENT_TEMPLATES.find(t => t.type === type);
  const mergedConfig = { ...(template?.defaultConfig ?? {}), ...(config ?? {}) };

  db.prepare(`
    INSERT INTO agents (id, tenant_id, name, type, description, config, cron_expr, status, is_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'idle', 1, ?, ?)
  `).run(id, user.tenantId, name, type, description ?? template?.description ?? "", JSON.stringify(mergedConfig), cron_expr ?? null, now, now);

  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as any;
  return c.json({ ...agent, config: safeJson(agent.config) }, 201);
});

// ─── GET /agents/templates — 获取 Agent 模板列表 ─────────────
agents.get("/templates", async (c) => {
  return c.json(AGENT_TEMPLATES);
});

// ─── GET /agents/leads — 获取线索列表 ────────────────────────
agents.get("/leads", async (c) => {
  const user = c.get("user");
  const { status, platform, intent, limit = "50", offset = "0" } = c.req.query();

  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY, tenant_id TEXT, agent_task_id TEXT,
      source_platform TEXT DEFAULT 'tiktok', source_url TEXT,
      user_handle TEXT, user_name TEXT, content TEXT,
      intent_score INTEGER DEFAULT 0, intent_label TEXT DEFAULT 'general',
      contact_info TEXT DEFAULT '{}', ai_summary TEXT,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  let sql = "SELECT * FROM leads WHERE tenant_id = ?";
  const params: any[] = [user.tenantId];

  if (status) { sql += " AND status = ?"; params.push(status); }
  if (platform) { sql += " AND source_platform = ?"; params.push(platform); }
  if (intent) { sql += " AND intent_label = ?"; params.push(intent); }

  sql += " ORDER BY intent_score DESC, created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const rows = db.prepare(sql).all(...params) as any[];
  const total = (db.prepare(
    "SELECT COUNT(*) as c FROM leads WHERE tenant_id = ?"
  ).get(user.tenantId) as any).c;

  return c.json({
    items: rows.map(r => ({ ...r, contact_info: safeJson(r.contact_info) })),
    total,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

// ─── PATCH /agents/leads/:id — 更新线索状态 ──────────────────
agents.patch("/leads/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const { status } = body;

  const lead = db.prepare("SELECT * FROM leads WHERE id = ? AND tenant_id = ?").get(id, user.tenantId) as any;
  if (!lead) return c.json({ error: "线索不存在" }, 404);

  db.prepare(
    "UPDATE leads SET status = ?, updated_at = ? WHERE id = ?"
  ).run(status, new Date().toISOString(), id);

  return c.json({ id, status, message: "线索状态已更新" });
});

// ─── GET /agents/trends — 获取竞品视频列表 ───────────────────
agents.get("/trends", async (c) => {
  const user = c.get("user");
  const { limit = "20", offset = "0", viral_only } = c.req.query();

  db.exec(`
    CREATE TABLE IF NOT EXISTS trend_videos (
      id TEXT PRIMARY KEY, tenant_id TEXT, agent_task_id TEXT,
      platform TEXT DEFAULT 'tiktok', account_handle TEXT, account_name TEXT,
      video_url TEXT, title TEXT, views INTEGER DEFAULT 0, likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0, shares INTEGER DEFAULT 0,
      engagement_rate REAL DEFAULT 0, duration INTEGER DEFAULT 0,
      opening_type TEXT, bgm TEXT, tags TEXT DEFAULT '[]',
      thumbnail_url TEXT, ai_analysis TEXT, is_viral INTEGER DEFAULT 0,
      published_at TEXT, created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  let sql = "SELECT * FROM trend_videos WHERE tenant_id = ?";
  const params: any[] = [user.tenantId];

  if (viral_only === "true") { sql += " AND is_viral = 1"; }
  sql += " ORDER BY engagement_rate DESC, created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const rows = db.prepare(sql).all(...params) as any[];
  return c.json({
    items: rows.map(r => ({ ...r, tags: safeJson(r.tags, []) })),
    total: rows.length,
  });
});

// ─── GET /agents/suggestions — 获取选题建议列表 ───────────────
agents.get("/suggestions", async (c) => {
  const user = c.get("user");
  const { status, limit = "20" } = c.req.query();

  db.exec(`
    CREATE TABLE IF NOT EXISTS content_suggestions (
      id TEXT PRIMARY KEY, tenant_id TEXT, agent_task_id TEXT,
      title TEXT NOT NULL, hook TEXT, value_prop TEXT, proof TEXT, cta TEXT,
      full_script TEXT, estimated_views INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]', status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  let sql = "SELECT * FROM content_suggestions WHERE tenant_id = ?";
  const params: any[] = [user.tenantId];
  if (status) { sql += " AND status = ?"; params.push(status); }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(parseInt(limit));

  const rows = db.prepare(sql).all(...params) as any[];
  return c.json({
    items: rows.map(r => ({ ...r, tags: safeJson(r.tags, []) })),
    total: rows.length,
  });
});

// ─── PATCH /agents/suggestions/:id — 更新选题状态 ────────────
agents.patch("/suggestions/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  const { status } = body;

  db.prepare(
    "UPDATE content_suggestions SET status = ? WHERE id = ? AND tenant_id = ?"
  ).run(status, id, user.tenantId);

  return c.json({ id, status, message: "选题状态已更新" });
});

// ─── GET /agents/:id — 获取 Agent 详情 ───────────────────────
agents.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const agent = db.prepare("SELECT * FROM agents WHERE id = ? AND tenant_id = ?").get(id, user.tenantId) as any;
  if (!agent) return c.json({ error: "Agent 不存在" }, 404);

  // 获取最近 5 次任务
  const recentTasks = db.prepare(
    "SELECT * FROM agent_tasks WHERE agent_id = ? ORDER BY created_at DESC LIMIT 5"
  ).all(id) as any[];

  return c.json({
    ...agent,
    config: safeJson(agent.config),
    last_result: safeJson(agent.last_result),
    recent_tasks: recentTasks.map(t => ({
      ...t,
      input_data: safeJson(t.input_data),
      result_data: safeJson(t.result_data),
    })),
  });
});

// ─── PATCH /agents/:id — 更新 Agent 配置 ─────────────────────
agents.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();

  const agent = db.prepare("SELECT * FROM agents WHERE id = ? AND tenant_id = ?").get(id, user.tenantId) as any;
  if (!agent) return c.json({ error: "Agent 不存在" }, 404);

  const updates: string[] = [];
  const params: any[] = [];

  if (body.name !== undefined) { updates.push("name = ?"); params.push(body.name); }
  if (body.description !== undefined) { updates.push("description = ?"); params.push(body.description); }
  if (body.config !== undefined) {
    const merged = { ...safeJson(agent.config), ...body.config };
    updates.push("config = ?");
    params.push(JSON.stringify(merged));
  }
  if (body.cron_expr !== undefined) { updates.push("cron_expr = ?"); params.push(body.cron_expr); }
  if (body.is_enabled !== undefined) { updates.push("is_enabled = ?"); params.push(body.is_enabled ? 1 : 0); }

  if (updates.length === 0) return c.json({ error: "没有可更新的字段" }, 400);

  updates.push("updated_at = ?");
  params.push(new Date().toISOString(), id);

  db.prepare(`UPDATE agents SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as any;
  return c.json({ ...updated, config: safeJson(updated.config) });
});

// ─── POST /agents/:id/trigger — 手动触发 Agent 任务 ──────────
agents.post("/:id/trigger", async (c) => {
  const user = c.get("user");
  const agentId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  const agent = db.prepare("SELECT * FROM agents WHERE id = ? AND tenant_id = ?").get(agentId, user.tenantId) as any;
  if (!agent) return c.json({ error: "Agent 不存在" }, 404);
  if (!agent.is_enabled) return c.json({ error: "Agent 已禁用" }, 400);
  if (agent.status === "running") return c.json({ error: "Agent 正在运行中，请稍后再试" }, 409);

  // 创建任务记录
  const taskId = `task-${nanoid(10)}`;
  const now = new Date().toISOString();
  const agentConfig = safeJson(agent.config);
  const inputData = { ...agentConfig, ...(body.override ?? {}) };

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id TEXT PRIMARY KEY, agent_id TEXT, tenant_id TEXT,
      status TEXT DEFAULT 'pending', session_id TEXT, trigger_type TEXT DEFAULT 'manual',
      input_data TEXT DEFAULT '{}', result_data TEXT DEFAULT '{}',
      error_msg TEXT, progress INTEGER DEFAULT 0, current_step TEXT,
      started_at TEXT, completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.prepare(`
    INSERT INTO agent_tasks (id, agent_id, tenant_id, status, trigger_type, input_data, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', 'manual', ?, ?, ?)
  `).run(taskId, agentId, user.tenantId, JSON.stringify(inputData), now, now);

  // 更新 Agent 状态
  db.prepare("UPDATE agents SET status = 'running', updated_at = ? WHERE id = ?").run(now, agentId);

  // 异步执行 Agent 任务（不阻塞 HTTP 响应）
  runAgentTask(taskId, agentId, agent.type, inputData, user.tenantId).catch(err => {
    console.error(`[AgentWorker] 任务 ${taskId} 执行失败:`, err);
  });

  return c.json({
    taskId,
    agentId,
    status: "pending",
    message: `Agent "${agent.name}" 任务已触发，正在执行中`,
    createdAt: now,
  }, 202);
});

// ─── GET /agents/:id/tasks — 获取 Agent 任务历史 ─────────────
agents.get("/:id/tasks", async (c) => {
  const user = c.get("user");
  const agentId = c.req.param("id");
  const { limit = "20", offset = "0" } = c.req.query();

  const agent = db.prepare("SELECT id FROM agents WHERE id = ? AND tenant_id = ?").get(agentId, user.tenantId);
  if (!agent) return c.json({ error: "Agent 不存在" }, 404);

  const tasks = db.prepare(
    "SELECT * FROM agent_tasks WHERE agent_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
  ).all(agentId, parseInt(limit), parseInt(offset)) as any[];

  const total = (db.prepare(
    "SELECT COUNT(*) as c FROM agent_tasks WHERE agent_id = ?"
  ).get(agentId) as any).c;

  return c.json({
    items: tasks.map(t => ({
      ...t,
      input_data: safeJson(t.input_data),
      result_data: safeJson(t.result_data),
    })),
    total,
  });
});

// ─── GET /agents/tasks/:taskId — 获取任务详情 ─────────────────
agents.get("/tasks/:taskId", async (c) => {
  const user = c.get("user");
  const taskId = c.req.param("taskId");

  const task = db.prepare(
    "SELECT * FROM agent_tasks WHERE id = ? AND tenant_id = ?"
  ).get(taskId, user.tenantId) as any;

  if (!task) return c.json({ error: "任务不存在" }, 404);

  return c.json({
    ...task,
    input_data: safeJson(task.input_data),
    result_data: safeJson(task.result_data),
  });
});

// ─── POST /agents/tasks/:taskId/cancel — 取消任务 ─────────────
agents.post("/tasks/:taskId/cancel", async (c) => {
  const user = c.get("user");
  const taskId = c.req.param("taskId");

  const task = db.prepare(
    "SELECT * FROM agent_tasks WHERE id = ? AND tenant_id = ?"
  ).get(taskId, user.tenantId) as any;

  if (!task) return c.json({ error: "任务不存在" }, 404);
  if (task.status === "success" || task.status === "failed") {
    return c.json({ error: "任务已完成，无法取消" }, 400);
  }

  const now = new Date().toISOString();
  db.prepare(
    "UPDATE agent_tasks SET status = 'cancelled', completed_at = ?, updated_at = ? WHERE id = ?"
  ).run(now, now, taskId);

  // 同步更新 Agent 状态
  db.prepare(
    "UPDATE agents SET status = 'idle', updated_at = ? WHERE id = ?"
  ).run(now, task.agent_id);

  return c.json({ taskId, status: "cancelled", message: "任务已取消" });
});

export default agents;
