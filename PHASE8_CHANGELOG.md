# RealSourcing Commander — Phase 8 Changelog (V5)

> **发布日期：** 2026-03-02
> **开发方向：** Boss Warroom 沉浸感极致化

---

## 1. 视觉系统精进 (Visual Refinement)

### 动态流体背景 (Fluid Aurora)
- **新增** `src/components/FluidAurora.tsx`
- 基于 Canvas 的流体动力学背景，完全替代 CSS 静态渐变
- 180 个粒子构成的流场，由 Perlin-like noise 驱动方向向量
- 三层叠加极光 blob（深紫 / 电蓝 / 青紫），随时间缓慢漂移
- 粒子生命周期管理（spawn → fade-in → drift → fade-out → respawn）
- ResizeObserver 自适应屏幕尺寸，60fps 流畅渲染

### 微材质升级 (Micro-textures)
- **升级** `Card` 组件：新增 `EdgeDiffraction` 边缘衍射光效组件
- SVG 噪点纹理强度从 `0.022` 提升至 `0.028`，更细腻的物理材质感
- 边缘衍射：`inset box-shadow` 模拟真实玻璃边缘折射效果
- 每张平台卡片独立的品牌色衍射（TikTok 双色 / Meta 蓝 / LinkedIn 蓝 / Shopify 绿）

### 极端字重对比 (Typography)
- 核心数字统一使用 `fontWeight: 900`（SF Pro Black）
- 辅助文字降至 `fontWeight: 400`（Regular），拉开 5 级视觉层级
- Sparkline 升级为贝塞尔曲线平滑路径（`C` 命令），替代折线 `polyline`
- 端点增加双圆圈脉冲效果（实心点 + 半透明光晕）

---

## 2. 交互体验增强 (UX & Interaction)

### 手势系统 (Gestures)
- **新增** `src/hooks/useSpringGesture.ts`
- `usePullToRefresh`：下拉刷新回弹（Rubber Banding）
  - 橡皮筋公式：`distance^0.4 × 8`，模拟 iOS 物理阻尼
  - 拉到阈值时触发触感反馈 + 弹簧回弹动画
- `useSwipeBack`：从左边缘侧滑返回（仅在 `x < 30px` 触发）
  - 进度超过 35% 时确认返回，否则弹回原位

### 触感反馈 (Haptic Feedback)
- **新增** `src/lib/haptics.ts`
- 7 种触感模式：`light / medium / heavy / success / error / warning / selection`
- 关键操作绑定：
  - 发送消息 → `hapticMedium`
  - AI 回复到达 → `hapticSuccess`
  - 卡片点击 → `hapticSelection`
  - 语音按钮 → `hapticLight`
  - 下拉刷新触发 → `hapticSuccess`

### 弹簧动画 (Spring Physics)
- 全面引入 `framer-motion` 弹簧物理引擎
- 三套弹簧预设：
  - `SPRING_SNAPPY`：stiffness 420 / damping 28（按钮、卡片）
  - `SPRING_BOUNCY`：stiffness 380 / damping 22（发送按钮）
  - `SPRING_GENTLE`：stiffness 260 / damping 30（数字变化）
- 所有卡片 `whileTap` 缩放反馈（0.95~0.97）
- 聊天气泡入场动画：`opacity + translateY + scale`

---

## 3. 数据层深度对接 (Data Integration)

### WebSocket 实时推送
- **新增** `src/hooks/useWarroomWS.ts`
- 将 30s 轮询升级为 WebSocket 实时推送（`/ws/warroom`）
- 指数退避重连（1s → 1.5s → ... → 30s）
- 25s 心跳 ping/pong 保活机制
- 连接状态实时显示在状态栏（绿色闪烁 = 已连接）
- **升级** `server/index.ts`：集成 `ws` 库，支持 WebSocket 服务端

### 多平台字段补完
- **升级** `src/types/warroom.ts`：
  - `PlatformData.id` 扩展支持 `'linkedin' | 'shopify'`
  - 新增 `PlatformExtra` 接口（LinkedIn 人脉数 / Shopify GMV / 转化率）
  - 新增 `DailyStats` 逐日统计接口
  - 新增 `WSMessage` WebSocket 消息协议类型
- **升级** `src/hooks/useWarroomData.ts`：
  - LinkedIn：对接 `social_accounts` 表领英账号真实未读数 + 人脉数
  - Shopify：接入 GMV、订单转化率、实时 GMV 波动字段
  - 平台数组扩展为 4 个（TikTok / Meta / LinkedIn / Shopify）

### 历史趋势图 (Sparkline)
- 贝塞尔曲线平滑折线图，替代原有折线 `polyline`
- 7 日逐日数据构建（含有机抖动模拟真实数据波动）
- `DailyStats[]` 全局趋势数据结构，支持后端直接注入

---

## 4. AI 助手能力进化 (AI Capabilities)

### 多模态输入 (Multimodal)
- **新增** `src/components/VoiceInput.tsx`
- 语音录入组件，支持：
  - Web Audio API 实时波形动画（28 根弹簧驱动频谱柱）
  - Web Speech API 语音识别（中文 `zh-CN`）
  - 按住录音 / 点击切换模式
  - 录音状态机：`idle → recording → processing → done`
  - 不支持设备静默降级

### 主动建议卡片 (Proactive Cards)
- **新增** `src/components/ProactiveCard.tsx`
  - 4 种卡片类型：`alert / insight / action / success`
  - 弹簧入场动画 + 手动关闭 + 30s 自动消失
  - 脉冲光晕动画，强化视觉注意力
- **新增** `src/hooks/useProactiveCards.ts`
  - 监听数据波动自动触发：
    - 待处理 > 10 → 积压预警
    - 完成率 < 40% → 行动建议
    - 平台断连 → 连接预警
    - TikTok 趋势降 30%+ → 流量骤降预警
    - 完成率突破 80% → 正向反馈

### 快捷指令 (Quick Actions)
- **新增** `src/components/QuickActions.tsx`
- 基于上下文动态生成 5 条快捷指令
- 横向滚动，弹簧错位入场动画
- 点击自动填充输入框，触感反馈

---

## 文件变更清单

| 文件路径 | 状态 | 说明 |
|---|---|---|
| `client/src/pages/BossWarroom.tsx` | ✏️ 重构 | V5 主页面，整合所有新功能 |
| `client/src/types/warroom.ts` | ✏️ 升级 | LinkedIn/Shopify/WS 类型扩展 |
| `client/src/hooks/useWarroomData.ts` | ✏️ 升级 | 4 平台数据映射 + 7 日趋势 |
| `client/src/hooks/useWarroomWS.ts` | ✨ 新增 | WebSocket 实时推送 Hook |
| `client/src/hooks/useSpringGesture.ts` | ✨ 新增 | 手势系统（下拉刷新 + 侧滑返回）|
| `client/src/hooks/useProactiveCards.ts` | ✨ 新增 | AI 主动建议生成逻辑 |
| `client/src/components/FluidAurora.tsx` | ✨ 新增 | Canvas 流体动力学背景 |
| `client/src/components/ProactiveCard.tsx` | ✨ 新增 | AI 主动建议卡片组件 |
| `client/src/components/VoiceInput.tsx` | ✨ 新增 | 语音录入 + 波形动画组件 |
| `client/src/components/QuickActions.tsx` | ✨ 新增 | 快捷指令组件 |
| `client/src/lib/haptics.ts` | ✨ 新增 | 触感反馈工具函数 |
| `server/index.ts` | ✏️ 升级 | 集成 WebSocket 服务端 |
| `package.json` | ✏️ 升级 | 新增 `ws` + `@types/ws` 依赖 |

---

## 技术栈

- **动画引擎：** framer-motion v12（弹簧物理）
- **Canvas 渲染：** Web Canvas 2D API（流体粒子系统）
- **实时通信：** WebSocket（ws v8）+ 指数退避重连
- **语音识别：** Web Speech API（SpeechRecognition）
- **音频可视化：** Web Audio API（AnalyserNode）
- **触感反馈：** navigator.vibrate API
- **构建工具：** Vite v7 + TypeScript 5.6

---

*构建状态：✅ `pnpm build` 通过，2672 模块，无构建错误*
