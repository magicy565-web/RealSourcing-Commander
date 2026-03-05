import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronRight, Menu, Settings } from 'lucide-react';

export default function Home() {
  const [, navigate] = useLocation();

  const pages = [
    { path: '/boss-warroom', name: '指挥中心', desc: '核心业务仪表板' },
    { path: '/watch-face', name: '表盘首页', desc: '高级表盘设计' },
    { path: '/decision-feed', name: '决策流', desc: '确认/驳回交互' },
    { path: '/ai-training', name: 'AI训练', desc: '能力图谱' },
    { path: '/commander-chat', name: '指挥对话', desc: 'Agent多人对话' },
    { path: '/digital-agents', name: '数字员工', desc: '团队状态' },
    { path: '/market-radar', name: '市场雷达', desc: '声呐探测' },
    { path: '/inbound-funnel', name: '入站漏斗', desc: '销售管道' },
    { path: '/outbound-campaigns', name: '外呼营销', desc: '营销活动' },
    { path: '/content-studio', name: '内容工作室', desc: '内容创作' },
    { path: '/settings', name: '设置', desc: '系统设置' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0F] to-[#15151F] text-white p-4">
      {/* 顶部导航 */}
      <div className="max-w-3xl mx-auto mb-8">
        <motion.div
          className="flex items-center justify-between py-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text text-transparent">
              指挥官
            </h1>
            <p className="text-sm text-gray-400 mt-1">Boss Phone 交互体验展厅</p>
          </div>
          <button className="p-3 rounded-lg hover:bg-white/10 transition">
            <Menu size={24} />
          </button>
        </motion.div>

        {/* 快速统计 */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {[
            { label: '页面', value: '11' },
            { label: '交互', value: '8+' },
            { label: '动画', value: '∞' },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white/5 rounded-lg p-3 text-center border border-white/10"
            >
              <div className="text-2xl font-bold text-yellow-400">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* 页面卡片网格 */}
      <div className="max-w-3xl mx-auto">
        <motion.div
          className="grid gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {pages.map((page, index) => (
            <motion.button
              key={page.path}
              onClick={() => navigate(page.path)}
              className="glass-card p-4 text-left hover:bg-white/10 transition-all duration-200 group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{page.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{page.desc}</p>
                </div>
                <ChevronRight
                  size={20}
                  className="text-yellow-500 group-hover:translate-x-1 transition-transform"
                />
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* 底部说明 */}
      <motion.div
        className="max-w-3xl mx-auto mt-12 text-center text-sm text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p>点击任意卡片查看交互演示</p>
        <p className="mt-2">所有交互遵循"感受优先"的设计原则</p>
      </motion.div>
    </div>
  );
}
