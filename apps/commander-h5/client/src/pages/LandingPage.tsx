/* ============================================================
   DESIGN: Night Commander — Landing Page
   Entry point showing both Phone & Web prototypes
   ============================================================ */
import { useLocation } from "wouter";
import { Smartphone, Monitor, ArrowRight, Zap } from "lucide-react";

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{
        background: "linear-gradient(135deg, oklch(0.14 0.02 250) 0%, oklch(0.10 0.03 260) 100%)",
      }}
    >
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("https://private-us-east-1.manuscdn.com/sessionFile/OUFRGTnvXc7idsP6wlTJyG/sandbox/zgxix9H7CNx009Vt9J6lh6-img-1_1772161474000_na1fn_Y29tbWFuZGVyX2hlcm9fYmc.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvT1VGUkdUbnZYYzdpZHNQNndsVEp5Ry9zYW5kYm94L3pneGl4OUg3Q054MDA5VnQ5SjZsaDYtaW1nLTFfMTc3MjE2MTQ3NDAwMF9uYTFmbl9ZMjl0YldGdVpHVnlYMmhsY205ZlltYy5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=TMO41Corg3sx3h10~CnG1j~yeX-suBVDw2tH59b7w4D8wVKThvqPXHkXUYv5o0p0M6LYz0Of21Cm31c1OYec6smZSRbfbzHOC5~puMun2cYL2Oh8PVmXMHrG4RejI4B9TgXeieEmRwle2JZ5FeLJ3FPf1Q5SRrL6asRNgZ3RgQZBYZAYc5fln6sHZNPQ1zHpwfUUXgvAcI13NnAluZEBB85sBmn~JvOGtTGROqbjNw8J16CMQ9HgFL4h0RDEbBw7VNVPsIDJ-5m2btTre4ExThNoi6CiaBL9-OfRxxbp~VdjdNMJf8y5h6DTdaW9x08hqBPhysefp1~f3LZ9g567OA__")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-medium text-orange-400 tracking-wider uppercase">RealSourcing 5.0 原型</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            指挥官系统
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md mx-auto">
            数字资产托管 · 海外市场增长服务<br />
            为中国中小企业主打造的海外增长合伙人
          </p>
        </div>

        {/* Two prototype cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Phone prototype */}
          <button
            onClick={() => navigate("/phone")}
            className="group relative p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-orange-500/40 transition-all duration-300 text-left"
            style={{ backdropFilter: "blur(12px)" }}
          >
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4 group-hover:bg-orange-500/30 transition-colors">
              <Smartphone className="w-6 h-6 text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              指挥官手机端
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              老板专属的傻瓜式指挥台，微信通知 + 一键发起任务，掌控全局增长战报
            </p>
            <div className="flex items-center gap-1.5 text-orange-400 text-sm font-medium">
              <span>查看原型</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ boxShadow: "inset 0 0 30px oklch(0.70 0.18 40 / 8%)" }} />
          </button>

          {/* Web prototype */}
          <button
            onClick={() => navigate("/web")}
            className="group relative p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-teal-500/40 transition-all duration-300 text-left"
            style={{ backdropFilter: "blur(12px)" }}
          >
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center mb-4 group-hover:bg-teal-500/30 transition-colors">
              <Monitor className="w-6 h-6 text-teal-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Web 管理端
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              数字资产仪表盘 + 增长报告，全局视野下的深度分析和团队管理
            </p>
            <div className="flex items-center gap-1.5 text-teal-400 text-sm font-medium">
              <span>查看原型</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ boxShadow: "inset 0 0 30px oklch(0.72 0.14 168 / 8%)" }} />
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-8">
          RealSourcing 5.0 · 交互原型 · 仅供内部评审
        </p>
      </div>
    </div>
  );
}
