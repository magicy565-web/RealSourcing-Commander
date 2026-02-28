/**
 * Commander 5.0 Phase 3 — 管理后台页面
 * M2: 询盘上传门户
 * M5: 行业知识库管理
 * M8: Web 监控后台
 */
import { useState, useEffect, useCallback } from "react";
import { adminApi, feedApi, videoFeedApi, KnowledgeItem, MonitorData, FeedItem, VideoUploadToken } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";

type AdminTab = "monitor" | "feed-upload" | "knowledge" | "feed-manage";

// ─── 系统监控面板 (M8) ────────────────────────────────────────
function MonitorPanel() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await adminApi.getMonitor();
      setData(d);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // 每 30 秒刷新
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* 刷新时间 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          最后刷新: {lastRefresh.toLocaleTimeString("zh-CN")}
        </span>
        <button
          onClick={load}
          className="text-xs text-indigo-600 font-medium flex items-center gap-1"
        >
          <span className={loading ? "animate-spin" : ""}>↻</span>
          刷新
        </button>
      </div>

      {/* 系统健康 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full ${data.system.status === "online" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <h3 className="text-sm font-semibold text-gray-800">系统状态</h3>
          <span className="text-xs text-gray-400 ml-auto">v{data.system.version}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="内存使用" value={`${data.system.memoryUsed}%`} color={data.system.memoryUsed > 80 ? "red" : "green"} />
          <MetricCard label="CPU 使用" value={`${data.system.cpuUsed}%`} color={data.system.cpuUsed > 80 ? "red" : "green"} />
          <MetricCard label="运行时长" value={formatUptime(data.system.uptime)} color="blue" />
          <MetricCard label="数据库" value="正常" color="green" />
        </div>
      </div>

      {/* 业务指标 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">今日业务</h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="新增询盘" value={String(data.business.todayInquiries)} color="indigo" />
          <MetricCard label="Agent 操作" value={String(data.business.todayOps)} color="purple" />
          <MetricCard label="消耗积分" value={String(data.business.todayCredits)} color="amber" />
          <MetricCard label="积分余额" value={String(data.business.creditsBalance)} color="green" />
        </div>
      </div>

      {/* AI 接口 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">AI 接口</h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="今日调用" value={String(data.ai.todayCalls)} color="blue" />
          <MetricCard label="平均响应" value={`${data.ai.avgResponseMs}ms`} color="green" />
          <MetricCard label="成功率" value={`${data.ai.successRate}%`} color="green" />
        </div>
      </div>

      {/* 信息流统计 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">信息流</h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="活跃条目" value={String(data.feed.total)} color="indigo" />
          <MetricCard label="今日收藏" value={String(data.feed.todayBookmarks)} color="purple" />
        </div>
      </div>

      {/* OpenClaw 状态 */}
      {data.openclaw && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${data.openclaw.status === "running" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            <h3 className="text-sm font-semibold text-gray-800">OpenClaw 状态</h3>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>今日操作</span>
            <span className="font-semibold">{data.openclaw.opsToday} / {data.openclaw.opsLimit}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${Math.min((data.openclaw.opsToday / data.openclaw.opsLimit) * 100, 100)}%` }}
            />
          </div>
          {data.openclaw.accounts.length > 0 && (
            <div className="mt-3 space-y-2">
              {data.openclaw.accounts.map((acc: any) => (
                <div key={acc.platform} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{acc.platform}</span>
                  <span className={`font-medium ${acc.health_status === "healthy" ? "text-green-600" : "text-red-500"}`}>
                    {acc.health_status === "healthy" ? "正常" : "异常"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 最近操作日志 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">最近操作</h3>
        <div className="space-y-2">
          {data.recentLogs.slice(0, 5).map((log: any) => (
            <div key={log.id} className="flex items-center gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === "success" ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-gray-500 shrink-0">{log.platform}</span>
              <span className="text-gray-700 flex-1 truncate">{log.action_type.replace(/_/g, " ")}</span>
              <span className="text-gray-400 shrink-0">-{log.credits_used}积分</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
    blue: "text-blue-600 bg-blue-50",
    indigo: "text-indigo-600 bg-indigo-50",
    purple: "text-purple-600 bg-purple-50",
    amber: "text-amber-600 bg-amber-50",
  };
  return (
    <div className={`rounded-lg p-2.5 ${colorMap[color] ?? "text-gray-600 bg-gray-50"}`}>
      <p className="text-xs opacity-70 mb-0.5">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── 询盘上传门户 (M2) ────────────────────────────────────────
function FeedUploadPanel() {
  const [form, setForm] = useState({
    buyer_company: "",
    buyer_country: "",
    buyer_name: "",
    product_name: "",
    quantity: "",
    raw_content: "",
    industry: "furniture",
    estimated_value: "",
    media_type: "text" as "text" | "image" | "video",
    media_url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // VOD 视频上传状态
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<"idle" | "token" | "uploading" | "committing" | "done">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    setError(null);
    try {
      let finalMediaUrl = form.media_url;

      // 视频类型：接入火山引擎 VOD 上传流程
      if (form.media_type === "video" && videoFile) {
        // Step 1: 获取上传凭证
        setUploadStage("token");
        const token = await videoFeedApi.getUploadToken(videoFile.name);

        // Step 2: 直传到 TOS
        setUploadStage("uploading");
        setUploadProgress(0);
        await videoFeedApi.uploadToTOS(token, videoFile, (pct) => setUploadProgress(pct));

        // Step 3: 确认上传，获取视频信息
        setUploadStage("committing");
        const videoItem = await videoFeedApi.commitUpload({
          sessionKey: token.sessionKey,
          title: form.product_name || form.buyer_company,
          description: form.raw_content,
          industry: form.industry,
          tags: [form.buyer_country, form.industry].filter(Boolean),
          company_name: form.buyer_company,
        });
        finalMediaUrl = videoItem.play_url || "";
        setUploadStage("done");
      }

      // 上传询盘卡片到信息流
      const res = await feedApi.uploadItem({
        ...form,
        media_url: finalMediaUrl,
        estimated_value: parseFloat(form.estimated_value) || 0,
      } as any);
      setSuccess(`✓ 已上传：${res.buyer_company} - ${res.product_name}（置信度 ${res.confidence_score} 分）`);
      setForm({
        buyer_company: "", buyer_country: "", buyer_name: "",
        product_name: "", quantity: "", raw_content: "",
        industry: "furniture", estimated_value: "",
        media_type: "text",
        media_url: "",
      });
      setVideoFile(null);
      setUploadProgress(0);
      setUploadStage("idle");
    } catch (err: any) {
      setError(err.message ?? "上传失败");
      setUploadStage("idle");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-700">
        <p className="font-semibold mb-1">📤 上传询盘到信息流</p>
        <p>上传后，系统将自动计算置信度评分，并推送给匹配的用户。</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="买家公司 *"
            value={form.buyer_company}
            onChange={(v) => setForm({ ...form, buyer_company: v })}
            placeholder="Nordic Home AB"
          />
          <FormField
            label="买家国家 *"
            value={form.buyer_country}
            onChange={(v) => setForm({ ...form, buyer_country: v })}
            placeholder="瑞典"
          />
        </div>
        <FormField
          label="联系人"
          value={form.buyer_name}
          onChange={(v) => setForm({ ...form, buyer_name: v })}
          placeholder="Erik Lindqvist"
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="产品品名 *"
            value={form.product_name}
            onChange={(v) => setForm({ ...form, product_name: v })}
            placeholder="实木餐桌套装"
          />
          <FormField
            label="采购数量"
            value={form.quantity}
            onChange={(v) => setForm({ ...form, quantity: v })}
            placeholder="200套/月"
          />
        </div>
        {/* 媒体类型选择（M2 缺口#6） */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">卡片类型</label>
          <div className="flex gap-2">
            {(["text", "image", "video"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, media_type: t, media_url: "" })}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  form.media_type === t
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
                }`}
              >
                {t === "text" ? "📝 纯文字" : t === "image" ? "🖼️ 图片" : "🎬 视频"}
              </button>
            ))}
          </div>
        </div>
        {form.media_type === "image" && (
          <FormField
            label="图片 URL"
            value={form.media_url}
            onChange={(v) => setForm({ ...form, media_url: v })}
            placeholder="https://example.com/product.jpg"
          />
        )}
        {form.media_type === "video" && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              视频文件 <span className="text-gray-400">(支持 MP4/MOV/AVI，建议 30-60s)</span>
            </label>
            {!videoFile ? (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <span className="text-2xl mb-1">🎥</span>
                <span className="text-xs text-indigo-600 font-medium">点击选择视频文件</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setVideoFile(f);
                  }}
                />
              </label>
            ) : (
              <div className="bg-indigo-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-indigo-700 truncate max-w-[200px]">{videoFile.name}</span>
                  <button
                    type="button"
                    onClick={() => { setVideoFile(null); setUploadProgress(0); setUploadStage("idle"); }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    × 移除
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                </div>
                {uploadStage !== "idle" && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-indigo-600">
                        {uploadStage === "token" ? "获取上传凭证..."
                          : uploadStage === "uploading" ? `上传中 ${uploadProgress}%`
                          : uploadStage === "committing" ? "确认上传..."
                          : "✓ 视频已就绪"}
                      </span>
                      <span className="text-gray-400">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${uploadStage === "done" ? 100 : uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">行业</label>
            <select
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="furniture">家具</option>
              <option value="textile">纺织</option>
              <option value="electronics">电子</option>
              <option value="other">其他</option>
            </select>
          </div>
          <FormField
            label="预估价值 (USD)"
            value={form.estimated_value}
            onChange={(v) => setForm({ ...form, estimated_value: v })}
            placeholder="50000"
            type="number"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">原始询盘内容</label>
          <textarea
            value={form.raw_content}
            onChange={(e) => setForm({ ...form, raw_content: e.target.value })}
            placeholder="粘贴买家原文询盘内容..."
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
        </div>

        {success && (
          <div className="bg-green-50 text-green-700 text-xs rounded-lg p-3">{success}</div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 text-xs rounded-lg p-3">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting || !form.buyer_company || !form.buyer_country || !form.product_name}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              上传中...
            </>
          ) : (
            "📤 上传到信息流"
          )}
        </button>
      </form>
    </div>
  );
}

function FormField({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </div>
  );
}

// ─── 行业知识库管理 (M5) ──────────────────────────────────────
function KnowledgePanel() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ industry: "furniture", category: "price_range", key: "", value: "" });
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterIndustry) params.industry = filterIndustry;
      if (filterCategory) params.category = filterCategory;
      const data = await adminApi.getKnowledge(params);
      setItems(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterIndustry, filterCategory]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newItem.key || !newItem.value) return;
    setAdding(true);
    try {
      await adminApi.addKnowledge(newItem);
      setShowAdd(false);
      setNewItem({ industry: "furniture", category: "price_range", key: "", value: "" });
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await adminApi.deleteKnowledge(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const CATEGORY_LABEL: Record<string, string> = {
    price_range: "价格区间",
    cert: "认证要求",
    term: "行业术语",
    template: "回复模板",
  };

  const INDUSTRY_LABEL: Record<string, string> = {
    furniture: "家具",
    textile: "纺织",
  };

  return (
    <div className="space-y-4">
      {/* 筛选 */}
      <div className="flex gap-2">
        <select
          value={filterIndustry}
          onChange={(e) => setFilterIndustry(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">全部行业</option>
          <option value="furniture">家具</option>
          <option value="textile">纺织</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">全部分类</option>
          <option value="price_range">价格区间</option>
          <option value="cert">认证要求</option>
          <option value="term">行业术语</option>
          <option value="template">回复模板</option>
        </select>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
        >
          + 添加
        </button>
      </div>

      {/* 添加表单 */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-indigo-50 rounded-xl p-3 space-y-2"
          >
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newItem.industry}
                onChange={(e) => setNewItem({ ...newItem, industry: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
              >
                <option value="furniture">家具</option>
                <option value="textile">纺织</option>
              </select>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
              >
                <option value="price_range">价格区间</option>
                <option value="cert">认证要求</option>
                <option value="term">行业术语</option>
                <option value="template">回复模板</option>
              </select>
            </div>
            <input
              value={newItem.key}
              onChange={(e) => setNewItem({ ...newItem, key: e.target.value })}
              placeholder="关键词（如：实木餐桌）"
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
            />
            <textarea
              value={newItem.value}
              onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
              placeholder="知识内容（如：FOB $80-$350/套）"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={adding || !newItem.key || !newItem.value}
                className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {adding ? "添加中..." : "确认添加"}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs"
              >
                取消
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 知识条目列表 */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className="text-xs font-semibold text-gray-800">{item.key}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {INDUSTRY_LABEL[item.industry] ?? item.industry}
                  </span>
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                    {CATEGORY_LABEL[item.category] ?? item.category}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{item.value}</p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="text-red-400 hover:text-red-600 text-xs shrink-0 disabled:opacity-50"
              >
                {deletingId === item.id ? "..." : "删除"}
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">暂无知识条目</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 信息流管理 ───────────────────────────────────────────────
function FeedManagePanel() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getFeedItems({ status: statusFilter });
      setItems(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = async (item: FeedItem) => {
    const newStatus = item.status === "active" ? "archived" : "active";
    try {
      await adminApi.updateFeedItem(item.id, newStatus);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["active", "archived"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${statusFilter === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {s === "active" ? "活跃" : "已归档"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-semibold text-gray-800 truncate">{item.buyer_company}</span>
                    <span className="text-xs text-gray-400">{item.buyer_country}</span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{item.product_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-indigo-600">置信度 {item.confidence_score}</span>
                    {item.estimated_value > 0 && (
                      <span className="text-xs text-green-600">${item.estimated_value.toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleStatus(item)}
                  className={`text-xs px-2 py-1 rounded-lg font-medium shrink-0
                    ${item.status === "active"
                      ? "bg-red-50 text-red-500 hover:bg-red-100"
                      : "bg-green-50 text-green-600 hover:bg-green-100"}`}
                >
                  {item.status === "active" ? "归档" : "恢复"}
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">暂无条目</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("monitor");

  const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: "monitor", label: "监控", icon: "📊" },
    { id: "feed-upload", label: "上传询盘", icon: "📤" },
    { id: "knowledge", label: "知识库", icon: "📚" },
    { id: "feed-manage", label: "信息流", icon: "📋" },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-2 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">管理后台</h1>
        <p className="text-xs text-gray-400">系统监控 · 数据管理 · 知识库</p>
      </div>

      {/* Tab 导航 */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors
                ${activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "monitor" && <MonitorPanel />}
            {activeTab === "feed-upload" && <FeedUploadPanel />}
            {activeTab === "knowledge" && <KnowledgePanel />}
            {activeTab === "feed-manage" && <FeedManagePanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
