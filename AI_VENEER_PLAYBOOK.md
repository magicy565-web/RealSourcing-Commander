# AI Veneer — “伪 AI 功能” 设计手册

> **核心理念**：前端看起来是复杂的 AI 功能，后端本质是简单的数据库查询 + 精心设计的预设值。这是一种低成本、高杠杆地创造“AI 感”的产品策略。

---

## 1. 设计原则

1.  **绝不引入新依赖**：所有功能必须在现有技术栈（Hono + SQLite/Supabase + LLM）内完成。
2.  **后端逻辑极简**：后端只做最简单的数据库查询和 `if/else` 判断，绝不写复杂算法。
3.  **前端体验拉满**：用精美的 UI、加载动画和“AI 分析中...”的提示，把简单的结果包装成智能洞察。
4.  **结果必须有用**：伪 AI 的结果不能是随机的，它必须基于真实数据，提供有价值的参考，即便是简单的参考。

## 2. “伪 AI 功能” 矩阵

以下是围绕 Commander 核心业务设计的“伪 AI 功能”列表，可直接在现有代码库上实现。

### 模块一：询盘管理 (Inquiry/Lead)

| “AI 功能” 名称 | 前端展示效果 | 后端真实实现 |
| :--- | :--- | :--- |
| **AI 意向置信度** | 一个从 0-100 的动态分数条，并给出“高/中/低”标签。 | `score = (字段完整度 * 50) + (关键词匹配 * 50)`<br>（如 `buyer_email` 存在+10分，`original_msg` 包含 `price`+10分） |
| **AI 沟通风格分析** | “该买家沟通风格：**直接型**。建议回复时开门见山。” | `if (msg.length < 100 && msg.includes('price')) return '直接型'`<br>`else return '关系型'` |
| **AI 相似买家推荐** | “发现 3 个与该买家相似的潜在客户（同国家/同行业）” | `SELECT * FROM inquiries WHERE country = ? AND product_category = ? LIMIT 3` |
| **AI 最佳跟进时间** | “AI 建议：**下午 3 点**（买家当地时间）发送跟进邮件，开启率最高。” | `switch(country) { case 'USA': return '下午4点'; case 'Europe': return '上午10点'; ... }` (预设规则) |

### 模块二：爆款雷达 (Trend Radar)

| “AI 功能” 名称 | 前端展示效果 | 后端真实实现 |
| :--- | :--- | :--- |
| **AI 爆款生命周期** | “该爆款视频正处于 **成长期**，预计热度将持续 2 周。” | `if (days_since_published < 3) return '导入期'`<br>`else if (days_since_published < 14) return '成长期'`<br>`else return '衰退期'` |
| **AI 视频脚本分析** | “AI 分析：该视频的 Hook 很有力（前3秒出现强对比），CTA 明确。” | `if (script.startsWith('You won\'t believe')) return 'Hook 有力'` (关键词匹配) |
| **AI 市场饱和度预警**| “警告：关键词 **‘户外帐篷’** 近 7 天热度过高，市场可能已饱和。” | `SELECT COUNT(*) FROM trend_videos WHERE keyword = ? AND created_at > (NOW() - 7 days)` (如果 > 50 则预警) |

### 模块三：个人助理 (Assistant)

| “AI 功能” 名称 | 前端展示效果 | 后端真实实现 |
| :--- | :--- | :--- |
| **AI 今日任务总结** | “早上好！AI 已为您总结今日重点：**3 条高意向询盘待处理**，**1 个爆款视频待分析**。” | `SELECT COUNT(*) FROM inquiries WHERE status = 'unread' AND intent_score > 70` (两条 SQL 查询) |
| **AI 效率提升建议** | “上周您处理了 50 条询盘，平均响应时长 3 小时。**AI 建议**：将低意向询盘设置为自动回复，可节省 40% 时间。” | `SELECT AVG(response_time) FROM inquiries WHERE week = last_week` (简单的统计分析) |
| **AI 账号健康度评分**| “您的 **TikTok 账号** 健康度：**85分**。优点：发布频率稳定。缺点：评论互动率较低。” | `score = (post_freq * 40) + (comment_rate * 60)` (简单的加权平均) |

## 3. 实施建议

1.  **从“AI 意向置信度”开始**：这是最核心、最容易实现、且价值感最强的功能。可以立刻在 `inquiries` 表中增加 `confidence_score` 字段，并编写一个简单的后端函数来计算它。
2.  **后端批量计算**：创建一个定时任务（Vercel Cron Job），每小时运行一次，批量计算所有新询盘的“伪 AI”数据，并将结果直接存入数据库字段。这样前端只需直接读取字段，无需实时计算，性能最高。
3.  **前端组件化**：将每个“伪 AI 功能”都封装成一个独立的 React 组件，例如 `<ConfidenceScoreBar score={87} />` 或 `<AIAnalysisCard text="..." />`，方便在不同页面复用。
