# NEXUS · 个人工作台

深色科技感的个人效率工作台,全面对标 GitHub 头部开源项目(Glance / Dashy / Homepage / Habitica 类)的功能组合:任务管理(列表 + 看板)、习惯打卡、番茄钟、笔记便签、数据看板、快捷链接工具箱、全局命令面板、倒数日、天气、数据备份。数据支持本地存储,也可一键切换为 Supabase 云端同步。

## 功能一览

| 模块 | 说明 |
|---|---|
| 工作台主页 | 问候 + 每日一句 + 时钟、统计卡片、7 天完成趋势、今日到期、目标进展、习惯打卡速览、天气(Glance 风格)、倒数日、快捷入口、最近便签、迷你月历(Glance 风格) |
| 目标 | **顶层闭环**:给目标关联一个 `#标签`,打了该标签的任务完成率自动变成目标进度环;也支持手动进度条 + 截止日倒计时(Ali Abdaal 的 quarterly quests) |
| 云鲸圣域 | **按 0 或导航末尾进入**:实时渲染的 3D 梦境场景——悬浮玻璃立方体中封存一座微缩生态,半透明「云鲸星灵」沿 8 字巡游(发光心核+星尘),雪山/森林/发光河流/瀑布/湖泊/浮空岛随云鲸呼吸轻微律动,星尘粒子与体积雾;可拖拽旋转/滚轮缩放,可暂停呼吸与旋转(Three.js + React Three Fiber) |
| 新手引导 | 首次打开弹出欢迎引导,一键载入示例数据立刻体验全部功能;也可从空白开始 |
| 任务中心 | **列表 / 看板 / 日历** 三视图:列表(搜索/筛选/优先级/截止日期)、看板(拖拽)、**日历(月历任务片、拖拽改期、未排期侧栏、点空白天新建)**;子任务清单、标签、**重复任务(完成后自动生成下一次)**、删除进回收站 |
| 习惯打卡 | 连续天数连击、14 天打卡条、彩色标识(Habitica 风格) |
| 专注番茄 | 25/5/15 分钟计时环、关联任务专注、番茄会话统计、标题栏倒计时、**全屏专注** |
| 笔记便签 | 便签墙、6 色标记、置顶、搜索、**Markdown 编辑/预览(卡片内直接渲染,输入已转义防注入)** |
| 数据看板 | **任务完成热力图 + 习惯打卡热力图**(GitHub 风格)、14 天任务动态、状态分布、优先级分布、**数据备份导出/导入**(Dashy 风格) |
| 工具箱 | 快捷链接按分组管理,一键直达 |
| 回收站 | 任务/便签软删除,保留 30 天,可恢复,支持彻底删除与清空 |
| 命令面板 | **Ctrl + K** 或 `/` 全局唤起(Dashy 风格):搜索任务/笔记/链接、页面跳转、新建任务/便签、导出导入备份、**外部搜索 bangs(`g`/`bd`/`gh`/`b` + 关键词)**,↑↓ + Enter 全键盘操作 |
| 快速捕捉 | **任意页面按 `Q`** 或点右下角闪电按钮秒记一条:`#标签` 自动解析成任务标签、**自然语言日期**(明天/大后天/3天后/每周三/每月15号…)+ `p1/p2/p3` 优先级自动识别(Todoist 式),一键存任务/便签 |
| 智能助手 | **按 `A`** 或命令面板「问问助手」:基于工作台实时数据回答(现状总结/截止提醒/习惯分析/专注统计/心情趋势/关键词找回),**提示词模板引擎驱动、离线可用,每条回答可展开查看它用的提示词**(按 2026 提示词工程最佳实践:槽位模板 + 结构化输出) |
| 随机回顾 | 笔记页「🎲 随机回顾」,随机翻出一条旧便签重新遇见它(flomo 招牌) |
| 心情复盘 | 每天一档心情 emoji(工作台/数据看板都能打),**近 14 天心情曲线**(Moodnotes 式每日复盘) |
| 周回顾 | 数据看板自动生成本周报告:完成任务/打卡次数/专注时长/平均心情 + 一句自动评语(Ali Abdaal 的 Weekly Review) |
| 专注统计 | 番茄钟完成自动给关联任务累加 25 分钟,任务列表/看板显示 `⏱ 累计分钟`(Toggl 式);**专注白噪音**(雨声/棕噪音,WebAudio 实时合成,零资源离线可用) |
| 年度报告 | 「生成我的报告」一键生成 Wrapped 风格全屏报告:头衔评定、完成率、累计专注、最长连击、最勤的一天、最常出现的标签(网易云年度报告式) |
| 键盘操作 | Linear 风格全局快捷键:`1-8` 切页、`Q` 快速捕捉、`N` 新建任务、`M` 新建便签、`?` 快捷键帮助,输入框内自动失效 |
| 主题 | 深色科技感(默认)/ 亮色清爽,顶栏 ☀️/🌙 一键切换、即时生效、刷新不丢;图表与热力图同步换色 |
| PWA | `npm run build && npm run preview` 后浏览器地址栏出现「安装」按钮,可装到桌面当独立 App 用;内置离线缓存与更新 |
| 实时同步 | 云端模式下基于 Supabase Realtime,多设备/多标签页的改动**实时推送**(其他设备改了任务,这边秒级自动刷新) |
| 天气 | 基于 Open-Meteo(免密钥),城市搜索、当前天气 + 三日预报、30 分钟缓存,断网优雅降级 |

## 在线使用

**直接打开:<https://tianjixaiyun.github.io/nexus-workbench/>** —— 任何设备、任何浏览器可用;数据保存在你当前浏览器的本地存储中(换设备/清缓存前记得在「数据看板」导出备份)。手机浏览器打开后可「添加到主屏幕」当 App 用。

> 每次代码推送到 GitHub,线上版本自动更新(GitHub Actions 自动构建部署)。

## 快速开始

```bash
npm install
npm run dev        # 启动开发服务器
npm run build      # 构建生产版本
```

浏览器打开终端里显示的地址(默认 http://localhost:5173)。

**不配置任何东西即可直接使用** —— 数据保存在浏览器 IndexedDB 中(本地模式)。

## 启用云端同步(可选)

数据存到你自己的 Supabase 项目里,换电脑/换浏览器登录同一账号即可同步。全程免费额度足够个人使用。

1. **注册并新建项目**:打开 [supabase.com](https://supabase.com) → 注册 → `New project`(起个名字,密码随便设但要记牢,区域可选 Singapore)
2. **执行建表脚本**:项目页左侧 `SQL Editor` → New query → 打开本项目 `supabase/schema.sql`,全部复制粘贴进去 → `Run`,提示 Success 即可(脚本幂等,已建过 v1 表的用户重新执行一次即可升级到 v2)
3. **获取密钥**:左侧 `Project Settings` → `API`,找到 `Project URL` 和 `anon public` 两个值
4. **写入配置**:复制项目根目录的 `.env.example` 为 `.env`,填入:

   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...(你的 anon key)
   ```

5. **重启** `npm run dev`,右上角徽标变为「云端同步」,首次使用先注册账号
6. **实时同步**:重新执行一次 `schema.sql`(脚本幂等)即可开启 Realtime——多设备/多标签页改动实时推送

> 注意:开启云端后,浏览器里旧的本地数据不会自动迁移(两套数据独立);想带走旧数据,先在「数据看板 → 数据备份」导出 JSON,登录云端后导入。

## 功能路线图(调研自抖音/小红书/Product Hunt/YouTube 效率区,按优先级排列)

已规划、待后续迭代的功能(持续补充):

1. **多人共享工作区** — 工作区/成员邀请/按角色分配任务;依赖真实 Supabase 项目(实时同步地基已就绪)
2. **接入真 LLM 的助手升级** — 当前助手是本地规则引擎;接 OpenAI/Claude/DeepSeek API 后可复用现有提示词模板(槽位已就绪)获得真正的自然语言对话
3. **AI 自动日志** — 类 [Dayflow](https://www.producthunt.com/products/dayflow-4) / [Meridian](https://www.producthunt.com/products/meridian-16):把当天的任务/专注/心情自动写成一段工作日志(可先走本地模板,后接 LLM)
4. **个人 CRM** — [Ultimate Brain](https://thomasjfrank.com/brain) 3.0 的联系人面板:记录人脉、跟进提醒
5. **笔记双链与标签树** — Obsidian 式 `[[链接]]` 与 flomo 式标签树状导航
6. **模板库与周期模板** — 每日站会清单/周报模板一键生成任务
7. **浏览器插件快速捕捉** — 任意网页一键存入收件箱(需要打包扩展)

## 安装为桌面应用(PWA)

```bash
npm run build
npm run preview   # 或部署到任意静态托管
```

打开预览地址后,Chrome/Edge 地址栏右侧会出现「安装」图标,点击后 NEXUS 会以独立窗口运行,支持离线缓存、自动更新。

## 技术栈

React 19 · TypeScript · Vite · Tailwind CSS v4 · Zustand · Dexie(IndexedDB)· Supabase · ECharts · @dnd-kit · Three.js(@react-three/fiber/drei)

## 项目结构(后续加功能照这个套路)

```
supabase/schema.sql      云端建表脚本
.env.example             云端配置模板
src/
├── lib/
│   ├── config.ts        运行模式检测(本地/云端)
│   ├── utils.ts         通用工具函数
│   └── data/            数据访问层(核心扩展点)
│       ├── types.ts     实体类型:Task / Note / LinkItem
│       ├── adapter.ts   DataAdapter 统一接口
│       ├── localAdapter.ts   IndexedDB 实现
│       ├── cloudAdapter.ts   Supabase 实现
│       └── index.ts     自动选择实现
├── stores/              Zustand 状态(task/note/link/auth)
├── components/ui/       通用 UI 组件(Button/Card/Modal/Chart…)
├── layouts/AppLayout.tsx 侧边栏 + 顶栏布局
├── features/<模块>/     业务功能组件(页面主体逻辑)
└── pages/               路由页面(引用 features)
```

**加一个新功能模块的固定套路**:

1. `src/lib/data/types.ts` 加实体类型;`adapter.ts` 的 `DataAdapter` 接口加一个 `EntityStore`
2. `localAdapter.ts` / `cloudAdapter.ts` 各加实现(云端需同步在 `supabase/schema.sql` 加表)
3. `src/stores/` 加一个 store
4. `src/features/<新模块>/` 写组件,`src/pages/` 加页面,`App.tsx` 注册路由,`AppLayout.tsx` 加导航项

业务代码只依赖 adapter 接口和 store,不直接触碰 IndexedDB 或 Supabase —— 以后想换存储方案、加离线同步队列,只动 `lib/data/` 一层。
