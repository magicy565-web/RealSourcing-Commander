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

  async logs(params?: { platform?: string; status?: string; page?: number }) {
    const qs = new URLSearchParams();
    if (params?.platform) qs.set("platform", params.platform);
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    return request<{ items: AgentLog[] }>(`/openclaw/logs?${qs.toString()}`);
  },

  async simulateLead() {
    return request<{ success: boolean; message: string; inquiryId: string; platform: string }>(
      "/openclaw/simulate-lead",
      { method: "POST" }
    );
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
    request<{ playUrl: string; coverUrl: string; duration: number; vid: string }>(`/video-feed/${id}/play`),
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
  tenant_id: string;
  source_platform: string;
  buyer_name: string;
  buyer_company: string;
  buyer_country: string;
  buyer_contact?: string;
  product_name: string;
  quantity?: string;
  raw_content?: string;
  estimated_value?: number;
  confidence_score: number;
  confidence_breakdown: {
    channelWeight: number;
    contentQuality: number;
    buyerCompleteness: number;
  };
  ai_summary?: string;
  ai_draft_cn?: string;
  ai_draft_en?: string;
  ai_analysis?: string;
  tags: string[];
  status: string;
  urgency: string;
  received_at: string;
  updated_at: string;
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
