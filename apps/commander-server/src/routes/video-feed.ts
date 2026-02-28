/**
 * 视频信息流路由 (Phase 3 - 火山引擎 VOD)
 * GET  /video-feed                获取视频信息流（行业过滤 + 分页）
 * GET  /video-feed/:id/play       获取单个视频播放信息
 * POST /video-feed/:id/like       点赞
 * POST /video-feed/:id/bookmark   收藏（收藏后才能报价）
 * GET  /video-feed/upload/token   获取上传凭证（管理员）
 * POST /video-feed/upload/commit  提交上传完成（管理员）
 */
import { Hono } from 'hono';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import vodService from '../lib/volcengine-vod.js';

const router = new Hono();

const VOLC_SPACE_NAME = process.env.VOLC_SPACE_NAME || 'realsourcing-commander';

// ─── 获取上传凭证（管理员）- 注意：必须在 /:id 路由之前注册 ──────────────────
router.get('/upload/token', authMiddleware, async (c) => {
  const user = c.get('user') as any;
  if (user.role !== 'admin') {
    return c.json({ error: '需要管理员权限' }, 403);
  }

  try {
    const tokenData = await vodService.getUploadAuthToken(VOLC_SPACE_NAME);
    // 解析火山引擎响应结构： Result.Data.UploadAddress
    const uploadAddress = tokenData?.Result?.Data?.UploadAddress || {};
    const storeInfos = uploadAddress.StoreInfos || [];
    const uploadHosts = uploadAddress.UploadHosts || [];
    const sessionKey = uploadAddress.SessionKey || '';
    
    const uploadHost = uploadHosts[0] || 'tob-upload-y.volcvod.com';
    const storeUri = storeInfos[0]?.StoreUri || '';
    return c.json({ 
      success: true, 
      data: {
        sessionKey,
        uploadHost,
        storeUri,
        uploadUrl: `https://${uploadHost}`,
        auth: storeInfos[0]?.Auth || '',
        spaceName: VOLC_SPACE_NAME,
      }
    });
  } catch (err: any) {
    console.error('VOD getUploadAuthToken error:', err?.response?.data || err.message);
    return c.json({ 
      error: '获取上传凭证失败',
      detail: err?.response?.data || err.message,
    }, 500);
  }
});

// ─── 提交上传完成（管理员）────────────────────────────────────────────────────
router.post('/upload/commit', authMiddleware, async (c) => {
  const user = c.get('user') as any;
  if (user.role !== 'admin') {
    return c.json({ error: '需要管理员权限' }, 403);
  }

  const body = await c.req.json();
  const { vid, title, description, industry, tags, company_name } = body;

  if (!vid) {
    return c.json({ error: '缺少 vid 参数' }, 400);
  }

  try {
    // 获取视频信息（封面图、时长等）
    let coverUrl = '';
    let duration = 0;
    try {
      const mediaInfo = await vodService.getMediaInfo(vid, VOLC_SPACE_NAME);
      const basicInfo = mediaInfo?.Result?.MediaBasicInfo;
      coverUrl = basicInfo?.CoverUrl || '';
      duration = basicInfo?.Duration || 0;
    } catch (e) {
      console.warn('获取媒资信息失败，继续保存:', e);
    }

    // 保存到 feed_items 表
    const itemId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    db.prepare(`
      INSERT INTO feed_items (
        id, title, description, company_name, industry, tags,
        media_type, media_url, cover_url, duration,
        buyer_company, buyer_country, product_name,
        status, confidence_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'video', ?, ?, ?, '', '', ?, 'pending', 80, ?)
    `).run(
      itemId,
      title || '未命名视频',
      description || '',
      company_name || '',
      industry || '',
      JSON.stringify(tags || []),
      `vid:${vid}`,
      coverUrl,
      duration,
      title || '未命名视频',
      new Date().toISOString()
    );

    return c.json({ 
      success: true, 
      item_id: itemId,
      vid,
      cover_url: coverUrl,
      message: '视频已提交，等待审核后发布' 
    });
  } catch (err: any) {
    console.error('commit upload error:', err);
    return c.json({ error: '提交失败', detail: err.message }, 500);
  }
});

// ─── 获取视频信息流 ────────────────────────────────────────────────────────────
router.get('/', authMiddleware, (c) => {
  const user = c.get('user') as any;
  const uid = user.userId || user.sub;
  const { page = '1', limit = '10', industry } = c.req.query();
  const pageNum = parseInt(page);
  const pageSize = Math.min(parseInt(limit), 20);
  const offset = (pageNum - 1) * pageSize;

  // 获取用户行业偏好（默认只看自己行业）
  let userIndustry = industry;
  if (!userIndustry) {
    const pref = db.prepare(`
      SELECT preferred_industries FROM user_preferences WHERE user_id = ?
    `).get(uid) as any;
    if (pref?.preferred_industries) {
      try {
        const industries = JSON.parse(pref.preferred_industries);
        userIndustry = industries[0];
      } catch {}
    }
  }

  // 查询视频类型的 feed_items
  let query = `
    SELECT 
      fi.*,
      CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END as is_bookmarked,
      COALESCE(fi.likes_count, 0) as likes_count,
      COALESCE(fi.views_count, 0) as views_count
    FROM feed_items fi
    LEFT JOIN bookmarks b ON b.feed_item_id = fi.id AND b.user_id = ?
    WHERE fi.media_type = 'video' AND fi.status = 'published'
  `;
  const params: any[] = [uid];

  if (userIndustry) {
    query += ` AND (fi.industry = ? OR fi.industry IS NULL OR fi.industry = '')`;
    params.push(userIndustry);
  }

  query += ` ORDER BY fi.created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  const items = db.prepare(query).all(...params) as any[];

  // 解析 tags
  const result = items.map(item => ({
    ...item,
    tags: item.tags ? (() => { try { return JSON.parse(item.tags); } catch { return []; } })() : [],
    is_bookmarked: item.is_bookmarked === 1,
    vid: item.media_url?.startsWith('vid:') ? item.media_url.slice(4) : item.media_url,
  }));

  // 总数
  let countQuery = `SELECT COUNT(*) as total FROM feed_items WHERE media_type = 'video' AND status = 'published'`;
  const countParams: any[] = [];
  if (userIndustry) {
    countQuery += ` AND (industry = ? OR industry IS NULL OR industry = '')`;
    countParams.push(userIndustry);
  }
  const { total } = db.prepare(countQuery).get(...countParams) as any;

  return c.json({
    items: result,
    pagination: { page: pageNum, limit: pageSize, total, pages: Math.ceil(total / pageSize) },
    user_industry: userIndustry || null,
  });
});

// ─── 获取单个视频播放信息（从火山引擎 VOD 获取真实播放地址）─────────────────
router.get('/:id/play', authMiddleware, async (c) => {
  const { id } = c.req.param();

  const item = db.prepare(`
    SELECT * FROM feed_items WHERE id = ? AND media_type = 'video' AND status = 'published'
  `).get(id) as any;

  if (!item) {
    return c.json({ error: '视频不存在' }, 404);
  }

  // 增加播放次数
  db.prepare(`UPDATE feed_items SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ?`).run(id);

  // 从 media_url 提取 vid
  const vid = item.media_url?.startsWith('vid:') ? item.media_url.slice(4) : item.media_url;

  if (!vid || vid === 'null' || vid === '') {
    return c.json({ error: '该视频暂无播放地址', item }, 404);
  }

  try {
    const playInfo = await vodService.getPlayInfo(vid, VOLC_SPACE_NAME);
    return c.json({ item, vid, play_info: playInfo });
  } catch (err: any) {
    console.error('VOD getPlayInfo error:', err?.response?.data || err.message);
    return c.json({ 
      error: '获取播放信息失败', 
      detail: err?.response?.data || err.message,
      item,
      vid,
    }, 500);
  }
});

// ─── 点赞 ──────────────────────────────────────────────────────────────────
router.post('/:id/like', authMiddleware, (c) => {
  const { id } = c.req.param();
  
  const item = db.prepare(`SELECT id, likes_count FROM feed_items WHERE id = ?`).get(id) as any;
  if (!item) return c.json({ error: '不存在' }, 404);

  db.prepare(`UPDATE feed_items SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = ?`).run(id);
  
  return c.json({ success: true, likes_count: (item.likes_count || 0) + 1 });
});

// ─── 收藏（收藏后才能报价）────────────────────────────────────────────────────
router.post('/:id/bookmark', authMiddleware, (c) => {
  const user = c.get('user') as any;
  const uid = user.userId || user.sub;
  const { id } = c.req.param();

  const item = db.prepare(`SELECT id FROM feed_items WHERE id = ?`).get(id) as any;
  if (!item) return c.json({ error: '不存在' }, 404);

  const existing = db.prepare(`
    SELECT id FROM bookmarks WHERE user_id = ? AND feed_item_id = ?
  `).get(uid, id) as any;

  if (existing) {
    db.prepare(`DELETE FROM bookmarks WHERE user_id = ? AND feed_item_id = ?`).run(uid, id);
    return c.json({ success: true, is_bookmarked: false, message: '已取消收藏' });
  } else {
    db.prepare(`
      INSERT INTO bookmarks (id, user_id, feed_item_id, created_at) VALUES (?, ?, ?, ?)
    `).run(
      Math.random().toString(36).slice(2),
      uid,
      id,
      new Date().toISOString()
    );
    return c.json({ success: true, is_bookmarked: true, message: '已收藏，现在可以发起报价' });
  }
});

export default router;
