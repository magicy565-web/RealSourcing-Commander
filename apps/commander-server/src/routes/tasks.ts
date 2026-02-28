/**
 * Commander 5.0 — OpenClaw 任务队列路由
 * POST /api/v1/tasks           创建新任务（人工触发）
 * GET  /api/v1/tasks           获取任务列表
 * GET  /api/v1/tasks/:id       获取任务详情
 * POST /api/v1/tasks/:id/cancel 取消任务
 */
import { Hono } from "hono";
import { db } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { planAgentTask } from "../services/ai.js";
import { pushTaskNotification, sendFeishuCard } from "../services/feishu.js";

const tasks = new Hono();
tasks.use("*", authMiddleware);

// ─── 确保 task_queue 表存在 ───────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS task_queue (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    task_type       TEXT NOT NULL,
    platform        TEXT NOT NULL,
    target_info     TEXT NOT NULL,
    context         TEXT DEFAULT '{}',
    steps           TEXT DEFAULT '[]',
    current_step    INTEGER DEFAULT 0,
    total_steps     INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'pending',
    progress        INTEGER DEFAULT 0,
    result          TEXT,
    error_msg       TEXT,
    estimated_ops   INTEGER DEFAULT 0,
    estimated_credits INTEGER DEFAULT 0,
    actual_credits  INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    started_at      TEXT,
    completed_at    TEXT,
    updated_at      TEXT DEFAULT (datetime('now'))
  );
`);

// 任务类型配置
const TASK_TYPES: Record<string, { label: string; platform: string; creditCost: number }> = {
  linkedin_connect: { label: "LinkedIn 发起连接", platform: "linkedin", creditCost: 3 },
  linkedin_message: { label: "LinkedIn 发送消息", platform: "linkedin", creditCost: 5 },
  whatsapp_followup: { label: "WhatsApp 跟进", platform: "whatsapp", creditCost: 4 },
  tiktok_reply: { label: "TikTok 评论回复", platform: "tiktok", creditCost: 2 },
  facebook_message: { label: "Facebook 私信", platform: "facebook", creditCost: 4 },
  geo_publish: { label: "GEO 内容发布", platform: "geo", creditCost: 10 },
  alibaba_rfq_reply: { label: "阿里 RFQ 回复", platform: "alibaba", creditCost: 5 },
  inquiry_auto_reply: { label: "询盘自动回复", platform: "email", creditCost: 3 },
};

// 各任务类型的默认步骤（不依赖 AI，立即可用）
function getDefaultSteps(taskType: string, platform: string, targetInfo: string): string[] {
  const steps: Record<string, string[]> = {
    linkedin_connect: [
      `登录 LinkedIn 账号`,
      `搜索目标买家：${targetInfo.slice(0, 30)}`,
      `查看买家主页，确认匹配度`,
      `发送个性化连接请求`,
      `记录跟进状态`,
    ],
    linkedin_message: [
      `登录 LinkedIn 账号`,
      `定位已连接的买家：${targetInfo.slice(0, 30)}`,
      `分析买家背景，撰写开发信`,
      `发送消息`,
      `记录回复状态`,
    ],
    whatsapp_followup: [
      `登录 WhatsApp Business`,
      `查找联系人：${targetInfo.slice(0, 30)}`,
      `生成个性化跟进消息`,
      `发送消息`,
      `记录对话状态`,
    ],
    tiktok_reply: [
      `登录 TikTok 账号`,
      `搜索相关产品视频`,
      `找到目标评论：${targetInfo.slice(0, 30)}`,
      `发布专业回复`,
    ],
    alibaba_rfq_reply: [
      `登录阿里巴巴账号`,
      `进入 RFQ 中心`,
      `筛选目标询盘：${targetInfo.slice(0, 30)}`,
      `生成报价回复`,
      `提交报价`,
    ],
    geo_publish: [
      `准备产品内容`,
      `生成 GEO 优化文案：${targetInfo.slice(0, 30)}`,
      `上传产品图片`,
      `发布到目标平台`,
      `监控收录状态`,
    ],
  };
  return steps[taskType] ?? [`登录 ${platform} 账号`, `定位目标：${targetInfo.slice(0, 30)}`, `执行操作`, `记录结果`];
}

// GET /api/v1/tasks — 任务列表
tasks.get("/", (c) => {
  const { tenantId } = c.get("user") as any;
  const status = c.req.query("status");
  const limit = parseInt(c.req.query("limit") ?? "20");

  let sql = "SELECT * FROM task_queue WHERE tenant_id=?";
  const params: any[] = [tenantId];
  if (status) { sql += " AND status=?"; params.push(status); }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  const items = db.prepare(sql).all(...params) as any[];
  const parsed = items.map((t) => ({
    ...t,
    steps: JSON.parse(t.steps ?? "[]"),
    context: JSON.parse(t.context ?? "{}"),
  }));

  // 统计
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status='running' THEN 1 ELSE 0 END) as running,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
    FROM task_queue WHERE tenant_id=?
  `).get(tenantId) as any;

  return c.json({ items: parsed, stats });
});

// GET /api/v1/tasks/types — 获取任务类型列表
tasks.get("/types", (c) => {
  return c.json({ types: TASK_TYPES });
});

// POST /api/v1/tasks — 创建新任务（立即返回，AI 规划在后台异步进行）
tasks.post("/", async (c) => {
  const { tenantId, sub: userId } = c.get("user") as any;
  const body = await c.req.json() as {
    taskType: string;
    platform?: string;
    targetInfo: string;
    context?: Record<string, any>;
  };

  if (!body.taskType || !body.targetInfo) {
    return c.json({ error: "taskType 和 targetInfo 为必填项" }, 400);
  }

  const taskConfig = TASK_TYPES[body.taskType];
  if (!taskConfig) {
    return c.json({ error: `未知任务类型: ${body.taskType}` }, 400);
  }

  // 检查积分
  const tenant = db.prepare("SELECT credits_balance FROM tenants WHERE id=?").get(tenantId) as any;
  if (!tenant || tenant.credits_balance < taskConfig.creditCost) {
    return c.json({ error: "积分不足，无法创建任务" }, 402);
  }

  // 立即使用默认步骤（不等待 AI）
  const platform = body.platform ?? taskConfig.platform;
  const steps = getDefaultSteps(body.taskType, platform, body.targetInfo);
  const estimatedOps = steps.length + 1;
  const estimatedCredits = taskConfig.creditCost;

  const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO task_queue (
      id, tenant_id, user_id, task_type, platform, target_info, context,
      steps, total_steps, status, estimated_ops, estimated_credits, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
  `).run(
    taskId, tenantId, userId,
    body.taskType, platform,
    body.targetInfo, JSON.stringify(body.context ?? {}),
    JSON.stringify(steps), steps.length,
    estimatedOps, estimatedCredits, now, now
  );

  // 后台异步用 AI 优化步骤（不阻塞响应）
  planAgentTask({
    taskType: taskConfig.label,
    platform,
    targetInfo: body.targetInfo,
    context: body.context ? JSON.stringify(body.context) : undefined,
  }).then((plan) => {
    if (plan?.steps?.length > 0) {
      db.prepare(
        "UPDATE task_queue SET steps=?, total_steps=?, estimated_ops=?, estimated_credits=?, updated_at=? WHERE id=? AND status='pending'"
      ).run(
        JSON.stringify(plan.steps), plan.steps.length,
        plan.estimatedOps,
        Math.max(taskConfig.creditCost, plan.estimatedCredits),
        new Date().toISOString(), taskId
      );
    }
  }).catch(() => { /* AI 规划失败，保持默认步骤 */ });

  // 异步模拟执行（不阻塞响应）
  simulateTaskExecution(taskId, tenantId, steps, estimatedCredits);

  return c.json({
    success: true,
    taskId,
    task: {
      id: taskId,
      taskType: body.taskType,
      platform,
      targetInfo: body.targetInfo,
      steps,
      status: "pending",
      estimatedOps,
      estimatedCredits,
      createdAt: now,
    },
  });
});

// GET /api/v1/tasks/:id — 任务详情
tasks.get("/:id", (c) => {
  const { tenantId } = c.get("user") as any;
  const { id } = c.req.param();
  const task = db.prepare("SELECT * FROM task_queue WHERE id=? AND tenant_id=?").get(id, tenantId) as any;
  if (!task) return c.json({ error: "任务不存在" }, 404);
  return c.json({
    ...task,
    steps: JSON.parse(task.steps ?? "[]"),
    context: JSON.parse(task.context ?? "{}"),
  });
});

// POST /api/v1/tasks/:id/cancel — 取消任务
tasks.post("/:id/cancel", (c) => {
  const { tenantId } = c.get("user") as any;
  const { id } = c.req.param();
  const task = db.prepare("SELECT * FROM task_queue WHERE id=? AND tenant_id=?").get(id, tenantId) as any;
  if (!task) return c.json({ error: "任务不存在" }, 404);
  if (!["pending", "running"].includes(task.status)) {
    return c.json({ error: "只能取消待执行或执行中的任务" }, 400);
  }
  db.prepare("UPDATE task_queue SET status='cancelled', updated_at=? WHERE id=?")
    .run(new Date().toISOString(), id);
  return c.json({ success: true });
});

// ─── 模拟任务执行（异步，逐步推进进度）──────────────────────────
function simulateTaskExecution(taskId: string, tenantId: string, steps: string[], credits: number) {
  const totalSteps = steps.length;
  let currentStep = 0;

  // 1秒后开始执行
  setTimeout(() => {
    const task = db.prepare("SELECT status FROM task_queue WHERE id=?").get(taskId) as any;
    if (!task || task.status === "cancelled") return;

    db.prepare("UPDATE task_queue SET status='running', started_at=?, updated_at=? WHERE id=?")
      .run(new Date().toISOString(), new Date().toISOString(), taskId);

    // 逐步推进
    const stepInterval = setInterval(() => {
      const current = db.prepare("SELECT status FROM task_queue WHERE id=?").get(taskId) as any;
      if (!current || current.status === "cancelled") {
        clearInterval(stepInterval);
        return;
      }

      currentStep++;
      const progress = Math.round((currentStep / totalSteps) * 100);

      // 子任务完成发送通知
      const taskRow = db.prepare("SELECT * FROM task_queue WHERE id=?").get(taskId) as any;
      if (taskRow) {
        pushTaskNotification({
          id: taskId,
          task_type: `${TASK_TYPES[taskRow.task_type]?.label || taskRow.task_type} (步骤 ${currentStep}/${totalSteps})`,
          status: "completed",
          target_info: taskRow.target_info,
          credits_used: 0, // 子步骤不重复计费
        }).catch(() => {});
      }

      if (currentStep >= totalSteps) {
        clearInterval(stepInterval);

        // 随机成功/失败（90% 成功率）
        const success = Math.random() > 0.1;
        const now = new Date().toISOString();

        if (success) {
          // 扣除积分
          const tenantRow = db.prepare("SELECT credits_balance FROM tenants WHERE id=?").get(tenantId) as any;
          if (tenantRow) {
            const newBalance = Math.max(0, tenantRow.credits_balance - credits);
            db.prepare("UPDATE tenants SET credits_balance=? WHERE id=?").run(newBalance, tenantId);
            db.prepare(`
              INSERT INTO credit_ledger (id, tenant_id, type, amount, balance_after, description, task_id, created_at)
              VALUES (?, ?, 'task_execution', ?, ?, ?, ?, ?)
            `).run(
              `cl-${Date.now()}`, tenantId, -credits, newBalance,
              `OpenClaw 任务执行：${taskId}`, taskId, now
            );

            // 积分预警：低于 50 分推送通知
            if (newBalance < 50) {
              const webhookUrl = process.env.FEISHU_WEBHOOK_URL;
              if (webhookUrl) {
                sendFeishuCard(webhookUrl, {
                  msg_type: "interactive",
                  card: {
                    header: {
                      title: { content: "⚠️ 积分余额不足预警", tag: "plain_text" },
                      template: "orange",
                    },
                    elements: [
                      {
                        tag: "div",
                        text: {
                          content: `您的账户积分余额已低于 **50** 分（当前余额：**${newBalance}**）。\n为了不影响自动化任务的正常运行，请及时充值。`,
                          tag: "lark_md",
                        },
                      },
                    ],
                  },
                }).catch(() => {});
              }
            }
          }

          db.prepare(`
            UPDATE task_queue SET
              status='completed', progress=100, current_step=?,
              actual_credits=?, result=?, completed_at=?, updated_at=?
            WHERE id=?
          `).run(
            totalSteps, credits,
            JSON.stringify({ message: "任务执行成功", completedAt: now }),
            now, now, taskId
          );

          // 任务完毕发送通知
          const finalTask = db.prepare("SELECT * FROM task_queue WHERE id=?").get(taskId) as any;
          pushTaskNotification({
            id: taskId,
            task_type: `${TASK_TYPES[finalTask.task_type]?.label || finalTask.task_type} (已全部完成)`,
            status: "completed",
            target_info: finalTask.target_info,
            credits_used: credits,
          }).catch(() => {});
        } else {
          db.prepare(`
            UPDATE task_queue SET
              status='failed', progress=?, current_step=?,
              error_msg=?, completed_at=?, updated_at=?
            WHERE id=?
          `).run(
            progress, currentStep,
            "账号触发风控，任务已暂停。建议稍后重试。",
            now, now, taskId
          );

          // 任务失败发送通知
          const failedTask = db.prepare("SELECT * FROM task_queue WHERE id=?").get(taskId) as any;
          pushTaskNotification({
            id: taskId,
            task_type: TASK_TYPES[failedTask.task_type]?.label || failedTask.task_type,
            status: "failed",
            target_info: failedTask.target_info,
            credits_used: 0,
          }).catch(() => {});
        }
      } else {
        db.prepare(`
          UPDATE task_queue SET progress=?, current_step=?, updated_at=? WHERE id=?
        `).run(progress, currentStep, new Date().toISOString(), taskId);
      }
    }, 2000 + Math.random() * 1000); // 每步 2-3 秒
  }, 1000);
}

// ─── Phase 3: 设置任务工作时间段 ─────────────────────────────────
tasks.patch("/:id/schedule", async (c) => {
  const user = c.get("user");
  const taskId = c.req.param("id");
  const body = await c.req.json();
  const { timezone, work_start, work_end, work_days } = body;

  const task = db.prepare(
    "SELECT * FROM task_queue WHERE id = ? AND tenant_id = ?"
  ).get(taskId, user.tenantId) as any;

  if (!task) {
    return c.json({ error: "任务不存在" }, 404);
  }

  // 将工作时间段信息存入 context
  const context = JSON.parse(task.context ?? "{}");
  context.schedule = {
    timezone: timezone ?? "Asia/Shanghai",
    work_start: work_start ?? "09:00",
    work_end: work_end ?? "18:00",
    work_days: work_days ?? [1, 2, 3, 4, 5], // 周一到周五
  };

  // 检查当前是否在工作时间内
  const now = new Date();
  const localHour = new Intl.DateTimeFormat("en-US", {
    timeZone: context.schedule.timezone,
    hour: "numeric",
    hour12: false,
  }).format(now);
  const localDay = new Intl.DateTimeFormat("en-US", {
    timeZone: context.schedule.timezone,
    weekday: "short",
  }).format(now);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const currentDay = dayMap[localDay] ?? 0;
  const currentHour = parseInt(localHour);
  const [startH] = (context.schedule.work_start ?? "09:00").split(":").map(Number);
  const [endH] = (context.schedule.work_end ?? "18:00").split(":").map(Number);

  const isWorkTime =
    context.schedule.work_days.includes(currentDay) &&
    currentHour >= startH &&
    currentHour < endH;

  const newStatus = isWorkTime ? task.status : "sleeping";

  db.prepare(
    "UPDATE task_queue SET context = ?, status = ?, updated_at = ? WHERE id = ?"
  ).run(JSON.stringify(context), newStatus, new Date().toISOString(), taskId);

  return c.json({
    id: taskId,
    schedule: context.schedule,
    status: newStatus,
    message: isWorkTime ? "已设置工作时间段，任务将按时执行" : `已设置工作时间段，当前为非工作时间，任务已进入 sleeping 状态`,
  });
});

export default tasks;
