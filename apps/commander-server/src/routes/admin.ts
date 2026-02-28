/**
 * Commander 5.0 Phase 3 — 管理后台 API
 * GET    /api/v1/admin/knowledge              行业知识库列表
 * POST   /api/v1/admin/knowledge              添加知识点
 * DELETE /api/v1/admin/knowledge/:id          删除知识点
 * POST   /api/v1/admin/knowledge/bulk-import  批量导入（Excel/Word）Sprint 3.2
 * GET    /api/v1/admin/knowledge/template     下载导入模板
 * GET    /api/v1/admin/monitor                系统监控数据
 * GET    /api/v1/admin/feed                   信息流管理列表
 * PATCH  /api/v1/admin/feed/:id               更新信息流条目状态
 */
import { Hono } from "hono";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import type { JWTPayload } from "../middleware/auth.js";
import { nanoid } from "nanoid";
import os from "os";
import { parseExcel, parseWord } from "../services/knowledgeImport.js";
import * as XLSX from "xlsx";

const admin = new Hono<{ Variables: { user: JWTPayload } }>();
admin.use("*", authMiddleware);

// 管理员权限检查中间件
admin.use("*", async (c, next) => {
  const user = c.get("user");
  const dbUser = db.prepare("SELECT role FROM users WHERE id = ?").get(user.sub) as any;
  if (dbUser?.role !== "admin") {
    return c.json({ error: "需要管理员权限" }, 403);
  }
  await next();
});

// ─── 行业知识库管理 ──────────────────────────────────────────────────────────
admin.get("/knowledge", (c) => {
  const { industry, category } = c.req.query();

  let sql = "SELECT * FROM industry_knowledge WHERE 1=1";
  const params: string[] = [];

  if (industry) {
    sql += " AND industry = ?";
    params.push(industry);
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  sql += " ORDER BY industry, category, key";

  const items = db.prepare(sql).all(...params) as any[];

  return c.json({
    items,
    total: items.length,
    industries: ["furniture", "textile", "electronics", "lighting", "other"],
    categories: ["price_range", "cert", "term", "template", "other"],
  });
});

admin.post("/knowledge", async (c) => {
  const body = await c.req.json();
  const { industry, category, key, value, source = "manual" } = body;

  if (!industry || !category || !key || !value) {
    return c.json({ error: "industry, category, key, value 为必填项" }, 400);
  }

  const id = `kb-${nanoid(8)}`;
  db.prepare(`
    INSERT INTO industry_knowledge (id, industry, category, key, value, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, industry, category, key, value, source);

  return c.json({ id, industry, category, key, value, source }, 201);
});

admin.delete("/knowledge/:id", (c) => {
  const id = c.req.param("id");
  const item = db.prepare("SELECT id FROM industry_knowledge WHERE id = ?").get(id);
  if (!item) {
    return c.json({ error: "知识点不存在" }, 404);
  }
  db.prepare("DELETE FROM industry_knowledge WHERE id = ?").run(id);
  return c.json({ message: "已删除" });
});

// ─── 批量导入知识库（Excel / Word）Sprint 3.2 ────────────────────────────────
// POST /api/v1/admin/knowledge/bulk-import
// Content-Type: multipart/form-data
// 字段：file（.xlsx/.xls/.docx）, overwrite（可选，"true" 时覆盖同名条目）
admin.post("/knowledge/bulk-import", async (c) => {
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: "请求格式错误，需要 multipart/form-data" }, 400);
  }

  const file = formData.get("file") as File | null;
  const overwrite = formData.get("overwrite") === "true";

  if (!file) {
    return c.json({ error: "缺少 file 字段" }, 400);
  }

  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
  const isWord = fileName.endsWith(".docx");

  if (!isExcel && !isWord) {
    return c.json({ error: "仅支持 .xlsx、.xls、.docx 格式" }, 400);
  }

  // 读取文件 Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 解析文件
  let parseResult;
  try {
    if (isExcel) {
      parseResult = parseExcel(buffer);
    } else {
      parseResult = await parseWord(buffer);
    }
  } catch (err: any) {
    return c.json({ error: `文件解析失败: ${err?.message || String(err)}` }, 500);
  }

  if (parseResult.records.length === 0) {
    return c.json({
      success: false,
      message: "未解析到有效数据",
      parseResult,
    }, 400);
  }

  // 批量写入数据库（事务）
  const insertStmt = db.prepare(`
    INSERT INTO industry_knowledge (id, industry, category, key, value, source)
    VALUES (?, ?, ?, ?, ?, 'import')
  `);
  const updateStmt = db.prepare(`
    UPDATE industry_knowledge SET value = ?, source = 'import' WHERE industry = ? AND key = ?
  `);
  const checkStmt = db.prepare(`
    SELECT id FROM industry_knowledge WHERE industry = ? AND key = ?
  `);

  let dbInserted = 0;
  let dbUpdated = 0;
  let dbSkipped = 0;
  const dbErrors: string[] = [];

  const insertAll = db.transaction(() => {
    for (const record of parseResult.records) {
      try {
        const existing = checkStmt.get(record.industry, record.key) as any;
        if (existing) {
          if (overwrite) {
            updateStmt.run(record.value, record.industry, record.key);
            dbUpdated++;
          } else {
            dbSkipped++;
          }
        } else {
          insertStmt.run(`kb-${nanoid(8)}`, record.industry, record.category, record.key, record.value);
          dbInserted++;
        }
      } catch (err: any) {
        dbErrors.push(`写入 "${record.key}" 失败: ${err?.message}`);
      }
    }
  });

  try {
    insertAll();
  } catch (err: any) {
    return c.json({ error: `数据库写入失败: ${err?.message}` }, 500);
  }

  return c.json({
    success: true,
    message: `导入完成：新增 ${dbInserted} 条，更新 ${dbUpdated} 条，跳过 ${dbSkipped} 条`,
    summary: {
      parsed: parseResult.total,
      parseImported: parseResult.imported,
      parseSkipped: parseResult.skipped,
      dbInserted,
      dbUpdated,
      dbSkipped,
    },
    errors: [...parseResult.errors, ...dbErrors],
  });
});

// ─── 下载导入模板（Excel）────────────────────────────────────────────────────
// GET /api/v1/admin/knowledge/template
admin.get("/knowledge/template", (c) => {
  const templateData = [
    ["industry", "category", "key", "value"],
    ["furniture", "price_range", "实木餐桌", "FOB $80-$150/套，视材质和尺寸"],
    ["furniture", "cert", "欧洲市场", "EN 71 玩具安全标准、REACH 法规"],
    ["textile", "price_range", "有机棉 T 恤", "FOB $2.5-$8/件，视克重和印花"],
    ["textile", "cert", "有机棉", "GOTS 认证（全球有机纺织品标准）"],
    ["lighting", "price_range", "LED 球泡灯", "FOB $0.8-$2.5/个，视瓦数和品牌"],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(templateData);

  // 设置列宽
  ws["!cols"] = [
    { wch: 15 }, // industry
    { wch: 15 }, // category
    { wch: 20 }, // key
    { wch: 40 }, // value
  ];

  XLSX.utils.book_append_sheet(wb, ws, "知识库导入模板");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="knowledge_import_template.xlsx"',
    },
  });
});

// ─── 系统监控数据 ────────────────────────────────────────────────────────────
admin.get("/monitor", (c) => {
  const user = c.get("user");
  const today = new Date().toISOString().split("T")[0];

  // 系统健康
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
  const cpuLoad = os.loadavg()[0];
  const cpuPercent = Math.min(Math.round((cpuLoad / os.cpus().length) * 100), 100);

  // 业务指标
  const todayInquiries = (db.prepare(
    "SELECT COUNT(*) as c FROM inquiries WHERE tenant_id = ? AND received_at >= ?"
  ).get(user.tenantId, `${today}T00:00:00`) as any).c;

  const todayOps = (db.prepare(
    "SELECT COUNT(*) as c FROM agent_logs WHERE tenant_id = ? AND created_at >= ?"
  ).get(user.tenantId, `${today}T00:00:00`) as any).c;

  const todayCredits = (db.prepare(
    "SELECT COALESCE(SUM(credits_used), 0) as total FROM agent_logs WHERE tenant_id = ? AND created_at >= ?"
  ).get(user.tenantId, `${today}T00:00:00`) as any).total;

  const tenant = db.prepare("SELECT credits_balance FROM tenants WHERE id = ?").get(user.tenantId) as any;

  // OpenClaw 状态
  const openclaw = db.prepare(
    "SELECT * FROM openclaw_instances WHERE tenant_id = ? LIMIT 1"
  ).get(user.tenantId) as any;

  const socialAccounts = db.prepare(
    "SELECT platform, account_name, health_status, daily_ops_used, daily_ops_limit FROM social_accounts WHERE tenant_id = ?"
  ).all(user.tenantId) as any[];

  // 最近 10 条操作日志
  const recentLogs = db.prepare(`
    SELECT id, action_type, platform, status, credits_used, detail, created_at
    FROM agent_logs
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `).all(user.tenantId) as any[];

  // AI 接口统计（模拟）
  const apiStats = {
    todayCalls: todayOps * 2,
    avgResponseMs: 850,
    successRate: 98.5,
  };

  // 信息流统计
  const feedStats = {
    total: (db.prepare("SELECT COUNT(*) as c FROM feed_items WHERE status = 'active'").get() as any).c,
    todayBookmarks: (db.prepare(
      "SELECT COUNT(*) as c FROM bookmarks WHERE tenant_id = ? AND created_at >= ?"
    ).get(user.tenantId, `${today}T00:00:00`) as any).c,
  };

  // 知识库统计
  const knowledgeStats = {
    total: (db.prepare("SELECT COUNT(*) as c FROM industry_knowledge").get() as any).c,
    byIndustry: db.prepare(
      "SELECT industry, COUNT(*) as count FROM industry_knowledge GROUP BY industry"
    ).all() as any[],
  };

  return c.json({
    system: {
      status: "online",
      version: "5.0.4",
      uptime: Math.floor(process.uptime()),
      memoryUsed: usedMemPercent,
      cpuUsed: cpuPercent,
      database: "SQLite (connected)",
    },
    business: {
      todayInquiries,
      todayOps,
      todayCredits,
      creditsBalance: tenant?.credits_balance ?? 0,
    },
    openclaw: openclaw
      ? {
          status: openclaw.status,
          opsToday: openclaw.ops_today,
          opsLimit: openclaw.ops_limit,
          lastHeartbeat: openclaw.last_heartbeat,
          consecutiveFailures: openclaw.consecutive_failures ?? 0,
          sleeping: openclaw.status === "sleeping",
          sleepUntil: openclaw.sleep_until ?? null,
          accounts: socialAccounts,
        }
      : null,
    ai: apiStats,
    feed: feedStats,
    knowledge: knowledgeStats,
    recentLogs: recentLogs.map((log) => ({
      ...log,
      detail: JSON.parse(log.detail ?? "{}"),
    })),
    timestamp: new Date().toISOString(),
  });
});

// ─── 信息流管理 ──────────────────────────────────────────────────────────────
admin.get("/feed", (c) => {
  const { status = "active", page = "1", limit = "20" } = c.req.query();
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const items = db.prepare(`
    SELECT * FROM feed_items
    WHERE status = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(status, parseInt(limit), offset) as any[];

  const total = (db.prepare(
    "SELECT COUNT(*) as c FROM feed_items WHERE status = ?"
  ).get(status) as any).c;

  return c.json({
    items: items.map((item) => ({
      ...item,
      ai_tags: JSON.parse(item.ai_tags ?? "[]"),
    })),
    total,
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

admin.patch("/feed/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { status } = body;

  if (!["active", "archived", "published", "pending"].includes(status)) {
    return c.json({ error: "status 只能为 active、archived、published 或 pending" }, 400);
  }

  const item = db.prepare("SELECT id FROM feed_items WHERE id = ?").get(id);
  if (!item) {
    return c.json({ error: "条目不存在" }, 404);
  }

  db.prepare("UPDATE feed_items SET status = ? WHERE id = ?").run(status, id);
  return c.json({ message: "已更新", id, status });
});

export default admin;
