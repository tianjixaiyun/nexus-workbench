/**
 * 任务模板库(Notion/Todoist 式,内置预设零配置):
 * 一键把一套清单批量生成任务,子任务粒度用标签+优先级表达。
 */

export type TemplatePriority = 'high' | 'medium' | 'low'

export interface TaskTemplateItem {
  title: string
  priority?: TemplatePriority
  /** 相对今天的截止天数,不填则不设截止 */
  dueOffsetDays?: number
}

export interface TaskTemplate {
  id: string
  name: string
  emoji: string
  desc: string
  items: TaskTemplateItem[]
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'standup',
    name: '每日站会清单',
    emoji: '📡',
    desc: '同步进展 · 阻塞 · 今日计划',
    items: [
      { title: '写下昨天完成的一件事', priority: 'medium' },
      { title: '列出今天的 1-3 件要事', priority: 'high' },
      { title: '标记当前卡住的阻塞点', priority: 'medium' },
      { title: '同步给协作伙伴', priority: 'low', dueOffsetDays: 0 },
    ],
  },
  {
    id: 'weekly-review',
    name: 'GTD 周回顾',
    emoji: '🧭',
    desc: '清空收件箱 · 回顾项目 · 下周安排',
    items: [
      { title: '清空所有收件箱(邮件/笔记/闪念)', priority: 'high', dueOffsetDays: 0 },
      { title: '回顾上周完成任务与未竟事项', priority: 'medium', dueOffsetDays: 0 },
      { title: '检查每个项目的下一步行动', priority: 'high', dueOffsetDays: 1 },
      { title: '规划下周的三个关键结果', priority: 'high', dueOffsetDays: 1 },
      { title: '归档已完成/失效的任务', priority: 'low', dueOffsetDays: 1 },
    ],
  },
  {
    id: 'deep-work',
    name: '深度工作日',
    emoji: '🧠',
    desc: '三件要事的专注节奏',
    items: [
      { title: '上午:最要事深度冲刺(90 分钟)', priority: 'high', dueOffsetDays: 0 },
      { title: '下午:第二要事推进(60 分钟)', priority: 'medium', dueOffsetDays: 0 },
      { title: '处理批量杂事(邮件/消息集中回)', priority: 'low', dueOffsetDays: 0 },
      { title: '收尾:写 3 行今日小结', priority: 'medium', dueOffsetDays: 0 },
    ],
  },
  {
    id: 'launch',
    name: '产品发布清单',
    emoji: '🚀',
    desc: '发布前的检查闭环',
    items: [
      { title: '功能验收:核心流程走查一遍', priority: 'high', dueOffsetDays: 2 },
      { title: '写发布公告/更新日志', priority: 'medium', dueOffsetDays: 2 },
      { title: '准备发布素材(截图/文案)', priority: 'medium', dueOffsetDays: 3 },
      { title: '通知内测用户收集反馈', priority: 'high', dueOffsetDays: 4 },
      { title: '发布后复盘数据与反馈', priority: 'medium', dueOffsetDays: 7 },
    ],
  },
  {
    id: 'fitness',
    name: '健身训练日',
    emoji: '🏋️',
    desc: '热身 · 训练 · 恢复',
    items: [
      { title: '热身 10 分钟(动态拉伸)', priority: 'medium', dueOffsetDays: 0 },
      { title: '力量训练:推/拉/腿任选', priority: 'high', dueOffsetDays: 0 },
      { title: '有氧 20 分钟', priority: 'low', dueOffsetDays: 0 },
      { title: '训练后拉伸 + 补充蛋白质', priority: 'medium', dueOffsetDays: 0 },
    ],
  },
  {
    id: 'content',
    name: '内容创作流水线',
    emoji: '✍️',
    desc: '选题 → 初稿 → 打磨 → 发布',
    items: [
      { title: '选题:写下 3 个候选主题', priority: 'medium', dueOffsetDays: 0 },
      { title: '初稿:不求完美,先写完', priority: 'high', dueOffsetDays: 2 },
      { title: '打磨:删掉 20% 冗余字数', priority: 'medium', dueOffsetDays: 3 },
      { title: '配图与排版', priority: 'low', dueOffsetDays: 3 },
      { title: '发布并回收一条读者反馈', priority: 'medium', dueOffsetDays: 5 },
    ],
  },
  {
    id: 'trip',
    name: '出行打包清单',
    emoji: '🧳',
    desc: '证件 · 设备 · 生活用品',
    items: [
      { title: '证件类:身份证/护照/签证', priority: 'high' },
      { title: '电子设备:充电器/转换头/耳机', priority: 'high' },
      { title: '衣物按天数准备', priority: 'medium' },
      { title: '常用药与洗漱包', priority: 'medium' },
      { title: '出发前检查水电门窗', priority: 'low' },
    ],
  },
  {
    id: 'interview',
    name: '面试准备清单',
    emoji: '🎯',
    desc: '公司研究 · 问题演练 · 复盘',
    items: [
      { title: '研究公司:产品/业务/近期动态', priority: 'high' },
      { title: '准备自我介绍 1 分钟版', priority: 'high' },
      { title: '演练 5 个高频问题', priority: 'medium', dueOffsetDays: 1 },
      { title: '准备 3 个反问面试官的问题', priority: 'medium', dueOffsetDays: 1 },
      { title: '面试后 24 小时内写复盘', priority: 'low', dueOffsetDays: 2 },
    ],
  },
]
