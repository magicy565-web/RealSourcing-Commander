/**
 * Commander 5.0 — AI 风格训练路由
 * POST /api/v1/training/samples     上传历史报价样本
 * POST /api/v1/training/extract     触发风格提取（调用 AI）
 * GET  /api/v1/training/profile     获取当前风格档案
 * DELETE /api/v1/training/profile   重置风格档案
 * GET  /api/v1/training/samples     获取已上传的样本列表
 */
import { Hono } from "hono";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { extractStyleProfile } from "../services/ai.js";

const training = new Hono();
training.use("*", authMiddleware);

// ─── 确保 style_profiles 和 training_samples 表存在 ──────────
db.exec(`
  CREATE TABLE IF NOT EXISTS style_profiles (
    id           TEXT PRIMARY KEY,
    tenant_id    TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    tone         TEXT,
    greeting     TEXT,
    closing      TEXT,
    key_phrases  TEXT DEFAULT '[]',
    pricing_approach TEXT,
    followup_style   TEXT,
    summary      TEXT,
    sample_count INTEGER DEFAULT 0,
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS training_samples (
    id           TEXT PRIMARY KEY,
    tenant_id    TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    content      TEXT NOT NULL,
    label        TEXT DEFAULT 'quote',
    created_at   TEXT DEFAULT (datetime('now'))
  );
`);

// GET /api/v1/training/samples — 获取样本列表
training.get("/samples", (c) => {
  const { tenantId, sub: userId } = c.get("user") as any;
  const samples = db
    .prepare("SELECT id, label, substr(content,1,100) as preview, created_at FROM training_samples WHERE tenant_id=? AND user_id=? ORDER BY created_at DESC")
    .all(tenantId, userId);
  return c.json({ items: samples, total: samples.length });
});

// POST /api/v1/training/samples — 上传样本（支持批量）
training.post("/samples", async (c) => {
  const { tenantId, sub: userId } = c.get("user") as any;
  const body = await c.req.json() as { samples: Array<{ content: string; label?: string }> };

  if (!body.samples || !Array.isArray(body.samples) || body.samples.length === 0) {
    return c.json({ error: "samples 不能为空" }, 400);
  }
  if (body.samples.length > 20) {
    return c.json({ error: "单次最多上传 20 条样本" }, 400);
  }

  const insert = db.prepare(
    "INSERT INTO training_samples (id, tenant_id, user_id, content, label) VALUES (?, ?, ?, ?, ?)"
  );

  const insertMany = db.transaction((items: typeof body.samples) => {
    const ids: string[] = [];
    for (const item of items) {
      if (!item.content?.trim()) continue;
      const id = `sample-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      insert.run(id, tenantId, userId, item.content.trim(), item.label ?? "quote");
      ids.push(id);
    }
    return ids;
  });

  const ids = insertMany(body.samples);
  return c.json({ success: true, inserted: ids.length, ids });
});

// DELETE /api/v1/training/samples/:id — 删除单条样本
training.delete("/samples/:id", (c) => {
  const { tenantId, sub: userId } = c.get("user") as any;
  const { id } = c.req.param();
  const result = db
    .prepare("DELETE FROM training_samples WHERE id=? AND tenant_id=? AND user_id=?")
    .run(id, tenantId, userId);
  if (result.changes === 0) return c.json({ error: "样本不存在" }, 404);
  return c.json({ success: true });
});

// POST /api/v1/training/extract — 触发 AI 风格提取
training.post("/extract", async (c) => {
  const { tenantId, sub: userId } = c.get("user") as any;

  // 获取所有样本
  const samples = db
    .prepare("SELECT content FROM training_samples WHERE tenant_id=? AND user_id=? ORDER BY created_at DESC LIMIT 15")
    .all(tenantId, userId) as Array<{ content: string }>;

  if (samples.length === 0) {
    return c.json({ error: "请先上传至少 1 条历史报价样本" }, 400);
  }

  try {
    const profile = await extractStyleProfile(samples.map((s) => s.content));

    // 存入数据库（upsert）
    const existing = db
      .prepare("SELECT id FROM style_profiles WHERE tenant_id=? AND user_id=?")
      .get(tenantId, userId) as any;

    const profileId = existing?.id ?? `profile-${tenantId}-${userId}`;
    const now = new Date().toISOString();

    if (existing) {
      db.prepare(`
        UPDATE style_profiles SET
          tone=?, greeting=?, closing=?, key_phrases=?,
          pricing_approach=?, followup_style=?, summary=?,
          sample_count=?, updated_at=?
        WHERE id=?
      `).run(
        profile.tone, profile.greeting, profile.closing,
        JSON.stringify(profile.keyPhrases), profile.pricingApproach,
        profile.followupStyle, profile.summary, samples.length, now, profileId
      );
    } else {
      db.prepare(`
        INSERT INTO style_profiles (id, tenant_id, user_id, tone, greeting, closing, key_phrases, pricing_approach, followup_style, summary, sample_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        profileId, tenantId, userId, profile.tone, profile.greeting, profile.closing,
        JSON.stringify(profile.keyPhrases), profile.pricingApproach,
        profile.followupStyle, profile.summary, samples.length, now
      );
    }

    return c.json({ success: true, profile, sampleCount: samples.length });
  } catch (err: any) {
    console.error("风格提取失败:", err);
    return c.json({ error: "AI 风格提取失败，请稍后重试", detail: err.message }, 500);
  }
});

// GET /api/v1/training/profile — 获取风格档案
training.get("/profile", (c) => {
  const { tenantId, sub: userId } = c.get("user") as any;
  const profile = db
    .prepare("SELECT * FROM style_profiles WHERE tenant_id=? AND user_id=?")
    .get(tenantId, userId) as any;

  if (!profile) {
    return c.json({ profile: null, hasProfile: false });
  }

  return c.json({
    hasProfile: true,
    profile: {
      ...profile,
      keyPhrases: JSON.parse(profile.key_phrases ?? "[]"),
    },
  });
});

// DELETE /api/v1/training/profile — 重置风格档案
training.delete("/profile", (c) => {
  const { tenantId, sub: userId } = c.get("user") as any;
  db.prepare("DELETE FROM style_profiles WHERE tenant_id=? AND user_id=?").run(tenantId, userId);
  db.prepare("DELETE FROM training_samples WHERE tenant_id=? AND user_id=?").run(tenantId, userId);
  return c.json({ success: true });
});

export default training;
