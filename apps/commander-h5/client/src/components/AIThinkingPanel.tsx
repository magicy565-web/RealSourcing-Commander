/**
 * Commander 5.0 Phase 3 — M4 AI 思考过程可视化组件
 * 展示 AI 分析询盘时的思考链路（Chain of Thought）
 * 用于询盘详情页，展示 AI 如何分析买家意图
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ThinkingStep {
  id: string;
  phase: "parsing" | "scoring" | "drafting" | "translating" | "done";
  title: string;
  content: string;
  duration?: number; // ms
  status: "pending" | "running" | "done" | "error";
  result?: string;
}

interface AIThinkingPanelProps {
  steps: ThinkingStep[];
  isRunning: boolean;
  totalDuration?: number;
  creditsUsed?: number;
  styleUsed?: boolean;
  onClose?: () => void;
}

// ─── 阶段图标 ─────────────────────────────────────────────────
const PHASE_ICON: Record<ThinkingStep["phase"], string> = {
  parsing: "🔍",
  scoring: "📊",
  drafting: "✍️",
  translating: "🌐",
  done: "✅",
};

// ─── 阶段颜色 ─────────────────────────────────────────────────
const PHASE_COLOR: Record<ThinkingStep["phase"], string> = {
  parsing: "text-blue-600 bg-blue-50 border-blue-200",
  scoring: "text-amber-600 bg-amber-50 border-amber-200",
  drafting: "text-purple-600 bg-purple-50 border-purple-200",
  translating: "text-green-600 bg-green-50 border-green-200",
  done: "text-gray-600 bg-gray-50 border-gray-200",
};

// ─── 打字机效果 Hook ──────────────────────────────────────────
function useTypewriter(text: string, speed = 20, enabled = true) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      return;
    }
    setDisplayed("");
    indexRef.current = 0;
    if (!text) return;

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1));
        indexRef.current += 1;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  return displayed;
}

// ─── 单步骤卡片 ───────────────────────────────────────────────
function ThinkingStepCard({ step, isActive }: { step: ThinkingStep; isActive: boolean }) {
  const typewriterContent = useTypewriter(
    step.content,
    15,
    isActive && step.status === "running"
  );

  const displayContent =
    step.status === "running" && isActive ? typewriterContent : step.content;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`border rounded-xl p-3 mb-2 ${PHASE_COLOR[step.phase]}`}
    >
      <div className="flex items-start gap-2">
        {/* 状态指示器 */}
        <div className="shrink-0 mt-0.5">
          {step.status === "running" ? (
            <span className="flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute h-3 w-3 rounded-full bg-indigo-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-indigo-500" />
            </span>
          ) : step.status === "done" ? (
            <span className="text-sm">{PHASE_ICON[step.phase]}</span>
          ) : step.status === "error" ? (
            <span className="text-sm">❌</span>
          ) : (
            <span className="h-4 w-4 rounded-full border-2 border-current opacity-30 inline-block" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{step.title}</span>
            {step.duration && step.status === "done" && (
              <span className="text-xs opacity-60">{step.duration}ms</span>
            )}
          </div>

          {(step.status === "running" || step.status === "done") && (
            <p className="text-xs mt-1 opacity-80 leading-relaxed whitespace-pre-wrap">
              {displayContent}
              {step.status === "running" && isActive && (
                <span className="inline-block w-0.5 h-3 bg-current ml-0.5 animate-pulse" />
              )}
            </p>
          )}

          {step.result && step.status === "done" && (
            <div className="mt-1.5 bg-white/60 rounded-lg p-2">
              <p className="text-xs font-medium opacity-90">→ {step.result}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────
export default function AIThinkingPanel({
  steps,
  isRunning,
  totalDuration,
  creditsUsed,
  styleUsed,
  onClose,
}: AIThinkingPanelProps) {
  const activeStepIndex = steps.findIndex((s) => s.status === "running");
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progress = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-400 animate-pulse" : "bg-white/60"}`} />
            <span className="text-white font-semibold text-sm">AI 思考过程</span>
          </div>
          <div className="flex items-center gap-2">
            {creditsUsed !== undefined && (
              <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                -{creditsUsed} 积分
              </span>
            )}
            {styleUsed && (
              <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
                ✦ 风格档案
              </span>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-white/60">
            {isRunning ? `分析中 ${doneCount}/${steps.length}` : `已完成 ${doneCount}/${steps.length}`}
          </span>
          {totalDuration && (
            <span className="text-xs text-white/60">{(totalDuration / 1000).toFixed(1)}s</span>
          )}
        </div>
      </div>

      {/* 步骤列表 */}
      <div className="p-3 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {steps.map((step, idx) => (
            <ThinkingStepCard
              key={step.id}
              step={step}
              isActive={idx === activeStepIndex}
            />
          ))}
        </AnimatePresence>

        {steps.length === 0 && (
          <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
            等待 AI 分析...
          </div>
        )}
      </div>

      {/* 底部状态 */}
      {!isRunning && doneCount === steps.length && steps.length > 0 && (
        <div className="px-4 py-2 bg-green-50 border-t border-green-100 flex items-center gap-2">
          <span className="text-green-500 text-sm">✓</span>
          <span className="text-xs text-green-700 font-medium">AI 分析完成，草稿已生成</span>
        </div>
      )}
    </div>
  );
}

// ─── 工厂函数：从 AI 响应生成思考步骤 ────────────────────────
export function buildThinkingSteps(opts: {
  hasRawContent: boolean;
  hasBuyerInfo: boolean;
  styleUsed: boolean;
}): ThinkingStep[] {
  const steps: ThinkingStep[] = [
    {
      id: "parse",
      phase: "parsing",
      title: "解析询盘内容",
      content: opts.hasRawContent
        ? "正在提取买家原文中的关键信息：产品需求、数量、认证要求、交货条款..."
        : "正在分析买家基本信息：公司名称、国家、产品品类...",
      status: "pending",
    },
    {
      id: "score",
      phase: "scoring",
      title: "评估买家意向度",
      content: "综合渠道权重、内容质量、买家完整度三个维度，计算置信度评分...",
      status: "pending",
    },
    {
      id: "draft",
      phase: "drafting",
      title: "生成中文回复草稿",
      content: opts.styleUsed
        ? "已加载您的风格档案，正在按照您的沟通风格生成个性化回复..."
        : "正在生成专业的外贸回复草稿，包含问候语、产品介绍、报价邀约...",
      status: "pending",
    },
    {
      id: "translate",
      phase: "translating",
      title: "翻译为英文",
      content: "将中文草稿翻译为地道的商务英文，适配买家所在地区的表达习惯...",
      status: "pending",
    },
  ];
  return steps;
}

// ─── Hook：模拟 AI 思考动画 ───────────────────────────────────
export function useAIThinking(trigger: boolean) {
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | undefined>();

  useEffect(() => {
    if (!trigger) return;

    const initialSteps = buildThinkingSteps({
      hasRawContent: true,
      hasBuyerInfo: true,
      styleUsed: false,
    });

    setSteps(initialSteps.map((s) => ({ ...s, status: "pending" })));
    setIsRunning(true);
    setStartTime(Date.now());
    setTotalDuration(undefined);

    const STEP_DURATIONS = [800, 600, 1200, 500];

    let currentIdx = 0;
    const runStep = () => {
      if (currentIdx >= initialSteps.length) {
        setIsRunning(false);
        setTotalDuration(Date.now() - (startTime ?? Date.now()));
        return;
      }

      // 设置当前步骤为 running
      setSteps((prev) =>
        prev.map((s, i) =>
          i === currentIdx ? { ...s, status: "running" } : s
        )
      );

      setTimeout(() => {
        // 设置当前步骤为 done
        const duration = STEP_DURATIONS[currentIdx] ?? 800;
        setSteps((prev) =>
          prev.map((s, i) =>
            i === currentIdx
              ? {
                  ...s,
                  status: "done",
                  duration,
                  result: getStepResult(i),
                }
              : s
          )
        );
        currentIdx += 1;
        setTimeout(runStep, 200);
      }, STEP_DURATIONS[currentIdx] ?? 800);
    };

    setTimeout(runStep, 300);
  }, [trigger]);

  return { steps, isRunning, totalDuration };
}

function getStepResult(stepIndex: number): string {
  const results = [
    "识别到产品需求、数量、认证要求",
    "置信度 82 分，判定为高意向买家",
    "草稿已生成（商务友好型）",
    "英文版本已生成",
  ];
  return results[stepIndex] ?? "";
}
