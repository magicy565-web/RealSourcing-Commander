/**
 * Commander 5.0 Phase 3 — 信息流 API
 * GET  /api/v1/feed                   获取信息流（按推荐排序）
 * POST /api/v1/feed                   管理员上传询盘条目
 * POST /api/v1/feed/:id/bookmark      收藏条目，自动创建询盘
 * GET  /api/v1/feed/bookmarks         获取已收藏列表
 * GET  /api/v1/feed/quota             获取今日配额状态
 */
import { Hono } from "hono";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { nanoid } from "nanoid";
import type { AppContext } from "../types/context.js";

const feed = new Hono<AppContext>();
feed.use("*", authMiddleware);

// ─── 推荐引擎：三维加权算法 ────────────────────────────────────
function calculateRecommendationScore(
  item: any,
  tenantIndustry: string,
  userPrefs: any
): number {
  // 1. 行业匹配度（40%）
  let industryScore = 20;
  const itemIndustry = item.industry ?? "other";
  if (tenantIndustry && itemIndustry !== "other") {
    if (
      tenantIndustry.toLowerCase().includes(itemIndustry) ||
      itemIndustry === tenantIndustry
    ) {
      industryScore = 100;
    } else {
      industryScore = 60;
    }
  }

  // 2. 置信度评分（35%）
  const confidenceScore = item.confidence_score ?? 0;

  // 3. 用户偏好（25%）
  let preferenceScore = 50; // 冷启动默认 50
  if (userPrefs) {
    const preferredProducts: string[] = JSON.parse(
      userPrefs.preferred_products ?? "[]"
    );
    const skippedProducts: string[] = JSON.parse(
      userPrefs.skipped_products ?? "[]"
    );
    const productName = item.product_name?.toLowerCase() ?? "";

    const isPreferred = preferredProducts.some((p) =>
      productName.includes(p.toLowerCase())
    );
    const isSkipped = skippedProducts.some((p) =>
      productName.includes(p.toLowerCase())
    );

    if (isPreferred) preferenceScore = 100;
    else if (isSkipped) preferenceScore = 10;
  }

  return industryScore * 0.4 + confidenceScore * 0.35 + preferenceScore * 0.25;
}

// ─── 获取今日配额状态 ─────────────────────────────────────────
feed.get("/quota", (c) => {
  const user = c.get("user") as any;
  const today = new Date().toISOString().split("T")[0];

  let prefs = db
    .prepare("SELECT * FROM user_preferences WHERE user_id = ?")
    .get(user.sub) as any;

  if (!prefs) {
    db.prepare(`
      INSERT INTO user_preferences (id, tenant_id, user_id, quota_reset_date)
      VALUES (?, ?, ?, ?)
    `).run(nanoid(), user.tenantId, user.sub, today);
    prefs = db
      .prepare("SELECT * FROM user_preferences WHERE user_id = ?")
      .get(user.sub) as any;
  }

  // 检查是否需要重置配额
  if (prefs.quota_reset_date !== today) {
    db.prepare(
      "UPDATE user_preferences SET daily_quota_used = 0, quota_reset_date = ? WHERE user_id = ?"
    ).run(today, user.sub);
    prefs.daily_quota_used = 0;
  }

  const DAILY_QUOTA = 10;
  return c.json({
    used: prefs.daily_quota_used ?? 0,
    total: DAILY_QUOTA,
    remaining: Math.max(0, DAILY_QUOTA - (prefs.daily_quota_used ?? 0)),
    resetAt: "00:00 北京时间",
  });
});

// ─── 获取信息流（推荐排序） ───────────────────────────────────
feed.get("/", (c) => {
  const user = c.get("user");
  const today = new Date().toISOString().split("T")[0];

  // 获取租户行业
  const tenant = db
    .prepare("SELECT industry FROM tenants WHERE id = ?")
    .get(user.tenantId) as any;
  const tenantIndustry = tenant?.industry ?? "";

  // 获取用户偏好
  let prefs = db
    .prepare("SELECT * FROM user_preferences WHERE user_id = ?")
    .get(user.sub) as any;

  if (!prefs) {
    db.prepare(`
      INSERT INTO user_preferences (id, tenant_id, user_id, quota_reset_date)
      VALUES (?, ?, ?, ?)
    `).run(nanoid(), user.tenantId, user.sub, today);
    prefs = db
      .prepare("SELECT * FROM user_preferences WHERE user_id = ?")
      .get(user.sub) as any;
  }

  // 检查是否需要重置配额
  if (prefs.quota_reset_date !== today) {
    db.prepare(
      "UPDATE user_preferences SET daily_quota_used = 0, quota_reset_date = ? WHERE user_id = ?"
    ).run(today, user.sub);
    prefs.daily_quota_used = 0;
  }

  // 获取已收藏的 feed_item_id（排除已收藏）
  const bookmarkedIds = (
    db
      .prepare(
        "SELECT feed_item_id FROM bookmarks WHERE user_id = ? AND feed_item_id IS NOT NULL"
      )
      .all(user.sub) as any[]
  ).map((b) => b.feed_item_id);

  // 获取所有活跃的信息流条目
  let items = db
    .prepare("SELECT * FROM feed_items WHERE status = 'active'")
    .all() as any[];

  // 排除已收藏的
  items = items.filter((item) => !bookmarkedIds.includes(item.id));

  // 计算推荐得分并排序
  const scored = items.map((item) => ({
    ...item,
    ai_tags: JSON.parse(item.ai_tags ?? "[]"),
    recommendation_score: calculateRecommendationScore(
      item,
      tenantIndustry,
      prefs
    ),
  }));
  scored.sort((a, b) => b.recommendation_score - a.recommendation_score);

  const DAILY_QUOTA = 10;
  const quotaUsed = prefs.daily_quota_used ?? 0;
  const remaining = Math.max(0, DAILY_QUOTA - quotaUsed);

  return c.json({
    items: scored.slice(0, Math.max(remaining, 3)), // 至少返回 3 条供预览
    quota: {
      used: quotaUsed,
      total: DAILY_QUOTA,
      remaining,
    },
    total: scored.length,
  });
});

// ─── 管理员上传询盘条目 ──────────────────────────────────────
feed.post("/", async (c) => {
  const user = c.get("user");

  // 检查管理员权限
  const dbUser = db.prepare("SELECT role FROM users WHERE id = ?").get(user.sub) as any;
  if (dbUser?.role !== "admin") {
    return c.json({ error: "需要管理员权限" }, 403);
  }

  const body = await c.req.json();
  const {
    media_type = "text",
    media_url,
    buyer_company,
    buyer_country,
    buyer_name,
    product_name,
    quantity,
    raw_content,
    industry = "other",
    estimated_value = 0,
  } = body;

  if (!buyer_company || !buyer_country || !product_name) {
    return c.json({ error: "买家公司名、国家、产品品名为必填项" }, 400);
  }

  // 自动计算置信度评分
  let confidence_score = 50;
  if (buyer_name) confidence_score += 10;
  if (raw_content && raw_content.length > 50) confidence_score += 15;
  if (quantity) confidence_score += 10;
  if (estimated_value > 0) confidence_score += 10;
  if (industry !== "other") confidence_score += 5;
  confidence_score = Math.min(confidence_score, 100);

  // 生成 AI 摘要（简单规则）
  const ai_summary = `${buyer_country}买家 ${buyer_company}，询问${product_name}${quantity ? `，数量 ${quantity}` : ""}`;

  // 自动生成标签
  const ai_tags: string[] = [];
  if (industry === "furniture") ai_tags.push("家具行业");
  if (industry === "textile") ai_tags.push("纺织行业");
  if (estimated_value > 50000) ai_tags.push("大单");
  if (confidence_score >= 80) ai_tags.push("高意向");

  const id = `feed-${nanoid(8)}`;

  db.prepare(`
    INSERT INTO feed_items (id, media_type, media_url, buyer_company, buyer_country, buyer_name, product_name, quantity, raw_content, industry, estimated_value, confidence_score, ai_summary, ai_tags, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, media_type, media_url ?? null, buyer_company, buyer_country,
    buyer_name ?? null, product_name, quantity ?? null, raw_content ?? null,
    industry, estimated_value, confidence_score, ai_summary,
    JSON.stringify(ai_tags), user.sub
  );

  const item = db.prepare("SELECT * FROM feed_items WHERE id = ?").get(id) as any;
  return c.json({
    ...item,
    ai_tags: JSON.parse(item.ai_tags ?? "[]"),
  }, 201);
});

// ─── 收藏条目，自动创建询盘 ──────────────────────────────────
feed.post("/:id/bookmark", async (c) => {
  const user = c.get("user");
  const feedItemId = c.req.param("id");

  const item = db
    .prepare("SELECT * FROM feed_items WHERE id = ?")
    .get(feedItemId) as any;
  if (!item) {
    return c.json({ error: "信息流条目不存在" }, 404);
  }

  // 检查是否已收藏
  const existing = db
    .prepare(
      "SELECT id FROM bookmarks WHERE user_id = ? AND feed_item_id = ?"
    )
    .get(user.sub, feedItemId);
  if (existing) {
    return c.json({ error: "已收藏过该条目" }, 409);
  }

  // 自动创建询盘
  const inquiryId = `inq-${nanoid(8)}`;
  db.prepare(`
    INSERT INTO inquiries (
      id, tenant_id, source_platform, buyer_name, buyer_company, buyer_country,
      product_name, quantity, raw_content, ai_summary, confidence_score,
      estimated_value, tags, status, urgency, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    inquiryId, user.tenantId, "feed",
    item.buyer_name ?? null, item.buyer_company, item.buyer_country,
    item.product_name, item.quantity ?? null, item.raw_content ?? null,
    item.ai_summary, item.confidence_score, item.estimated_value,
    item.ai_tags, "unread", item.confidence_score >= 80 ? "high" : "normal",
    new Date().toISOString()
  );

  // 创建收藏记录
  const bookmarkId = `bm-${nanoid(8)}`;
  db.prepare(`
    INSERT INTO bookmarks (id, tenant_id, user_id, feed_item_id, inquiry_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(bookmarkId, user.tenantId, user.sub, feedItemId, inquiryId);

  // 更新今日配额
  const today = new Date().toISOString().split("T")[0];
  db.prepare(`
    UPDATE user_preferences
    SET daily_quota_used = daily_quota_used + 1, quota_reset_date = ?
    WHERE user_id = ?
  `).run(today, user.sub);

  return c.json({
    bookmarkId,
    inquiryId,
    message: "已加入我的询盘",
  }, 201);
});

// ─── 获取已收藏列表 ──────────────────────────────────────────
feed.get("/bookmarks", (c) => {
  const user = c.get("user");

  const bookmarks = db.prepare(`
    SELECT b.id as bookmark_id, b.created_at as bookmarked_at,
           f.id as feed_item_id, f.buyer_company, f.buyer_country, f.buyer_name,
           f.product_name, f.quantity, f.confidence_score, f.industry,
           f.ai_summary, f.ai_tags,
           b.inquiry_id
    FROM bookmarks b
    LEFT JOIN feed_items f ON b.feed_item_id = f.id
    WHERE b.user_id = ? AND b.feed_item_id IS NOT NULL
    ORDER BY b.created_at DESC
  `).all(user.sub) as any[];

  return c.json({
    bookmarks: bookmarks.map((b) => ({
      ...b,
      ai_tags: JSON.parse(b.ai_tags ?? "[]"),
    })),
    total: bookmarks.length,
  });
});

export default feed;
