/**
 * Commander 5.0 — AI 风格训练页面
 * 用户上传历史报价样本 → AI 提取风格档案 → 后续 AI 草稿使用该风格
 */
import { useState, useEffect } from "react";
import { trainingApi, StyleProfile, TrainingSample } from "../lib/api";

interface StyleTrainingProps {
  onBack: () => void;
}

export default function StyleTraining({ onBack }: StyleTrainingProps) {
  const [samples, setSamples] = useState<TrainingSample[]>([]);
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newSample, setNewSample] = useState("");
  const [activeTab, setActiveTab] = useState<"samples" | "profile">("samples");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [samplesRes, profileRes] = await Promise.all([
        trainingApi.getSamples(),
        trainingApi.getProfile(),
      ]);
      setSamples(samplesRes.items);
      setProfile(profileRes.profile);
      setHasProfile(profileRes.hasProfile);
    } catch (err: any) {
      showToast(err.message ?? "加载失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddSample = async () => {
    if (!newSample.trim()) return;
    setAdding(true);
    try {
      await trainingApi.addSamples([{ content: newSample.trim(), label: "quote" }]);
      setNewSample("");
      showToast("样本添加成功！");
      await loadData();
    } catch (err: any) {
      showToast(err.message ?? "添加失败", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSample = async (id: string) => {
    try {
      await trainingApi.deleteSample(id);
      setSamples((prev) => prev.filter((s) => s.id !== id));
      showToast("样本已删除");
    } catch (err: any) {
      showToast(err.message ?? "删除失败", "error");
    }
  };

  const handleExtract = async () => {
    if (samples.length === 0) {
      showToast("请先添加至少 1 条历史报价样本", "error");
      return;
    }
    setExtracting(true);
    try {
      const res = await trainingApi.extractProfile();
      setProfile(res.profile);
      setHasProfile(true);
      setActiveTab("profile");
      showToast(`✨ 风格提取成功！基于 ${res.sampleCount} 条样本`);
    } catch (err: any) {
      showToast(err.message ?? "AI 提取失败，请稍后重试", "error");
    } finally {
      setExtracting(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("确定要重置所有样本和风格档案吗？")) return;
    try {
      await trainingApi.resetProfile();
      setSamples([]);
      setProfile(null);
      setHasProfile(false);
      setActiveTab("samples");
      showToast("已重置");
    } catch (err: any) {
      showToast(err.message ?? "重置失败", "error");
    }
  };

  const DEMO_SAMPLES = [
    `Hi Sarah,\n\nThank you for your inquiry about our LED panel lights. We're excited to work with you!\n\nFor your order of 500 units, our best price is USD 8.50/pc FOB Shenzhen, with 30-day delivery.\n\nWe offer free samples for serious buyers. Would you like me to arrange one?\n\nBest regards,\nMike`,
    `Dear Mr. Ahmed,\n\nRegarding your RFQ for 1000 pcs solar garden lights, I'm pleased to offer:\n- Unit price: USD 12.80/pc FOB\n- MOQ: 200 pcs\n- Lead time: 25 days\n\nOur products are CE & RoHS certified. Please find our catalog attached.\n\nLooking forward to your feedback!\n\nBest,\nMike`,
    `Hello,\n\nThanks for reaching out! For the 200W flood lights you need, our price is USD 45/pc CIF.\n\nI noticed you're from Germany - we have several satisfied clients there. I can provide references if needed.\n\nShall we schedule a video call this week?\n\nWarm regards,\nMike`,
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">AI 风格训练</h1>
          <p className="text-xs text-gray-500">上传历史报价，让 AI 学习你的风格</p>
        </div>
        {hasProfile && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            已训练
          </span>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-sm font-medium text-center ${
          toast.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 mx-0">
        {(["samples", "profile"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
          >
            {tab === "samples" ? `样本库 (${samples.length})` : "风格档案"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">加载中...</p>
          </div>
        </div>
      ) : activeTab === "samples" ? (
        <div className="flex-1 overflow-y-auto">
          {/* 添加样本 */}
          <div className="m-4 bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-800 mb-2">添加历史报价样本</p>
            <p className="text-xs text-gray-500 mb-3">粘贴你过去发给买家的报价邮件或回复内容（中英文均可）</p>
            <textarea
              value={newSample}
              onChange={(e) => setNewSample(e.target.value)}
              placeholder="粘贴你的历史报价邮件内容..."
              className="w-full h-28 text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAddSample}
                disabled={adding || !newSample.trim()}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
              >
                {adding ? "添加中..." : "添加样本"}
              </button>
              {newSample.trim() === "" && (
                <button
                  onClick={() => setNewSample(DEMO_SAMPLES[Math.floor(Math.random() * DEMO_SAMPLES.length)])}
                  className="px-3 py-2 bg-gray-100 text-gray-600 text-xs rounded-xl"
                >
                  用示例
                </button>
              )}
            </div>
          </div>

          {/* 样本列表 */}
          {samples.length > 0 ? (
            <div className="mx-4 mb-4 space-y-2">
              {samples.map((sample, i) => (
                <div key={sample.id} className="bg-white rounded-xl p-3 shadow-sm flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 line-clamp-2">{sample.preview}...</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(sample.created_at).toLocaleDateString("zh-CN")}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteSample(sample.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-4 bg-white rounded-2xl p-6 text-center shadow-sm">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-sm text-gray-500">还没有样本</p>
              <p className="text-xs text-gray-400 mt-1">添加 3-5 条历史报价效果最佳</p>
            </div>
          )}

          {/* 提取按钮 */}
          <div className="mx-4 mb-6">
            <button
              onClick={handleExtract}
              disabled={extracting || samples.length === 0}
              className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all ${
                samples.length > 0
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-blue-200"
                  : "bg-gray-100 text-gray-400"
              } disabled:opacity-60`}
            >
              {extracting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  AI 正在分析你的风格...
                </span>
              ) : (
                `✨ 开始 AI 风格提取（${samples.length} 条样本）`
              )}
            </button>
            {samples.length > 0 && samples.length < 3 && (
              <p className="text-xs text-amber-600 text-center mt-2">建议添加 3 条以上样本，效果更准确</p>
            )}
          </div>
        </div>
      ) : (
        /* 风格档案 Tab */
        <div className="flex-1 overflow-y-auto">
          {hasProfile && profile ? (
            <div className="m-4 space-y-3">
              {/* 风格总结 */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎯</span>
                  <p className="text-sm font-bold text-gray-800">你的风格档案</p>
                  {profile.sample_count && (
                    <span className="ml-auto text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                      基于 {profile.sample_count} 条样本
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{profile.summary}</p>
              </div>

              {/* 详细字段 */}
              {[
                { icon: "💬", label: "语气风格", value: profile.tone },
                { icon: "👋", label: "常用开场白", value: profile.greeting },
                { icon: "🤝", label: "常用结尾", value: profile.closing },
                { icon: "💰", label: "报价策略", value: profile.pricing_approach },
                { icon: "📞", label: "跟进风格", value: profile.followup_style },
              ].map(({ icon, label, value }) => (
                value ? (
                  <div key={label} className="bg-white rounded-xl p-3.5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{icon}</span>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                    </div>
                    <p className="text-sm text-gray-800">{value}</p>
                  </div>
                ) : null
              ))}

              {/* 常用短语 */}
              {(profile.keyPhrases ?? (profile.key_phrases ? JSON.parse(profile.key_phrases) : [])).length > 0 && (
                <div className="bg-white rounded-xl p-3.5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">✍️</span>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">常用短语</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(profile.keyPhrases ?? JSON.parse(profile.key_phrases ?? "[]")).map((phrase: string) => (
                      <span key={phrase} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                        {phrase}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 更新时间 */}
              {profile.updated_at && (
                <p className="text-xs text-gray-400 text-center">
                  最后更新：{new Date(profile.updated_at).toLocaleString("zh-CN")}
                </p>
              )}

              {/* 重置按钮 */}
              <button
                onClick={handleReset}
                className="w-full py-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl"
              >
                重置风格档案
              </button>
            </div>
          ) : (
            <div className="m-4 bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="text-4xl mb-3">🤖</div>
              <p className="text-sm font-semibold text-gray-800 mb-1">还没有风格档案</p>
              <p className="text-xs text-gray-500 mb-4">先在"样本库"添加历史报价，然后点击"AI 风格提取"</p>
              <button
                onClick={() => setActiveTab("samples")}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl"
              >
                去添加样本
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
