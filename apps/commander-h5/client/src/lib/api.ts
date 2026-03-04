/**
 * Commander 5.0 — 前端 API 客户端
 * 封装所有与后端的通信，统一处理 token 刷新和错误
 */

const API_BASE = "/api/v1";

// ─── Token 管理 ───────────────────────────────────────────────
let accessToken: string | null = localStorage.getItem("commander_access_token");
let refreshToken: string | null = localStorage.getItem("commander_refresh_token");

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem("commander_access_token", access);
  localStorage.setItem("commander_refresh_token", refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("commander_access_token");
  localStorage.removeItem("commander_refresh_token");
  localStorage.removeItem("commander_user");
}

export function getAccessToken() {
  return accessToken;
}

export function isLoggedIn() {
  return !!accessToken;
}

// ─── 基础请求函数 ─────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Token 过期，尝试刷新
  if (response.status === 401 && refreshToken) {
    try {
      const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshResponse.ok) {
        const { accessToken: newToken } = await refreshResponse.json();
        accessToken = newToken;
        localStorage.setItem("commander_access_token", newToken);
        // 重试原请求
        headers["Authorization"] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
        });
        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({ error: "请求失败" }));
          throw new Error(error.error ?? "请求失败");
        }
        return retryResponse.json();
      }
    } catch {
      // 刷新失败，清除 token
    }
    clearTokens();
    window.location.href = "/";
    throw new Error("登录已过期，请重新登录");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "请求失败" }));
    throw new Error(error.error ?? `请求失败 (${response.status})`);
  }

  return response.json();
}

// ─── Auth API ─────────────────────────────────────────────────
export const authApi = {
  async login(email: string, password: string) {
    const data = await request<{
      accessToken: string;
      refreshToken: string;
      user: UserInfo;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.accessToken, data.refreshToken);
    localStorage.setItem("commander_user", JSON.stringify(data.user));
    return data;
  },

  async me() {
    return request<UserInfo>("/auth/me");
  },

  logout() {
    clearTokens();
  },

  getCachedUser(): UserInfo | null {
    const raw = localStorage.getItem("commander_user");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
};

// ─── Inquiries API ────────────────────────────────────────────
export const inquiriesApi = {
  async list(params?: {
    status?: string;
    platform?: string;
    urgency?: string;
    page?: number;
    limit?: number;
  }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.platform) qs.set("platform", params.platform);
    if (params?.urgency) qs.set("urgency", params.urgency);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<{ items: Inquiry[]; total: number; page: number; limit: number }>(
      `/inquiries?${qs.toString()}`
    );
  },

  async stats() {
    return request<InquiryStats>("/inquiries/stats");
  },

  async get(id: string) {
    return request<InquiryDetail>(`/inquiries/${id}`);
  },

  async updateStatus(id: string, status: string) {
    return request<{ success: boolean; status: string }>(
      `/inquiries/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    );
  },

  async quote(id: string, data: QuoteData) {
    return request<{ success: boolean; quotationId: string }>(
      `/inquiries/${id}/quote`,
      { method: "POST", body: JSON.stringify(data) }
    );
  },

  async reply(id: string, data: ReplyData) {
    return request<{ success: boolean; replyId: string; contentEn: string; creditsUsed: number }>(
      `/inquiries/${id}/reply`,
      { method: "POST", body: JSON.stringify(data) }
    );
  },

  async transfer(id: string, assignedTo?: string, note?: string) {
    return request<{ success: boolean }>(
      `/inquiries/${id}/transfer`,
      { method: "POST", body: JSON.stringify({ assignedTo, note }) }
    );
  },

  async create(data: Partial<Inquiry>) {
    return request<{ success: boolean; id: string; aiAnalyzed?: boolean }>(
      "/inquiries",
      { method: "POST", body: JSON.stringify(data) }
    );
  },

  async smartQuote(id: string) {
    return request<{
      success: boolean;
      creditsUsed: number;
      suggestion: {
        conservative: { price: number; label: string; desc: string; conversionRate: string };
        balanced:     { price: number; label: string; desc: string; conversionRate: string };
        aggressive:   { price: number; label: string; desc: string; conversionRate: string };
        marketInsight: string;
        riskNote: string;
        suggestedUnit: string;
        suggestedPriceTerm: string;
      };
    }>(`/inquiries/${id}/smart-quote`, { method: "POST", body: JSON.stringify({}) });
  },

  async regenerateDraft(id: string, opts?: { priceHint?: string }) {
    const res = await request<{
      success: boolean;
      creditsUsed: number;
      styleUsed: boolean;
      draft: {
        summary: string;
        draftCn: string;
        draftEn: string;
        analysis: string;
        confidenceScore: number;
        urgency: string;
        tags: string[];
        estimatedValue: number;
      };
    }>(`/inquiries/${id}/ai-draft`, {
      method: "POST",
      body: JSON.stringify({ priceHint: opts?.priceHint }),
    });
    // Flatten for convenience
    return { ...res, draftCn: res.draft.draftCn, draftEn: res.draft.draftEn };
  },
};

// ─── OpenClaw API ─────────────────────────────────────────────
export const openclawApi = {
  async status() {
    return request<OpenClawStatus>("/openclaw/status");
  },

  async logs(params?: { platform?: string; status?: string; page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.platform) qs.set("platform", params.platform);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<{ items: AgentLog[] }>(`/openclaw/logs?${qs.toString()}`);
  },

  async simulateLead() {
    return request<{ success: boolean; message: string; inquiryId: string; platform: string }>(
      "/openclaw/simulate-lead",
      { method: "POST" }
    );
  },
  async pause() {
    return request<{ success: boolean }>("/openclaw/pause", { method: "POST" });
  },
  async resume() {
    return request<{ success: boolean }>("/openclaw/resume", { method: "POST" });
  },
  async selfHealStatus() {
    return request<{ consecutiveFailures: number; isSleeping: boolean; sleepUntil: string | null; sleepCount: number }>("/openclaw/self-heal-status");
  },
};

// ─── Training API ────────────────────────────────────────────
export const trainingApi = {
  async getSamples() {
    return request<{ items: TrainingSample[]; total: number }>("/training/samples");
  },

  async addSamples(samples: Array<{ content: string; label?: string }>) {
    return request<{ success: boolean; inserted: number; ids: string[] }>(
      "/training/samples",
      { method: "POST", body: JSON.stringify({ samples }) }
    );
  },

  async deleteSample(id: string) {
    return request<{ success: boolean }>(`/training/samples/${id}`, { method: "DELETE" });
  },

  async extractProfile() {
    return request<{ success: boolean; profile: StyleProfile; sampleCount: number }>(
      "/training/extract",
      { method: "POST" }
    );
  },

  async getProfile() {
    return request<{ hasProfile: boolean; profile: StyleProfile | null }>("/training/profile");
  },

  async resetProfile() {
    return request<{ success: boolean }>("/training/profile", { method: "DELETE" });
  },
};

// ─── Tasks API ────────────────────────────────────────────────
export const tasksApi = {
  async list(status?: string) {
    const qs = status ? `?status=${status}` : "";
    return request<{ items: Task[]; stats: TaskStats }>(`/tasks${qs}`);
  },

  async getTypes() {
    return request<{ types: Record<string, { label: string; platform: string; creditCost: number }> }>("/tasks/types");
  },

  async create(data: { taskType: string; platform?: string; targetInfo: string; context?: Record<string, any> }) {
    return request<{ success: boolean; taskId: string; task: Task }>(
      "/tasks",
      { method: "POST", body: JSON.stringify(data) }
    );
  },

  async get(id: string) {
    return request<Task>(`/tasks/${id}`);
  },

  async cancel(id: string) {
    return request<{ success: boolean }>(`/tasks/${id}/cancel`, { method: "POST" });
  },

  async setSchedule(id: string, schedule: { timezone?: string; work_start?: string; work_end?: string; work_days?: number[] }) {
    return request<{ id: string; schedule: any; status: string; message: string }>(
      `/tasks/${id}/schedule`,
      { method: "PATCH", body: JSON.stringify(schedule) }
    );
  },
};

// ─── Dashboard API ────────────────────────────────────────────
export const dashboardApi = {
  async overview() {
    return request<DashboardOverview>("/dashboard/overview");
  },

  async credits(page?: number) {
    const qs = page ? `?page=${page}` : "";
    return request<{ balance: number; items: CreditRecord[] }>(`/dashboard/credits${qs}`);
  },

  async report() {
    return request<DailyReport>("/dashboard/report");
  },
};

// ─── Phase 3: 信息流 API ──────────────────────────────────────
export const feedApi = {
  getFeed: (params?: { sort?: string; limit?: number; industry?: string }) => {
    const q = new URLSearchParams();
    if (params?.sort) q.set("sort", params.sort);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.industry) q.set("industry", params.industry);
    const qs = q.toString();
    return request<FeedResponse>(qs ? `/feed?${qs}` : "/feed");
  },
  getQuota: () => request<FeedQuota>("/feed/quota"),
  bookmark: (id: string) =>
    request<{ bookmarkId: string; inquiryId: string; message: string }>(
      `/feed/${id}/bookmark`,
      { method: "POST" }
    ),
  getBookmarks: () =>
    request<{ bookmarks: Bookmark[]; total: number }>("/feed/bookmarks"),
  uploadItem: (data: Partial<FeedItem>) =>
    request<FeedItem>("/feed", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Phase 3: 管理后台 API ────────────────────────────────────
export const adminApi = {
  getKnowledge: (params?: { industry?: string; category?: string }) => {
    const qs = params
      ? "?" + new URLSearchParams(params as any).toString()
      : "";
    return request<{ items: KnowledgeItem[]; total: number; industries: string[]; categories: string[] }>(`/admin/knowledge${qs}`);
  },
  addKnowledge: (data: Partial<KnowledgeItem>) =>
    request<KnowledgeItem>("/admin/knowledge", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteKnowledge: (id: string) =>
    request<{ message: string }>(`/admin/knowledge/${id}`, {
      method: "DELETE",
    }),
  getMonitor: () => request<MonitorData>("/admin/monitor"),
  getFeedItems: (params?: { status?: string; page?: number; limit?: number }) => {
    const qs = params
      ? "?" + new URLSearchParams(params as any).toString()
      : "";
    return request<{ items: FeedItem[]; total: number }>(`/admin/feed${qs}`);
  },
  updateFeedItem: (id: string, status: string) =>
    request<{ message: string }>(`/admin/feed/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

// ─── Phase 3: 视频信息流 API (VOD) ────────────────────────────────────
export interface VideoFeedItem {
  id: string;
  title: string;
  description?: string;
  company_name: string;
  industry: string;
  tags: string[];
  cover_url?: string;
  play_url?: string;
  vid?: string;           // 火山引擎 VOD 视频 ID
  duration?: number;      // 秒
  views_count: number;
  likes_count: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  status: string;
  created_at: string;
}
export interface VideoUploadToken {
  uploadUrl: string;      // TOS 直传地址
  storeUri: string;       // 存储路径
  auth: string;           // 上传鉴权 Token
  sessionKey: string;     // 确认上传用的 SessionKey
  uploadHost: string;     // 上传端点
}
export const videoFeedApi = {
  // 获取视频列表
  getVideos: (params?: { industry?: string; page?: number; limit?: number }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return request<{ items: VideoFeedItem[]; total: number; page: number; limit: number }>(`/video-feed${qs}`);
  },
  // 获取单个视频播放信息
  getPlayInfo: (id: string) =>
    request<{ play_url: string; poster_url: string; duration: number; vid: string }>(`/video-feed/${id}/play`),
  // 点赞
  like: (id: string) =>
    request<{ liked: boolean; likes_count: number }>(`/video-feed/${id}/like`, { method: "POST" }),
  // 收藏（转入询盘）
  bookmark: (id: string) =>
    request<{ bookmarkId: string; message: string }>(`/video-feed/${id}/bookmark`, { method: "POST" }),
  // 获取上传凭证（管理员专用）
  getUploadToken: (filename: string) =>
    request<VideoUploadToken>(`/video-feed/upload/token?filename=${encodeURIComponent(filename)}`),
  // 确认上传完成（管理员专用）
  commitUpload: (data: { sessionKey: string; title: string; description?: string; industry: string; tags?: string[]; company_name?: string }) =>
    request<VideoFeedItem>("/video-feed/upload/commit", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // 直传视频到 TOS
  uploadToTOS: async (uploadToken: VideoUploadToken, file: File, onProgress?: (pct: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", `${uploadToken.uploadUrl}/${uploadToken.storeUri}`);
      xhr.setRequestHeader("Authorization", uploadToken.auth);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`上传失败: ${xhr.status} ${xhr.responseText}`));
      };
      xhr.onerror = () => reject(new Error("网络错误"));
      xhr.send(file);
    });
  },
};

// ─── Phase 5: 社交媒体管理 API ────────────────────────────────
export const socialApi = {
  getAccounts: () =>
    request<{ accounts: any[] }>("/social/accounts"),

  getMessages: (params?: { status?: string; intent?: string; platform?: string; limit?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return request<{ messages: any[]; total: number }>(`/social/messages${qs}`);
  },

  getAccountMessages: (accountId: string, params?: { status?: string; intent?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return request<{ messages: any[]; total: number }>(`/social/accounts/${accountId}/messages${qs}`);
  },

  analyze: (msgId: string) =>
    request<{ success: boolean; analysis: any }>(`/social/messages/${msgId}/analyze`, { method: "POST" }),

  generateReply: (msgId: string) =>
    request<{ success: boolean; draftEn: string; draftZh: string }>(
      `/social/messages/${msgId}/generate-reply`, { method: "POST" }
    ),

  reply: (msgId: string, content: string) =>
    request<{ success: boolean; repliedAt: string }>(`/social/messages/${msgId}/reply`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  convert: (msgId: string) =>
    request<{ success: boolean; inquiryId: string }>(`/social/messages/${msgId}/convert`, { method: "POST" }),

  batchAnalyze: (accountId?: string) =>
    request<{ success: boolean; processed: number }>("/social/messages/batch-analyze", {
      method: "POST",
      body: JSON.stringify({ accountId }),
    }),

  getStats: () =>
    request<{ overall: any; byPlatform: any[] }>("/social/stats"),
};

// ─── Phase 5: GEO 市场洞察 API ────────────────────────────────
export const geoApi = {
  getHeatmap: (product?: string) => {
    const qs = product ? `?product=${encodeURIComponent(product)}` : "";
    return request<{ heatmap: any[]; regionSummary: any[]; totalCountries: number; totalInquiries: number }>(`/geo/heatmap${qs}`);
  },

  getCompetitors: (market?: string) => {
    const qs = market ? `?market=${encodeURIComponent(market)}` : "";
    return request<{ market: string; competitors: any[]; ourAdvantages: any[]; marketOpportunity: any; availableMarkets: string[] }>(`/geo/competitors${qs}`);
  },

  getStrategy: (country: string, product: string, estimatedValue?: number) =>
    request<{ success: boolean; country: string; region: string; product: string; strategy: any }>("/geo/strategy", {
      method: "POST",
      body: JSON.stringify({ country, product, estimatedValue }),
    }),

  getMarketSummary: () =>
    request<{ summary: any; topCountries: any[]; regionDistribution: any[] }>("/geo/market-summary"),

  getTopMarkets: () =>
    request<{ markets: any[] }>("/geo/top-markets"),
};

// ─── Phase 5: 多账号管理 API ──────────────────────────────────
export const multiAccountApi = {
  getInstances: () =>
    request<{ instances: any[]; summary: any }>("/multi-account/instances"),

  createInstance: (data: { name: string; apiEndpoint?: string; mode?: string; priority?: number; proxyUrl?: string; tags?: string[] }) =>
    request<{ success: boolean; instance: any }>("/multi-account/instances", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getInstance: (id: string) =>
    request<{ instance: any; logs: any[]; todayStats: any }>(`/multi-account/instances/${id}`),

  updateStatus: (id: string, status: string) =>
    request<{ success: boolean; status: string }>(`/multi-account/instances/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  deleteInstance: (id: string) =>
    request<{ success: boolean }>(`/multi-account/instances/${id}`, { method: "DELETE" }),

  addAccount: (instanceId: string, data: { platform: string; accountName: string; accountType?: string; dailyOpsLimit?: number }) =>
    request<{ success: boolean; accountId: string }>(`/multi-account/instances/${instanceId}/accounts`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  routeTask: (platform: string, taskType?: string) =>
    request<{ success: boolean; routedTo?: any; error?: string }>("/multi-account/route-task", {
      method: "POST",
      body: JSON.stringify({ platform, taskType }),
    }),

  getHealth: () =>
    request<{ overallHealth: string; instances: any[]; summary: any }>("/multi-account/health"),

  getMatrix: () =>
    request<{ heatmap: any[]; instances: any[]; batchSuggestions: any[]; summary: any }>("/multi-account/matrix"),

  batchAction: (action: string, instanceIds?: string[]) =>
    request<{ success: boolean; action: string; affected: number; message: string }>("/multi-account/batch", {
      method: "POST",
      body: JSON.stringify({ action, instanceIds }),
    }),

  triggerCircuitBreaker: (id: string, action: "trigger" | "reset", reason?: string, sleepMinutes?: number) =>
    request<{ success: boolean; action: string; sleepUntil?: string; message: string }>(`/multi-account/circuit-breaker/${id}`, {
      method: "POST",
      body: JSON.stringify({ action, reason, sleepMinutes }),
    }),
};

// ─── Phase 5: ROI 计算器 API ──────────────────────────────────
export const roiApi = {
  getSummary: () =>
    request<{ roi: any; business: any; efficiency: any }>("/roi/summary"),

  getCalculator: () =>
    request<{ breakdown: any[]; total: any; assumptions: any }>("/roi/calculator"),

  getFunnel: () =>
    request<{ funnel: any[]; conversionRates: any; totalInquiries: number; totalPipelineValue: number; totalDealValue: number }>("/roi/funnel"),

  updateFunnelStage: (id: string, data: { status?: string; dealValue?: number; funnelStage?: string }) =>
    request<{ success: boolean; status?: string; updatedAt: string }>(`/roi/funnel/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ─── Phase 5: Dashboard 扩展 API ─────────────────────────────
export const dashboardExtApi = {
  getFunnel: () =>
    request<{ funnel: any[]; conversionRates: any; totalInquiries: number; totalDealValue: number }>("/dashboard/funnel"),

  pushDailyReport: () =>
    request<{ success: boolean; message: string }>("/dashboard/daily-report/push", { method: "POST" }),
};

// ─── 类型定义 ─────────────────────────────────────────────────────
export interface UserInfo {
  id: string;
  name: string;
  phone?: string;
  email: string;
  tenantId: string;
  tenantName: string;
  planType: string;
  creditsBalance: number;
  pushHour?: number;
  pushHourEve?: number;
}

export interface Inquiry {
  id: string;
  tenantId?: string;
  tenant_id?: string;
  sourcePlatform: string;
  source_platform?: string;
  buyerName: string;
  buyer_name?: string;
  buyerCompany: string;
  buyer_company?: string;
  buyerCountry: string;
  buyer_country?: string;
  buyerContact?: string;
  productName: string;
  product_name?: string;
  quantity?: string;
  rawContent?: string;
  raw_content?: string;
  estimatedValue?: number;
  estimated_value?: number;
  confidenceScore: number;
  confidence_score?: number;
  confidenceBreakdown: {
    channelWeight: number;
    contentQuality: number;
    buyerCompleteness: number;
  };
  confidence_breakdown?: {
    channelWeight: number;
    contentQuality: number;
    buyerCompleteness: number;
  };
  aiSummary?: string;
  ai_summary?: string;
  aiDraftCn?: string;
  ai_draft_cn?: string;
  aiDraftEn?: string;
  ai_draft_en?: string;
  aiAnalysis?: string;
  ai_analysis?: string;
  tags: string[];
  status: string;
  urgency: string;
  receivedAt: string;
  received_at?: string;
  updatedAt: string;
  updated_at?: string;
}

export interface InquiryDetail extends Inquiry {
  quotation?: Quotation | null;
  replies?: Reply[];
}

export interface Quotation {
  id: string;
  product_name: string;
  unit_price: number;
  currency: string;
  unit: string;
  price_term: string;
  min_order: number;
  delivery_days: number;
  validity_days: number;
  followup_style: string;
  status: string;
  sent_at?: string;
  created_at: string;
}

export interface Reply {
  id: string;
  reply_type: string;
  content_zh?: string;
  content_en?: string;
  send_status: string;
  sent_at?: string;
  created_at: string;
}

export interface InquiryStats {
  today: {
    newInquiries: number;
    totalValue: number;
    agentOps: number;
    creditsUsed: number;
  };
  pipeline: {
    unread: number;
    unquoted: number;
    quoted: number;
    contracted: number;
    total: number;
  };
  totalAllTime: {
    inquiries: number;
    value: number;
  };
  channelDistribution: { source_platform: string; count: number }[];
  credits: { balance: number; usedToday: number };
  openclaw: {
    status: string;
    opsToday: number;
    opsLimit: number;
    lastHeartbeat?: string;
  } | null;
}

export interface QuoteData {
  productName?: string;
  unitPrice: number;
  currency?: string;
  unit?: string;
  priceTerm?: string;
  minOrder?: number;
  deliveryDays?: number;
  validityDays?: number;
  followupStyle?: string;
}

export interface ReplyData {
  contentZh: string;
  quotationId?: string;
  useAiDraft?: boolean;
}

export interface OpenClawStatus {
  instance: {
    id: string;
    name: string;
    status: string;
    lastHeartbeat?: string;
    opsToday: number;
    opsLimit: number;
    opsPercent: number;
    consecutiveFailures: number;
    failureThreshold: number;
    sleeping: boolean;
    sleepUntil?: string | null;
    sleepRemainingMs: number;
  } | null;
  accounts: {
    id: string;
    platform: string;
    accountName: string;
    healthStatus: string;
    dailyOpsUsed: number;
    dailyOpsLimit: number;
    opsPercent: number;
  }[];
  todayStats: {
    totalOps: number;
    creditsUsed: number;
    successCount: number;
    failCount: number;
  };
  recentLogs: AgentLog[];
}

export interface AgentLog {
  id: string;
  actionType: string;
  platform: string;
  status: string;
  creditsUsed: number;
  detail: Record<string, any>;
  createdAt: string;
}

export interface DashboardOverview {
  tenant: { name: string; planType: string; creditsBalance: number };
  inquiries: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
    unread: number;
    unquoted: number;
    quoted: number;
    contracted: number;
    expired: number;
    total_value: number;
    month_value: number;
  };
  channelDistribution: { platform: string; count: number; value: number }[];
  dailyTrend: { date: string; count: number }[];
  confidenceDistribution: { high: number; medium: number; low: number };
  openclaw: {
    status: string;
    opsToday: number;
    opsLimit: number;
    lastHeartbeat?: string;
  } | null;
  socialAccounts: {
    platform: string;
    accountName: string;
    healthStatus: string;
    dailyOpsUsed: number;
    dailyOpsLimit: number;
  }[];
}

export interface CreditRecord {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description?: string;
  created_at: string;
}

export interface TrainingSample {
  id: string;
  label: string;
  preview: string;
  created_at: string;
}

export interface StyleProfile {
  id?: string;
  tone: string;
  greeting: string;
  closing: string;
  key_phrases?: string;
  keyPhrases?: string[];
  pricing_approach: string;
  followup_style: string;
  summary: string;
  sample_count?: number;
  updated_at?: string;
}

export interface Task {
  id: string;
  task_type: string;
  platform: string;
  target_info: string;
  steps: string[];
  current_step: number;
  total_steps: number;
  status: "pending" | "running" | "completed" | "failed" | "cancelled" | "sleeping";
  progress: number;
  result?: any;
  error_msg?: string;
  estimated_ops: number;
  estimated_credits: number;
  actual_credits: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export interface DailyReport {
  date: string;
  newInquiries: number;
  replied: number;
  totalValue: number;
  agentOps: number;
  creditsUsed: number;
  platformBreakdown: { platform: string; count: number }[];
}

// ─── Phase 3: 信息流类型 ──────────────────────────────────────
export interface FeedItem {
  id: string;
  media_type: "text" | "image" | "video";
  media_url?: string;
  buyer_company: string;
  buyer_country: string;
  buyer_name?: string;
  product_name: string;
  quantity?: string;
  raw_content?: string;
  industry: string;
  estimated_value: number;
  confidence_score: number;
  ai_summary?: string;
  ai_tags: string[];
  status: string;
  recommendation_score?: number;
  created_at: string;
}

export interface FeedQuota {
  used: number;
  total: number;
  remaining: number;
  resetAt: string;
}

export interface FeedResponse {
  items: FeedItem[];
  quota: FeedQuota;
  total: number;
}

export interface Bookmark {
  bookmark_id: string;
  bookmarked_at: string;
  feed_item_id: string;
  buyer_company: string;
  buyer_country: string;
  buyer_name?: string;
  product_name: string;
  quantity?: string;
  confidence_score: number;
  industry: string;
  ai_summary?: string;
  ai_tags: string[];
  inquiry_id: string;
}

export interface KnowledgeItem {
  id: string;
  industry: string;
  category: string;
  key: string;
  value: string;
  source: string;
  created_at: string;
}

export interface MonitorData {
  system: {
    status: string;
    version: string;
    uptime: number;
    memoryUsed: number;
    cpuUsed: number;
    database: string;
  };
  business: {
    todayInquiries: number;
    todayOps: number;
    todayCredits: number;
    creditsBalance: number;
  };
  openclaw: {
    status: string;
    opsToday: number;
    opsLimit: number;
    lastHeartbeat?: string;
    accounts: any[];
  } | null;
  ai: {
    todayCalls: number;
    avgResponseMs: number;
    successRate: number;
  };
  feed: {
    total: number;
    todayBookmarks: number;
  };
  recentLogs: any[];
  timestamp: string;
}

// ─── Phase 6: Boss Command Center API ───────────────────────────────────────────────
export const bossApi = {
  /** 老板下达自然语言指令 */
  sendCommand: (command: string) =>
    request<{ success: boolean; commandId: string; message: string; status: string }>(
      "/boss/command", { method: "POST", body: JSON.stringify({ command }) }
    ),

  /** 历史指令列表 */
  getCommands: (limit = 20) =>
    request<{ commands: BossCommand[]; total: number }>(`/boss/commands?limit=${limit}`),

  /** 待审批回复草稿列表 */
  getPendingApprovals: (status = "pending") =>
    request<{ approvals: PendingApproval[]; pendingCount: number }>(`/boss/pending-approvals?status=${status}`),

  /** 批准草稿（触发 OpenClaw 自动发送） */
  approve: (id: string) =>
    request<{ success: boolean; message: string; replyId: string; status: string; approvedAt: string }>(
      `/boss/approvals/${id}/approve`, { method: "POST" }
    ),

  /** 拒绝草稿 */
  reject: (id: string, reason = "老板拒绝") =>
    request<{ success: boolean; message: string; rejectedAt: string }>(
      `/boss/approvals/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }
    ),

  /** 战报聚合数据（三模块） */
  getWarroom: () =>
    request<WaRoomData>("/boss/warroom"),

  /** 复合指令实验室：AI 拆解复合指令为可视化流程 */
  commandLab: (command: string) =>
    request<{
      success: boolean;
      commandId: string;
      lab: {
        title: string;
        steps: Array<{
          id: number;
          phase: "analyze" | "filter" | "execute" | "report";
          label: string;
          detail: string;
          estimatedTime: string;
          platform?: string;
          creditCost: number;
        }>;
        totalCredits: number;
        totalTime: string;
        riskLevel: "low" | "medium" | "high";
        riskNote: string;
        subTasks: string[];
      };
    }>("/boss/command-lab", { method: "POST", body: JSON.stringify({ command }) }),
};

export interface BossCommand {
  id: string;
  raw_input: string;
  structured: {
    intent?: string;
    params?: Record<string, any>;
    confidence?: number;
    humanReadable?: string;
  };
  status: "queued" | "dispatched" | "failed";
  task_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PendingApproval {
  id: string;
  inquiry_id: string;
  content_en: string;
  content_zh?: string;
  platform?: string;
  buyer_name?: string;
  buyer_company?: string;
  buyer_country?: string;
  product_name?: string;
  estimated_value?: number;
  confidence_score?: number;
  status: "pending" | "approved" | "rejected" | "sent";
  created_at: string;
}

export interface WaRoomData {
  signals: {
    newInquiries: number;
    unread: number;
    pendingApprovals: number;
    newQuotations: number;
    latestInquiries: Inquiry[];
    hasUrgent: boolean;
  };
  agent: {
    instance: {
      id: string;
      name: string;
      status: string;
      opsToday: number;
      opsLimit: number;
      lastHeartbeat?: string;
      consecutiveFailures: number;
      sleepUntil?: string | null;
      utilizationRate: number;
    } | null;
    accounts: { platform: string; healthStatus: string; usageRate: number }[];
    todayTasks: number;
    completedTasks: number;
    pendingCommands: number;
  };
  weekReport: {
    lastWeek: WeekStats;
    thisWeek: WeekStats;
    growth: {
      inquiries: number;
      replied: number;
      contracted: number;
      contractedValue: number;
      highValue: number;
    };
  };
}

export interface WeekStats {
  inquiries: number;
  replied: number;
  contracted: number;
  contractedValue: number;
  highValue: number;
  replyRate: number;
}

// ─── Phase 9: Agent API ───────────────────────────────────────
export const agentApi = {
  /** 获取 Agent 列表（首次访问自动初始化前 3 个） */
  async list() {
    return request<Agent[]>("/agents");
  },

  /** 获取 Agent 模板列表 */
  async templates() {
    return request<AgentTemplate[]>("/agents/templates");
  },

  /** 创建 Agent */
  async create(data: { type: string; name: string; description?: string; config?: Record<string, any>; cron_expr?: string }) {
    return request<Agent>("/agents", { method: "POST", body: JSON.stringify(data) });
  },

  /** 获取 Agent 详情（含最近任务） */
  async get(id: string) {
    return request<Agent & { recent_tasks: AgentTask[] }>(`/agents/${id}`);
  },

  /** 更新 Agent 配置 */
  async update(id: string, data: Partial<Pick<Agent, "name" | "description" | "config" | "cron_expr" | "is_enabled">>) {
    return request<Agent>(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  /** 手动触发 Agent 任务 */
  async trigger(id: string, override?: Record<string, any>) {
    return request<{ taskId: string; agentId: string; status: string; message: string; createdAt: string }>(
      `/agents/${id}/trigger`,
      { method: "POST", body: JSON.stringify({ override }) }
    );
  },

  /** 获取 Agent 任务历史 */
  async tasks(agentId: string, params?: { limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    return request<{ items: AgentTask[]; total: number }>(`/agents/${agentId}/tasks?${qs.toString()}`);
  },

  /** 获取任务详情 */
  async getTask(taskId: string) {
    return request<AgentTask>(`/agents/tasks/${taskId}`);
  },

  /** 取消任务 */
  async cancelTask(taskId: string) {
    return request<{ taskId: string; status: string; message: string }>(
      `/agents/tasks/${taskId}/cancel`,
      { method: "POST" }
    );
  },

  /** 获取线索列表 */
  async leads(params?: { status?: string; platform?: string; intent?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.platform) qs.set("platform", params.platform);
    if (params?.intent) qs.set("intent", params.intent);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    return request<{ items: Lead[]; total: number; limit: number; offset: number }>(`/agents/leads?${qs.toString()}`);
  },

  /** 更新线索状态 */
  async updateLead(id: string, status: Lead["status"]) {
    return request<{ id: string; status: string; message: string }>(
      `/agents/leads/${id}`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    );
  },

  /** 获取竞品视频列表 */
  async trends(params?: { limit?: number; viral_only?: boolean }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.viral_only) qs.set("viral_only", "true");
    return request<{ items: TrendVideo[]; total: number }>(`/agents/trends?${qs.toString()}`);
  },

  /** 获取选题建议列表 */
  async suggestions(params?: { status?: string; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<{ items: ContentSuggestion[]; total: number }>(`/agents/suggestions?${qs.toString()}`);
  },

  /** 更新选题状态 */
  async updateSuggestion(id: string, status: ContentSuggestion["status"]) {
    return request<{ id: string; status: string; message: string }>(
      `/agents/suggestions/${id}`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    );
  },
};

// ─── Phase 9: Agent 相关类型定义 ─────────────────────────────
export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  type: AgentType;
  description: string;
  config: Record<string, any>;
  cron_expr: string | null;
  status: "idle" | "running" | "paused" | "error";
  is_enabled: number;
  last_run_at: string | null;
  last_result: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type AgentType =
  | "leads_hunter"
  | "trend_radar"
  | "content_pilot"
  | "digital_human"
  | "auto_poster"
  | "seo_optimizer"
  | "dm_closer"
  | "email_follower"
  | "payment_pilot"
  | "finance_pilot"
  | "logistics_sentinel"
  | "gov_compliance";

export interface AgentTemplate {
  type: AgentType;
  name: string;
  description: string;
  defaultConfig: Record<string, any>;
}

export interface AgentTask {
  id: string;
  agent_id: string;
  tenant_id: string;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  session_id: string | null;
  trigger_type: "manual" | "cron" | "chain";
  input_data: Record<string, any>;
  result_data: Record<string, any>;
  error_msg: string | null;
  progress: number;
  current_step: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  agent_task_id: string;
  source_platform: "tiktok" | "instagram" | "youtube" | "other";
  source_url: string | null;
  user_handle: string;
  user_name: string;
  content: string;
  intent_score: number;
  intent_label: "inquiry" | "interest" | "general" | "spam";
  contact_info: { email?: string; whatsapp?: string; website?: string };
  ai_summary: string;
  status: "new" | "contacted" | "converted" | "ignored";
  created_at: string;
  updated_at: string;
}

export interface TrendVideo {
  id: string;
  tenant_id: string;
  agent_task_id: string;
  platform: string;
  account_handle: string;
  account_name: string;
  video_url: string | null;
  title: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
  duration: number;
  opening_type: string;
  bgm: string;
  tags: string[];
  thumbnail_url: string | null;
  ai_analysis: string;
  is_viral: number;
  published_at: string | null;
  created_at: string;
}

export interface ContentSuggestion {
  id: string;
  tenant_id: string;
  agent_task_id: string;
  title: string;
  hook: string;
  value_prop: string;
  proof: string;
  cta: string;
  full_script: string;
  estimated_views: number;
  tags: string[];
  status: "pending" | "approved" | "rejected" | "used";
  created_at: string;
}
