# RealSourcing Commander 5.0

> **数字资产托管 + 海外市场增长服务**
>
> 为中小工厂老板提供一套完整的海外获客与数字资产管理解决方案。

---

## 产品定位

RealSourcing Commander 是 RealSourcing Platform 的 5.0 版本，专注于供应链端。在 4.0 完成了采购商端的"15 分钟匹配工厂 / 30 分钟快速报价"之后，5.0 转向工厂端，为中小企业老板提供：

- **指挥官手机**：预装微信 + 飞书 + Commander App 的专属工作手机，开箱即用
- **OpenClaw 云端数字员工**：以老板真实身份在 LinkedIn/Facebook/阿里巴巴持续活跃，自动获客
- **双轨获客引擎**：短期 RFQ 监控（保底每月 10 条询盘）+ 长期 GEO 优化（AI 搜索可见度）

---

## 项目结构

```
RealSourcing-Commander/
├── apps/
│   ├── commander-app/      # 手机端 H5 指挥台（React + Vite）
│   ├── commander-web/      # Web 管理端仪表盘（React + Vite）
│   └── commander-server/   # 后端 API + BullMQ Worker + OpenClaw 集成（Node.js + Hono）
│       ├── src/
│       │   └── _core/      # 核心服务模块
│       └── drizzle/        # 数据库 Schema 和迁移文件
├── packages/
│   └── shared/             # 共享类型定义和工具函数
├── docs/                   # 产品文档（PRD、GTM、技术方案）
├── scripts/                # 开发脚本（数据库迁移、种子数据等）
├── TODO_5.0.md             # 开发任务清单
├── CHANGELOG.md            # 版本历史
└── pnpm-workspace.yaml     # Monorepo 工作区配置
```

---

## 技术栈

| 层级 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| 手机端 / Web 端 | React 19 + Vite + Tailwind CSS 4 | 与 4.0 保持一致 |
| 后端 API | Node.js + Hono + tRPC | 轻量高性能 |
| 数据库 | MySQL + Drizzle ORM | 与 4.0 共享数据库基础设施 |
| 任务队列 | BullMQ + Redis | 复用 4.0 的队列基础设施 |
| 云端自动化 | OpenClaw（云端浏览器 Agent） | 核心差异化能力 |
| 通知 | 微信模板消息 + 飞书机器人 | 国内生态优先 |
| AI 能力 | 复用 4.0 的 aiService | GPT-4o + Claude 3.5 |

---

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器（所有应用）
pnpm dev

# 执行数据库迁移
pnpm db:migrate

# 启动 BullMQ Worker
pnpm worker:start
```

---

## 相关文档

- [PRD 5.0 Commander](./docs/PRD_5.0_Commander.md) — 完整产品需求文档
- [TODO 5.0](./TODO_5.0.md) — 开发任务清单
- [CHANGELOG](./CHANGELOG.md) — 版本历史

---

## 与 4.0 的关系

本项目与 [RealSourcing-Platform](https://github.com/magicy565-web/RealSourcing-Platform)（4.0）**完全独立**，两个产品分别服务于采购商端和工厂端，独立部署、独立演进。共享同一套数据库基础设施和 AI 服务层。
