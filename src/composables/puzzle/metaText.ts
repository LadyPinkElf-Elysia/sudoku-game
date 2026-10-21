import { PUZZLE_META_COPY } from '@/constants/copy'

/** 题目元信息一行的字段（列表项 / 题目详情共用） */
export interface MetaParts {
    /** 盘面边长（9 / 16 …） */
    sideS: number
    /** 挖空格数 */
    blankCount: number
    /** 出题时间戳；缺（旧数据 / 旧后端未返回）→ 按「现在」显示 */
    createdAt: number
    /** 热度；不传就不显示（详情接口没有这个字段） */
    playCount?: number
    /** 出题人；传了才显示（题目详情用） */
    author?: string
}

/** 时间格式选项（本地时区、24 小时制、带分钟） */
const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}

/**
 * 时间文案 —— **全站唯一**的格式化实现（题目元信息 / 存档列表共用）
 * · `withYear=false` 用于"只在一年内看"的短格式（继续游戏页）
 * · 传 0 / 缺值 → 按「现在」（旧数据没有时间字段时不该显示 1970）
 */
export const dateTimeTextOf = (ms: number, withYear = true): string =>
    new Date(ms || Date.now()).toLocaleString('zh-CN', withYear ? { ...TIME_OPTIONS, year: 'numeric' } : TIME_OPTIONS)

/**
 * 元信息行文本：「盘面大小 9×9 · 挖空 N 格 · 创建时间 … · 热度 N · 出题人 X」
 * 组件只负责画一行 `<p class="meta-line">`；文案与时间格式**都在这里**（列表项 / 详情 / 游戏页同一份）
 */
export const metaTextOf = (parts: MetaParts): string => [
    `${PUZZLE_META_COPY.size} ${parts.sideS}×${parts.sideS}`,
    `${PUZZLE_META_COPY.blank} ${parts.blankCount} 格`,
    `${PUZZLE_META_COPY.created} ${dateTimeTextOf(parts.createdAt)}`,
    ...(parts.playCount === undefined ? [] : [`${PUZZLE_META_COPY.hot} ${parts.playCount}`]),
    ...(parts.author ? [`${PUZZLE_META_COPY.author} ${parts.author}`] : []),
].join(' · ')
