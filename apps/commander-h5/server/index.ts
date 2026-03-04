import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

// ── AI Engine ────────────────────────────────────────────────────
import {
  decomposeAsset,
  analyzeInquiry,
  generateSmartQuote,
  generateMorningBriefing,
} from "./ai-engine.js";
import { extractTextFromFile, truncateText } from "./file-parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── 文件上传目录 ─────────────────────────────────────────────────
const UPLOAD_DIR = path.resolve(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Multer 配置（磁盘存储）──────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safeName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".txt", ".md", ".csv", ".json", ".xlsx", ".xls"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件格式: ${ext}`));
    }
  },
});

// ── WebSocket 客户端管理 ──────────────────────────────────────────
interface WarroomClient {
  ws: WebSocket;
  userId?: string;
  connectedAt: Date;
  lastPing: Date;
}

const clients = new Map<string, WarroomClient>();

function broadcast(type: string, payload: unknown) {
  const msg = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  clients.forEach(({ ws }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

// Heartbeat check — remove stale connections every 35s
setInterval(() => {
  const now = Date.now();
  clients.forEach((client, id) => {
    if (now - client.lastPing.getTime() > 60_000) {
      client.ws.terminate();
      clients.delete(id);
    }
  });
}, 35_000);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── WebSocket Server ──────────────────────────────────────────
  const wss = new WebSocketServer({ server, path: "/ws/warroom" });

  wss.on("connection", (ws, req) => {
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    const client: WarroomClient = {
      ws,
      userId: token ? "authenticated" : undefined,
      connectedAt: new Date(),
      lastPing: new Date(),
    };
    clients.set(clientId, client);

    ws.send(JSON.stringify({
      type: "connected",
      payload: { clientId, serverTime: new Date().toISOString() },
    }));

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        client.lastPing = new Date();
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
        }
      } catch { /* ignore */ }
    });

    ws.on("close", () => { clients.delete(clientId); });
    ws.on("error", () => { clients.delete(clientId); });
  });

  // ── Express middleware ────────────────────────────────────────
  app.use(express.json({ limit: "2mb" }));

  // ══════════════════════════════════════════════════════════════
  // Mock API v1 — 基础数据接口
  // ══════════════════════════════════════════════════════════════

  // Auth: Login
  app.post("/api/v1/auth/login", (req, res) => {
    const { email, password } = req.body ?? {};
    if (email === "admin@minghui.com" && password === "admin123") {
      res.json({
        accessToken: "mock-access-token-v6",
        refreshToken: "mock-refresh-token-v6",
        user: { id: "1", name: "Boss", email, role: "admin", plan: "enterprise" },
      });
    } else {
      res.status(401).json({ error: "邮箱或密码错误" });
    }
  });

  app.get("/api/v1/auth/me", (_req, res) => {
    res.json({ id: "1", name: "Boss", email: "admin@minghui.com", role: "admin", plan: "enterprise" });
  });

  app.post("/api/v1/auth/refresh", (_req, res) => {
    res.json({ accessToken: "mock-access-token-v6-refreshed" });
  });

  // Boss Warroom data
  app.get("/api/v1/boss/warroom", (_req, res) => {
    res.json({
      totalPending: 47,
      completionRate: 68,
      deltaVsYesterday: 12,
      updatedAt: new Date().toISOString(),
      categories: [
        { id: "email", label: "邮件", count: 18 },
        { id: "task", label: "任务", count: 9 },
        { id: "notification", label: "通知", count: 14, hasUrgent: true },
        { id: "other", label: "其他", count: 6 },
      ],
      platforms: [
        { id: "tiktok", unreadCount: 23, trend7d: [8,12,9,15,11,18,23], isConnected: true },
        { id: "meta",   unreadCount: 11, trend7d: [5,7,6,9,8,10,11],   isConnected: true },
      ],
      chatHistory: [
        { id: "ai-1", role: "ai", content: "早上好！今日共有 47 条待处理事项，其中 3 条高优先级询盘需要您关注。AI 已为您准备了 2 条决策建议，请查看顶部卡片。", createdAt: new Date(Date.now() - 60000).toISOString() },
      ],
    });
  });

  // Inquiries list
  app.get("/api/v1/inquiries", (_req, res) => {
    res.json({
      items: [
        { id: "inq-1", source_platform: "tiktok", buyer_name: "Ahmed Al-Rashid", buyer_company: "Gulf Trading Co.", buyer_country: "SA", product_name: "工业管材", quantity: "500件", raw_content: "Hi, I'm interested in your industrial pipes. Can you provide MOQ and SASO certification details?", confidence_score: 87, status: "pending", urgency: "high", tags: ["中东","大宗"], received_at: new Date(Date.now() - 3600000).toISOString() },
        { id: "inq-2", source_platform: "meta",   buyer_name: "Fatima Al-Zahra",  buyer_company: "Dubai Imports LLC",  buyer_country: "AE", product_name: "LED 灯具",  quantity: "200套", raw_content: "We need LED lighting for our new showroom. What's your best price for bulk order?", confidence_score: 72, status: "pending", urgency: "normal", tags: ["UAE","灯具"], received_at: new Date(Date.now() - 7200000).toISOString() },
        { id: "inq-3", source_platform: "alibaba", buyer_name: "Carlos Mendoza", buyer_company: "MexTrade S.A.", buyer_country: "MX", product_name: "太阳能板", quantity: "1000片", raw_content: "Necesito paneles solares de 400W. ¿Cuál es el precio FOB?", confidence_score: 91, status: "pending", urgency: "high", tags: ["拉美","新能源"], received_at: new Date(Date.now() - 1800000).toISOString() },
      ],
      total: 3,
    });
  });

  app.get("/api/v1/tasks", (_req, res) => {
    res.json({
      items: [
        { id: "task-1", title: "跟进 Ahmed 询盘报价", status: "pending", priority: "high", dueAt: new Date(Date.now() + 86400000).toISOString() },
        { id: "task-2", title: "更新 TikTok 产品视频", status: "pending", priority: "normal", dueAt: new Date(Date.now() + 172800000).toISOString() },
      ],
      total: 2,
    });
  });

  app.get("/api/v1/feed/items", (_req, res) => {
    res.json({ items: [], total: 0 });
  });

  app.get("/api/v1/notifications", (_req, res) => {
    res.json({
      items: [
        { id: "n-1", type: "inquiry", title: "新高意向询盘", body: "Ahmed Al-Rashid 发来工业管材询盘", isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
      ],
      unreadCount: 1,
    });
  });

  // ══════════════════════════════════════════════════════════════
  // AI API v1 — 三大 AI 引擎接口
  // ══════════════════════════════════════════════════════════════

  /**
   * POST /api/v1/ai/assets/upload
   * 上传产品资料文件，AI 自动解构生成 ProductNeuron
   */
  app.post("/api/v1/ai/assets/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "请上传文件" });
      return;
    }

    const { path: filePath, originalname, size, mimetype } = req.file;
    const assetId = `asset-${Date.now()}`;

    try {
      console.log(`[AI Asset] 开始解析文件: ${originalname}`);

      // 提取文本内容
      const rawText = await extractTextFromFile(filePath);
      const truncatedText = truncateText(rawText, 5000);

      // 调用 AI 引擎解构
      const neuron = await decomposeAsset(originalname, truncatedText);

      // 广播 WebSocket 通知
      broadcast("asset_analyzed", {
        assetId,
        fileName: originalname,
        neuron,
      });

      res.json({
        success: true,
        assetId,
        fileName: originalname,
        fileSize: size,
        mimeType: mimetype,
        neuron,
        analyzedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[AI Asset] 解析失败:", err);
      res.status(500).json({
        error: "AI 解析失败",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * POST /api/v1/ai/assets/analyze-text
   * 直接提交文本内容进行 AI 解构（无需上传文件）
   */
  app.post("/api/v1/ai/assets/analyze-text", async (req, res) => {
    const { fileName = "产品描述.txt", content } = req.body ?? {};
    if (!content) {
      res.status(400).json({ error: "请提供文本内容" });
      return;
    }

    try {
      const neuron = await decomposeAsset(fileName, truncateText(content, 5000));
      res.json({ success: true, neuron, analyzedAt: new Date().toISOString() });
    } catch (err) {
      console.error("[AI Asset Text] 解析失败:", err);
      res.status(500).json({
        error: "AI 解析失败",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * POST /api/v1/ai/inquiries/:id/analyze
   * 对指定询盘进行 AI 全面分析（意图识别 + 买家画像 + 回复草稿）
   */
  app.post("/api/v1/ai/inquiries/:id/analyze", async (req, res) => {
    const { id } = req.params;
    const {
      rawContent,
      buyerName = "未知买家",
      buyerCompany = "未知公司",
      buyerCountry = "未知",
      productName = "产品",
      sourcePlatform = "未知平台",
    } = req.body ?? {};

    if (!rawContent) {
      res.status(400).json({ error: "请提供询盘原文 (rawContent)" });
      return;
    }

    try {
      console.log(`[AI Inquiry] 开始分析询盘 ${id}: ${buyerName} @ ${buyerCompany}`);
      const result = await analyzeInquiry(
        rawContent,
        buyerName,
        buyerCompany,
        buyerCountry,
        productName,
        sourcePlatform
      );

      // 广播 WebSocket 通知
      broadcast("inquiry_analyzed", { inquiryId: id, result });

      res.json({
        success: true,
        inquiryId: id,
        ...result,
        analyzedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[AI Inquiry] 分析失败:", err);
      res.status(500).json({
        error: "AI 分析失败",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * POST /api/v1/ai/inquiries/:id/smart-quote
   * 为指定询盘生成智能报价建议
   */
  app.post("/api/v1/ai/inquiries/:id/smart-quote", async (req, res) => {
    const { id } = req.params;
    const {
      productName = "产品",
      quantity = "待定",
      buyerCountry = "未知",
      buyerCompany = "未知公司",
      inquiryContent,
      productContext,
    } = req.body ?? {};

    if (!inquiryContent) {
      res.status(400).json({ error: "请提供询盘内容 (inquiryContent)" });
      return;
    }

    try {
      console.log(`[AI Quote] 开始生成报价 ${id}: ${productName} x${quantity}`);
      const result = await generateSmartQuote(
        productName,
        quantity,
        buyerCountry,
        buyerCompany,
        inquiryContent,
        productContext
      );

      res.json({
        success: true,
        inquiryId: id,
        quote: result,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[AI Quote] 生成失败:", err);
      res.status(500).json({
        error: "AI 报价生成失败",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * POST /api/v1/ai/briefing
   * 生成指挥官早晨简报
   */
  app.post("/api/v1/ai/briefing", async (req, res) => {
    const {
      totalPending = 0,
      urgentInquiries = 0,
      platforms = ["TikTok", "Meta"],
      topProducts = ["工业管材", "LED灯具"],
    } = req.body ?? {};

    try {
      console.log("[AI Briefing] 生成早晨简报...");
      const briefing = await generateMorningBriefing({
        totalPending,
        urgentInquiries,
        platforms,
        topProducts,
      });

      res.json({
        success: true,
        briefing,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[AI Briefing] 生成失败:", err);
      res.status(500).json({
        error: "简报生成失败",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * GET /api/v1/ai/status
   * 检查 AI 引擎状态
   */
  app.get("/api/v1/ai/status", (_req, res) => {
    res.json({
      status: "online",
      model: "gpt-4.1-mini",
      features: ["asset_decomposition", "inquiry_analysis", "smart_quote", "morning_briefing"],
      version: "6.0.0",
    });
  });

  // ══════════════════════════════════════════════════════════════
  // Internal WebSocket push endpoint
  // ══════════════════════════════════════════════════════════════
  app.post("/internal/ws/warroom-update", (req, res) => {
    const { type = "warroom_update", payload } = req.body;
    broadcast(type, payload);
    res.json({ ok: true, clients: clients.size });
  });

  // ── Static files ─────────────────────────────────────────────
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`✅ Commander V6.0 Server running on http://localhost:${port}/`);
    console.log(`🤖 AI Engine: gpt-4.1-mini | Features: asset/inquiry/quote/briefing`);
    console.log(`📡 WebSocket: ws://localhost:${port}/ws/warroom`);
  });
}

startServer().catch(console.error);
