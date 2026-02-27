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

// ─── 类型定义 ─────────────────────────────────────────────────
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
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
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
