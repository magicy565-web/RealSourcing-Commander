/**
 * Commander 5.0 — 登录页
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Zap, Shield, Globe } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("admin@minghui.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.login(email, password);
      toast.success("登录成功，欢迎使用 Commander！");
      navigate("/boss-warroom");
    } catch (err: any) {
      toast.error(err.message ?? "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "oklch(0.12 0.02 250)" }}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.2 250), transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.2 200), transparent)" }} />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "oklch(0.25 0.05 250)" }}>
            <Zap className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Commander</h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.65 0.05 250)" }}>
            RealSourcing 5.0 — 海外市场增长指挥台
          </p>
        </div>

        {/* 登录卡片 */}
        <div className="rounded-2xl p-6 border"
          style={{
            background: "oklch(0.18 0.03 250)",
            borderColor: "oklch(0.28 0.04 250)",
          }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5"
                style={{ color: "oklch(0.65 0.05 250)" }}>
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-colors"
                style={{
                  background: "oklch(0.22 0.03 250)",
                  border: "1px solid oklch(0.32 0.04 250)",
                }}
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5"
                style={{ color: "oklch(0.65 0.05 250)" }}>
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-colors"
                style={{
                  background: "oklch(0.22 0.03 250)",
                  border: "1px solid oklch(0.32 0.04 250)",
                }}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{ background: "oklch(0.55 0.18 250)" }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 登录中...</>
              ) : (
                "登录 Commander"
              )}
            </button>
          </form>

          {/* 演示账号提示 */}
          <div className="mt-4 p-3 rounded-xl text-xs"
            style={{
              background: "oklch(0.22 0.03 250)",
              color: "oklch(0.65 0.05 250)",
            }}>
            <p className="font-medium mb-1" style={{ color: "oklch(0.75 0.05 250)" }}>演示账号</p>
            <p>邮箱：admin@minghui.com</p>
            <p>密码：admin123</p>
          </div>
        </div>

        {/* 功能亮点 */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: <Zap className="w-4 h-4 text-yellow-400" />, label: "AI 询盘处理" },
            { icon: <Globe className="w-4 h-4 text-blue-400" />, label: "多渠道管理" },
            { icon: <Shield className="w-4 h-4 text-green-400" />, label: "OpenClaw 自动化" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-xl"
              style={{ background: "oklch(0.18 0.03 250)" }}>
              {item.icon}
              <span className="text-xs text-center" style={{ color: "oklch(0.6 0.05 250)" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
