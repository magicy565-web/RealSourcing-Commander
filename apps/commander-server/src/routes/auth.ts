/**
 * Commander 5.0 — 认证路由
 * POST /api/v1/auth/login
 * POST /api/v1/auth/refresh
 * GET  /api/v1/auth/me
 */
import { Hono } from "hono";
import bcrypt from "bcryptjs";
import db from "../db/index.js";
import { signAccessToken, signRefreshToken, verifyToken, authMiddleware } from "../middleware/auth.js";

const auth = new Hono();

// ─── 登录 ─────────────────────────────────────────────────────
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: "请输入邮箱和密码" }, 400);
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  if (!user) {
    return c.json({ error: "用户不存在" }, 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "密码错误" }, 401);
  }

  const tenant = db.prepare("SELECT * FROM tenants WHERE id = ?").get(user.tenant_id) as any;

  const tokenPayload = {
    sub: user.id,
    userId: user.id,
    tenantId: user.tenant_id,
    name: user.name,
    role: user.role || 'user',
  };

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(tokenPayload),
    signRefreshToken(tokenPayload),
  ]);

  return c.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      tenantId: user.tenant_id,
      tenantName: tenant?.name,
      planType: tenant?.plan_type,
      creditsBalance: tenant?.credits_balance ?? 0,
    },
  });
});

// ─── 刷新 Token ───────────────────────────────────────────────
auth.post("/refresh", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) {
    return c.json({ error: "缺少 refreshToken" }, 400);
  }
  try {
    const payload = await verifyToken(refreshToken);
    const accessToken = await signAccessToken({
      sub: payload.sub,
      tenantId: payload.tenantId,
      name: payload.name,
    });
    return c.json({ accessToken });
  } catch {
    return c.json({ error: "refreshToken 已过期，请重新登录" }, 401);
  }
});

// ─── 获取当前用户信息 ──────────────────────────────────────────
auth.get("/me", authMiddleware, (c) => {
  const user = c.get("user");
  const dbUser = db.prepare("SELECT * FROM users WHERE id = ?").get(user.sub) as any;
  const tenant = db.prepare("SELECT * FROM tenants WHERE id = ?").get(user.tenantId) as any;

  return c.json({
    id: dbUser.id,
    name: dbUser.name,
    phone: dbUser.phone,
    email: dbUser.email,
    tenantId: dbUser.tenant_id,
    tenantName: tenant?.name,
    planType: tenant?.plan_type,
    creditsBalance: tenant?.credits_balance ?? 0,
    pushHour: dbUser.push_hour,
    pushHourEve: dbUser.push_hour_eve,
  });
});

export default auth;
