/**
 * Commander 5.0 — JWT 认证中间件
 */
import { createMiddleware } from "hono/factory";
import { SignJWT, jwtVerify } from "jose";
import type { Context } from "hono";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "commander-secret-key-change-in-production"
);
const ACCESS_TOKEN_TTL = "1h";
const REFRESH_TOKEN_TTL = "30d";

export interface JWTPayload {
  sub: string;       // user id
  tenantId: string;
  name: string;
  iat?: number;
  exp?: number;
}

export async function signAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(JWT_SECRET);
}

export async function signRefreshToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as unknown as JWTPayload;
}

// Hono 中间件：验证 Bearer Token，注入 user 到 context
export const authMiddleware = createMiddleware<{
  Variables: { user: JWTPayload };
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "未授权，请先登录" }, 401);
  }
  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token);
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Token 已过期或无效，请重新登录" }, 401);
  }
});
