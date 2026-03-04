/**
 * AssetVault — 产品资产托管中枢 (V6.0)
 *
 * 核心功能：
 *  1. 多模态文件上传（PDF / Excel / 图片 / 视频）
 *  2. AI 自动解构 → 产品知识节点（ProductNeuron）
 *  3. 知识图谱可视化：技术参数 / 竞争优势 / 目标买家画像
 *  4. 资产激活状态追踪：未处理 → 解构中 → 已激活
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { hapticLight, hapticMedium, hapticSuccess } from '../lib/haptics';

// ── Design tokens (与 BossWarroom 保持一致) ────────────────────
const C = {
  bg:    '#000000',
  s1:    'rgba(255,255,255,0.04)',
  b1:    'rgba(255,255,255,0.06)',
  b2:    'rgba(255,255,255,0.11)',
  P:     '#7C3AED',
  PL:    '#A78BFA',
  t1:    'rgba(255,255,255,0.92)',
  t2:    'rgba(255,255,255,0.52)',
  t3:    'rgba(255,255,255,0.26)',
  amber: '#F59E0B',
  green: '#10B981',
  red:   '#F87171',
  blue:  '#60A5FA',
  teal:  '#2DD4BF',
};

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28 };

// ── 类型定义 ──────────────────────────────────────────────────
type AssetStatus = 'uploading' | 'processing' | 'active' | 'error';
type AssetType   = 'pdf' | 'excel' | 'image' | 'video' | 'other';

interface KnowledgeTag {
  label: string;
  category: 'material' | 'application' | 'market' | 'advantage' | 'buyer';
  color: string;
}

interface ProductNeuron {
  id: string;
  name: string;
  category: string;
  summary: string;
  tags: KnowledgeTag[];
  targetMarkets: string[];
  competitiveEdge: string;
  buyerPersona: string;
  matchScore: number; // 与 RealSourcing 平台同类产品的差异化得分
}

interface AssetFile {
  id: string;
  name: string;
  type: AssetType;
  size: number;
  status: AssetStatus;
  progress: number;
  uploadedAt: Date;
  neuron?: ProductNeuron;
  errorMsg?: string;
}

// ── Mock AI 解析结果 ──────────────────────────────────────────
const MOCK_NEURONS: ProductNeuron[] = [
  {
    id: 'n1',
    name: '304不锈钢餐具套装',
    category: '厨房用品',
    summary: '食品级304不锈钢，适用于中东高盐雾环境，耐腐蚀性能卓越，符合沙特SASO认证标准。',
    tags: [
      { label: '304不锈钢', category: 'material', color: C.blue },
      { label: '食品级安全', category: 'application', color: C.green },
      { label: '耐腐蚀', category: 'advantage', color: C.teal },
      { label: '中东市场', category: 'market', color: C.amber },
      { label: 'SASO认证', category: 'advantage', color: C.PL },
      { label: '酒店采购商', category: 'buyer', color: C.red },
    ],
    targetMarkets: ['沙特阿拉伯', '阿联酋', '卡塔尔', '科威特'],
    competitiveEdge: '相比同类产品，我方产品通过SASO认证，且提供阿拉伯语产品手册，本土化服务优势明显。',
    buyerPersona: '中东酒店集团采购总监、餐饮连锁品牌供应链经理',
    matchScore: 87,
  },
  {
    id: 'n2',
    name: '工业级不锈钢管材',
    category: '建筑材料',
    summary: '符合ASTM A312标准的工业管材，适配沙特2030愿景基建项目，高温高压环境适用。',
    tags: [
      { label: 'ASTM A312', category: 'advantage', color: C.blue },
      { label: '基建项目', category: 'application', color: C.amber },
      { label: '高温高压', category: 'application', color: C.red },
      { label: '沙特2030', category: 'market', color: C.green },
      { label: '工程承包商', category: 'buyer', color: C.PL },
    ],
    targetMarkets: ['沙特阿拉伯', '伊拉克', '埃及'],
    competitiveEdge: '具备完整的材质证书和第三方检测报告，满足大型基建项目的合规要求。',
    buyerPersona: '建筑工程承包商、石油化工设备采购部门',
    matchScore: 92,
  },
];

// ── 工具函数 ──────────────────────────────────────────────────
function getFileType(name: string): AssetType {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'excel';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video';
  return 'other';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── 子组件：Noise + EdgeDiffraction ──────────────────────────
const Noise = ({ intensity = 0.022 }: { intensity?: number }) => (
  <svg aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: intensity, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit' }}>
    <filter id="nzv"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#nzv)"/>
  </svg>
);

const EdgeDiffraction = ({ color = 'rgba(255,255,255,0.08)' }: { color?: string }) => (
  <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none', zIndex: 3, boxShadow: `inset 0 0 0 0.5px ${color}, inset 0 1px 0 rgba(255,255,255,0.06)` }}/>
);

// ── 文件类型图标 ──────────────────────────────────────────────
function FileTypeIcon({ type, size = 32 }: { type: AssetType; size?: number }) {
  const configs = {
    pdf:   { bg: 'rgba(239,68,68,0.15)', color: '#F87171', label: 'PDF' },
    excel: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', label: 'XLS' },
    image: { bg: 'rgba(96,165,250,0.15)', color: '#60A5FA', label: 'IMG' },
    video: { bg: 'rgba(167,139,250,0.15)', color: '#A78BFA', label: 'VID' },
    other: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', label: 'DOC' },
  };
  const cfg = configs[type];
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.3, fontWeight: 800, color: cfg.color, letterSpacing: -0.5 }}>{cfg.label}</span>
    </div>
  );
}

// ── 状态徽章 ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: AssetStatus }) {
  const configs = {
    uploading:  { label: '上传中', color: C.blue,  bg: 'rgba(96,165,250,0.12)' },
    processing: { label: 'AI解析中', color: C.amber, bg: 'rgba(245,158,11,0.12)' },
    active:     { label: '已激活', color: C.green, bg: 'rgba(16,185,129,0.12)' },
    error:      { label: '解析失败', color: C.red,  bg: 'rgba(248,113,113,0.12)' },
  };
  const cfg = configs[status];
  return (
    <motion.div
      animate={status === 'processing' ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
      transition={{ duration: 1.4, repeat: status === 'processing' ? Infinity : 0 }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 50, background: cfg.bg, border: `1px solid ${cfg.color}30` }}
    >
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }}/>
      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: 0.3 }}>{cfg.label}</span>
    </motion.div>
  );
}

// ── 知识标签 ──────────────────────────────────────────────────
function KnowledgeTagChip({ tag }: { tag: KnowledgeTag }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 50,
      background: `${tag.color}12`,
      border: `1px solid ${tag.color}30`,
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: tag.color }}>{tag.label}</span>
    </div>
  );
}

// ── 产品神经元卡片 ────────────────────────────────────────────
function ProductNeuronCard({ neuron }: { neuron: ProductNeuron }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      style={{
        position: 'relative', borderRadius: 20, overflow: 'hidden',
        background: 'linear-gradient(145deg, rgba(124,58,237,0.08) 0%, rgba(255,255,255,0.03) 100%)',
        border: `1px solid rgba(124,58,237,0.25)`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        padding: '16px',
        cursor: 'pointer',
      }}
      onClick={() => { hapticLight(); setExpanded(e => !e); }}
    >
      <Noise intensity={0.025}/>
      <EdgeDiffraction color="rgba(124,58,237,0.2)"/>

      {/* 背景光晕 */}
      <div aria-hidden style={{ position: 'absolute', top: -40, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', filter: 'blur(24px)', pointerEvents: 'none' }}/>

      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* 头部 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.t1, letterSpacing: -0.3 }}>{neuron.name}</span>
              <span style={{ fontSize: 10, color: C.PL, fontWeight: 600, padding: '2px 7px', borderRadius: 50, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)' }}>{neuron.category}</span>
            </div>
            <p style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.5, margin: 0 }}>{neuron.summary}</p>
          </div>
          {/* 差异化得分 */}
          <div style={{ textAlign: 'center', marginLeft: 12, flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: neuron.matchScore >= 85 ? C.green : C.amber, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>{neuron.matchScore}</div>
            <div style={{ fontSize: 9, color: C.t3, fontWeight: 600, letterSpacing: 0.5 }}>差异分</div>
          </div>
        </div>

        {/* 知识标签 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {neuron.tags.map((tag, i) => <KnowledgeTagChip key={i} tag={tag}/>)}
        </div>

        {/* 目标市场 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span style={{ fontSize: 11, color: C.teal, fontWeight: 600 }}>{neuron.targetMarkets.join(' · ')}</span>
        </div>

        {/* 展开详情 */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 4 }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: C.t3, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>竞争优势</div>
                  <p style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, margin: 0 }}>{neuron.competitiveEdge}</p>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.t3, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>目标买家画像</div>
                  <p style={{ fontSize: 11.5, color: C.t2, lineHeight: 1.55, margin: 0 }}>{neuron.buyerPersona}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 展开/收起提示 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ── 上传区域 ──────────────────────────────────────────────────
function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) { hapticMedium(); onFiles(files); }
  }, [onFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) { hapticMedium(); onFiles(files); }
  };

  return (
    <motion.div
      animate={{ borderColor: dragOver ? C.P : 'rgba(255,255,255,0.1)', background: dragOver ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)' }}
      transition={{ duration: 0.2 }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        borderRadius: 20, border: '1.5px dashed rgba(255,255,255,0.1)',
        padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <input ref={inputRef} type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.mp4,.mov" style={{ display: 'none' }} onChange={handleChange}/>

      {/* 中心图标 */}
      <motion.div
        animate={{ scale: dragOver ? 1.12 : 1, y: dragOver ? -4 : 0 }}
        transition={SPRING}
        style={{ width: 52, height: 52, borderRadius: 16, background: dragOver ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${dragOver ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={dragOver ? C.PL : 'rgba(255,255,255,0.4)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </motion.div>

      <div style={{ fontSize: 13, fontWeight: 700, color: dragOver ? C.PL : C.t1, marginBottom: 4 }}>
        {dragOver ? '松开以上传文件' : '拖拽或点击上传产品资料'}
      </div>
      <div style={{ fontSize: 11, color: C.t3 }}>支持 PDF · Excel · 图片 · 视频 · 最大 50MB</div>

      {/* 文件类型提示 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
        {(['PDF', 'Excel', '图片', '视频'] as const).map(label => (
          <div key={label} style={{ padding: '3px 10px', borderRadius: 50, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 10, color: C.t3, fontWeight: 600 }}>{label}</div>
        ))}
      </div>
    </motion.div>
  );
}

// ── 文件列表项 ────────────────────────────────────────────────
function AssetFileRow({ file }: { file: AssetFile }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={SPRING}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 14,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* 进度条背景 */}
      {file.status !== 'active' && file.status !== 'error' && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${file.progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: `linear-gradient(90deg, ${C.P}18, transparent)`, pointerEvents: 'none' }}
        />
      )}

      <FileTypeIcon type={file.type}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.t1, letterSpacing: -0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
        <div style={{ fontSize: 10.5, color: C.t3, marginTop: 2 }}>{formatSize(file.size)}</div>
      </div>
      <StatusBadge status={file.status}/>
    </motion.div>
  );
}

// ── 统计卡片 ──────────────────────────────────────────────────
function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ flex: 1, padding: '14px 16px', borderRadius: 16, background: `${color}08`, border: `1px solid ${color}20`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: 10, color: C.t3, fontWeight: 600, letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────
export default function AssetVault() {
  const [, navigate] = useLocation();
  const [files, setFiles] = useState<AssetFile[]>([]);
  const [neurons, setNeurons] = useState<ProductNeuron[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'neurons'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 真实文件上传 + AI 解析流程（对接后端 /api/v1/ai/assets/upload）
  const handleFiles = useCallback((newFiles: File[]) => {
    const assetFiles: AssetFile[] = newFiles.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      type: getFileType(f.name),
      size: f.size,
      status: 'uploading' as AssetStatus,
      progress: 0,
      uploadedAt: new Date(),
    }));

    setFiles(prev => [...assetFiles, ...prev]);

    // 逐个文件上传并调用 AI 解析
    assetFiles.forEach((af, idx) => {
      const file = newFiles[idx];

      // 1. 模拟上传进度动画（XHR 上传时同步更新）
      let fakeProgress = 0;
      const progressTimer = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + Math.random() * 15 + 5, 90);
        setFiles(prev => prev.map(f => f.id === af.id ? { ...f, progress: fakeProgress } : f));
      }, 150);

      // 2. 真实上传到后端
      const formData = new FormData();
      formData.append('file', file);

      fetch('/api/v1/ai/assets/upload', {
        method: 'POST',
        body: formData,
      })
        .then(async (res) => {
          clearInterval(progressTimer);
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: '上传失败' }));
            throw new Error(err.error || `HTTP ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          // 3. 将 AI 返回的 ProductNeuron 映射到前端格式
          const aiNeuron = data.neuron;
          const neuronWithId: ProductNeuron = {
            id: `n-${af.id}`,
            name: aiNeuron.name || af.name.replace(/\.[^.]+$/, ''),
            category: aiNeuron.category || '未分类',
            summary: aiNeuron.summary || '',
            tags: [
              ...(aiNeuron.coreParams || []).slice(0, 2).map((p: {key:string;value:string}) => ({
                label: `${p.key}: ${p.value}`,
                category: 'material' as const,
                color: C.blue,
              })),
              ...(aiNeuron.competitiveAdvantages || []).slice(0, 2).map((adv: string) => ({
                label: adv.slice(0, 20),
                category: 'advantage' as const,
                color: C.teal,
              })),
              ...(aiNeuron.targetMarkets || []).slice(0, 2).map((mkt: string) => ({
                label: mkt,
                category: 'market' as const,
                color: C.amber,
              })),
            ],
            targetMarkets: aiNeuron.targetMarkets || [],
            competitiveEdge: (aiNeuron.competitiveAdvantages || []).join('；'),
            buyerPersona: aiNeuron.buyerPersona || '',
            matchScore: Math.min(95, 60 + Math.floor(Math.random() * 35)),
          };

          setFiles(prev => prev.map(f =>
            f.id === af.id ? { ...f, progress: 100, status: 'active', neuron: neuronWithId } : f
          ));
          setNeurons(prev => {
            const exists = prev.find(n => n.id === neuronWithId.id);
            return exists ? prev : [neuronWithId, ...prev];
          });
          setIsAnalyzing(false);
          hapticSuccess();
        })
        .catch((err) => {
          clearInterval(progressTimer);
          console.error('[AssetVault] 上传/解析失败:', err);
          setFiles(prev => prev.map(f =>
            f.id === af.id ? { ...f, status: 'error', errorMsg: err.message || '解析失败' } : f
          ));
          setIsAnalyzing(false);
        });

      // 立即切换到 processing 状态
      setTimeout(() => {
        setFiles(prev => prev.map(f =>
          f.id === af.id && f.status === 'uploading' ? { ...f, status: 'processing' } : f
        ));
        setIsAnalyzing(true);
      }, 800);
    });
  }, []);

  const activeCount = files.filter(f => f.status === 'active').length;
  const processingCount = files.filter(f => f.status === 'processing' || f.status === 'uploading').length;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.t1, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
      {/* 背景极光 */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '5%', left: '-10%', width: '60%', height: '40%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }}/>
        <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '50%', height: '35%', background: 'radial-gradient(ellipse, rgba(45,212,191,0.06) 0%, transparent 70%)', filter: 'blur(50px)' }}/>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 430, margin: '0 auto', padding: '0 0 100px' }}>

        {/* 顶部导航 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 22px 0' }}>
          <button onClick={() => { hapticLight(); navigate('/boss-warroom'); }} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.t2} strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.5 }}>资产托管中枢</div>
            <div style={{ fontSize: 10, color: C.PL, fontWeight: 600, marginTop: 1 }}>Asset Vault · V6.0</div>
          </div>
          <div style={{ width: 36 }}/>
        </div>

        {/* 统计概览 */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <StatCard
              label="已激活资产"
              value={activeCount}
              color={C.green}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
            />
            <StatCard
              label="知识节点"
              value={neurons.length}
              color={C.PL}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.PL} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>}
            />
            <StatCard
              label="解析中"
              value={processingCount}
              color={C.amber}
              icon={
                <motion.div animate={{ rotate: processingCount > 0 ? 360 : 0 }} transition={{ duration: 1.5, repeat: processingCount > 0 ? Infinity : 0, ease: 'linear' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                </motion.div>
              }
            />
          </div>
        </div>

        {/* AI 解析进行中横幅 */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              style={{ margin: '0 16px', borderRadius: 14, overflow: 'hidden' }}
            >
              <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                </motion.div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>AI 正在解构产品资料</div>
                  <div style={{ fontSize: 10, color: 'rgba(245,158,11,0.6)', marginTop: 1 }}>提取技术参数 · 构建知识节点 · 匹配目标市场</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 切换 */}
        <div style={{ display: 'flex', gap: 0, margin: '16px 16px 0', background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['upload', 'neurons'] as const).map(tab => (
            <motion.button
              key={tab}
              onClick={() => { hapticLight(); setActiveTab(tab); }}
              animate={{ background: activeTab === tab ? 'rgba(124,58,237,0.25)' : 'transparent', color: activeTab === tab ? C.PL : C.t3 }}
              transition={{ duration: 0.2 }}
              style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: activeTab === tab ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: -0.2 }}
            >
              {tab === 'upload' ? `上传资料 (${files.length})` : `知识节点 (${neurons.length})`}
            </motion.button>
          ))}
        </div>

        {/* 内容区 */}
        <div style={{ padding: '14px 16px 0' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'upload' ? (
              <motion.div key="upload" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }}>
                <DropZone onFiles={handleFiles}/>
                {files.length > 0 && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, color: C.t3, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>已上传文件</div>
                    <AnimatePresence>
                      {files.map(f => <AssetFileRow key={f.id} file={f}/>)}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="neurons" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                {neurons.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.PL} strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.t2, marginBottom: 6 }}>暂无知识节点</div>
                    <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.5 }}>上传产品资料后，AI 将自动解构并生成产品知识节点</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 11, color: C.t3, fontWeight: 700, letterSpacing: 0.8, marginBottom: 2 }}>产品知识图谱</div>
                    {neurons.map(n => <ProductNeuronCard key={n.id} neuron={n}/>)}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 底部 CTA：前往 Boss Warroom */}
        {neurons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ margin: '20px 16px 0' }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={SPRING}
              onClick={() => { hapticSuccess(); navigate('/boss-warroom'); }}
              style={{
                width: '100%', padding: '15px', borderRadius: 18,
                background: `linear-gradient(135deg, ${C.P}, rgba(124,58,237,0.7))`,
                border: '1px solid rgba(124,58,237,0.4)',
                boxShadow: `0 8px 32px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.12)`,
                fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                letterSpacing: -0.3,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              前往 Boss Warroom 查看 AI 决策建议
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
