import { useState, useEffect, useRef } from 'react';
import { bossApi, openclawApi } from '../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBar() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const upd = () => {
      const n = new Date();
      setTime(n.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    upd();
    const iv = setInterval(upd, 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="flex items-center justify-between px-6 pt-2 pb-1 relative z-50" style={{ height: 44 }}>
      <span className="text-white text-[15px] font-semibold tabular-nums tracking-tight">{time}</span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
          <rect x="0" y="8" width="3" height="4" rx="0.5" fill="white" />
          <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="white" />
          <rect x="9" y="2.5" width="3" height="9.5" rx="0.5" fill="white" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="white" opacity="0.35" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <circle cx="8" cy="11" r="1.5" fill="white" />
          <path d="M4.5 7.5C5.5 6.3 6.7 5.5 8 5.5s2.5.8 3.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M1.5 4.5C3.2 2.5 5.5 1.2 8 1.2s4.8 1.3 6.5 3.3" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />
        </svg>
        <div style={{ width: 25, height: 12, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 3, border: '1.5px solid rgba(255,255,255,0.6)' }} />
          <div style={{ position: 'absolute', left: 2, top: 2, bottom: 2, width: '75%', background: 'white', borderRadius: 1.5 }} />
          <div style={{ position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)', width: 2, height: 5, background: 'rgba(255,255,255,0.4)', borderRadius: '0 1px 1px 0' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BossWarroom() {
  const [data, setData] = useState<any>(null);
  const [openclawData, setOpenclawData] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res, ocRes] = await Promise.all([
          bossApi.getWarroomData(),
          openclawApi.getStatus()
        ]);
        setData(res);
        setOpenclawData(ocRes);
      } catch (e) {
        console.error('Fetch error:', e);
      }
    };
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  const inquiries = data?.signals?.newInquiries ?? 12;
  const completedTasks = openclawData?.opsToday ?? 5;
  const notifications = 8;
  const otherMessages = 3;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col font-sans overflow-hidden">
      <StatusBar />

      {/* Main Bento Grid Area */}
      <div className="flex-1 px-4 pt-2 pb-4 flex flex-col gap-3 overflow-y-auto no-scrollbar">
        
        {/* Top Large Bento: OpenClaw Core */}
        <div className="relative rounded-[32px] p-6 overflow-hidden border border-white/5" style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          minHeight: '380px'
        }}>
          {/* Background Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/10 blur-[80px] pointer-events-none" />
          
          {/* Header Info */}
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-white/40">9:41</span>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </div>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-tighter">Openclaw</span>
              </div>
            </div>
          </div>

          {/* Floating Status Bubbles - Fixed within container */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* 12 未回复消息 */}
            <div className="absolute top-[15%] left-[10%] flex flex-col items-center gap-1 animate-float-slow">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <span className="text-lg">✉️</span>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-black/40 border border-white/5 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-yellow-500/90">【{inquiries} 未回复消息】</span>
              </div>
            </div>

            {/* 5 已完成任务 */}
            <div className="absolute top-[12%] right-[10%] flex flex-col items-center gap-1 animate-float-medium">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <span className="text-lg">📋</span>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-black/40 border border-white/5 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-white/80">【{completedTasks} 已完成任务】</span>
              </div>
            </div>

            {/* 8 消息通知 */}
            <div className="absolute bottom-[25%] left-[12%] flex flex-col items-center gap-1 animate-float-fast">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <span className="text-lg">🔔</span>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#0A0A0F]">
                  <span className="text-[8px] font-bold">1</span>
                </div>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-black/40 border border-white/5 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-white/80">【{notifications} 消息通知】</span>
              </div>
            </div>

            {/* 3 其他未确认消息 */}
            <div className="absolute bottom-[20%] right-[12%] flex flex-col items-center gap-1 animate-float-slow">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <span className="text-lg">💬</span>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-black/40 border border-white/5 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-yellow-500/90">【{otherMessages} 其他未确认消息】</span>
              </div>
            </div>
          </div>

          {/* Central Mascot: Red Crab Robot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 flex items-center justify-center z-20">
            <div className="relative w-full h-full">
              {/* Pulse effect */}
              <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping-slow" />
              <img 
                src="/assets/images/openclaw-mascot.png" 
                alt="OpenClaw Mascot" 
                className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(239,68,68,0.3)]"
              />
            </div>
          </div>
        </div>

        {/* Middle Row: Platform Stats */}
        <div className="grid grid-cols-2 gap-3">
          {/* TikTok Card */}
          <div className="rounded-[28px] p-5 border border-white/5 flex flex-col items-center justify-center gap-3 relative overflow-hidden" style={{
            background: 'linear-gradient(145deg, #12121A 0%, #0A0A0F 100%)',
            height: '160px'
          }}>
            <div className="w-10 h-10 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.47-1.26-.91-2.22-2.19-2.68-3.65-.03 2.53-.02 5.07-.02 7.6 0 1.78-.37 3.56-1.1 5.16-1.41 3.05-4.77 5.08-8.11 4.95-2.99-.11-5.7-2.14-6.74-4.93-.4-.99-.58-2.06-.55-3.12.05-2.53 1.28-4.92 3.33-6.39 1.54-1.14 3.5-1.67 5.4-.1.07.05.13.12.2.17v4.29c-.58-.46-1.3-.73-2.05-.65-.82.07-1.66.47-2.16 1.13-.53.66-.76 1.54-.69 2.38.06.75.43 1.47 1.03 1.92.62.48 1.41.64 2.19.55.82-.08 1.54-.54 1.97-1.22.33-.51.48-1.13.47-1.74.01-4.34 0-8.67.01-13.01z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-white/40 font-medium">抖音：【<span className="text-yellow-500/90">210</span></p>
              <p className="text-[11px] text-white/40 font-medium">条消息】</p>
            </div>
          </div>

          {/* Meta Card */}
          <div className="rounded-[28px] p-5 border border-white/5 flex flex-col items-center justify-center gap-3 relative overflow-hidden" style={{
            background: 'linear-gradient(145deg, #F0F0F0 0%, #FFFFFF 100%)',
            height: '160px'
          }}>
            <div className="w-10 h-10 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="#0668E1">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-black/40 font-medium">Meta：【<span className="text-yellow-600/90">145</span></p>
              <p className="text-[11px] text-black/40 font-medium">条消息】</p>
            </div>
            {/* Right Arrow Overlay */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">
              <span className="text-[10px] text-black/40">❯</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: AI Conversation Area */}
        <div className="rounded-[28px] p-4 border border-white/5 flex flex-col gap-3 relative overflow-hidden" style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          minHeight: '120px'
        }}>
          {/* AI Dialogue Bubbles */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-end">
              <div className="px-4 py-2 rounded-2xl bg-blue-500/20 border border-blue-500/20 max-w-[80%]">
                <div className="h-2 w-32 bg-blue-400/30 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="flex justify-start items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-white/40" />
              </div>
              <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/5 flex gap-1">
                <div className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
            <div className="flex justify-end">
              <div className="px-4 py-2 rounded-2xl bg-blue-500/20 border border-blue-500/20 max-w-[80%]">
                <div className="h-2 w-24 bg-blue-400/30 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Bar */}
      <div className="px-4 pb-8 pt-2 bg-gradient-to-t from-[#0A0A0F] to-transparent">
        <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
          <div className="w-6 h-6 flex items-center justify-center text-white/40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <input 
            type="text" 
            placeholder="晚安，需要我帮你做什么？" 
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-white/80 placeholder:text-white/30"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.2; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 4s ease-in-out infinite; }
        .animate-float-fast { animation: float-fast 3s ease-in-out infinite; }
        .animate-ping-slow { animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
