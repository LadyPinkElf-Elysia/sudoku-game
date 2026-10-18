import { CREATE_PHASE, EXPORT_COPY } from '@/constants/game'
import { MINE_COPY, SEARCH_COPY } from '@/constants/puzzle'
import { SOLVE_COPY } from '@/constants/solve'
import { AUTH_COPY } from '@/constants/user'
import type { Action } from '@/types/item'
import type { CreatePhase } from '@/types/game'

/** 按钮条上一颗按钮的「静态部分」：key（本条内稳定标识）+ text（显示文案） */
export type ActionSpec = Pick<Action, 'key' | 'text'>

/**
 * 全站按钮条文案表 —— **一处定义，页面只挑按钮**
 * · 页面 / composable 不再自己写 `key` 与文案，只决定「用哪一颗 + 点击做什么」
 * · 文案仍来自各域 COPY（EXPORT / MINE / SOLVE / AUTH / SEARCH），这里只做「按钮 → 文案」的映射
 * · `key` 只要求在**同一条按钮条内**唯一（back / close 在不同条里重复是正常的）
 * · 图形也算文案（R5：图标当文本，不另设图标字段）
 */
export const ACTION = {
    // —— 导航 / 关闭 ——
    back: { key: 'back', text: '◀ 返回' },
    backToMine: { key: 'back', text: '← 我的题目' },
    close: { key: 'close', text: '↩ 返回' },
    closeAnswer: { key: 'close', text: '↩ 回到挑战' },
    continueEdit: { key: 'back', text: '↩ 继续修改' },

    // —— 游戏页 ——
    restart: { key: 'restart', text: '↺ 重开' },
    hint: { key: 'hint', text: '💡 提示' },
    answer: { key: 'answer', text: '📖 答案' },
    cheat: { key: 'cheat', text: '⚡ 作弊' },
    exportPuzzle: { key: 'export', text: EXPORT_COPY.button },

    // —— 缩放（贴棋盘的那一对圆圈）——
    zoomOut: { key: 'zoomOut', text: '➖' },
    zoomIn: { key: 'zoomIn', text: '➕' },

    // —— 出题 / 编辑（提交按钮随阶段变，见 submitSpecOf）——
    submitPuzzle: { key: 'submit', text: '📤 提交题目' },
    submitSolution: { key: 'submit', text: '📤 提交答案' },
    goMine: { key: 'goMine', text: '📋 去我的题目' },
    startGame: { key: 'start', text: '▶ 开始游戏' },

    // —— 题目列表 / 预览 / 导出 ——
    challenge: { key: 'challenge', text: `▶ ${SEARCH_COPY.challenge}` },
    copyPuzzle: { key: 'puzzle', text: EXPORT_COPY.copyPuzzle },
    remove: { key: 'remove', text: `🗑 ${MINE_COPY.remove}` },
    cancel: { key: 'cancel', text: `↩ ${MINE_COPY.cancel}` },

    // —— 求解页 ——
    fillBoard: { key: 'fill', text: SOLVE_COPY.fillBoard },
    clearBoard: { key: 'clear', text: SOLVE_COPY.clearBoard },
    solve: { key: 'solve', text: SOLVE_COPY.solveLabel },

    // —— 账号 ——
    logout: { key: 'logout', text: AUTH_COPY.logout },
    copyUid: { key: 'copy', text: `📋 ${AUTH_COPY.copy}` },
    copiedUid: { key: 'copy', text: `📋 ${AUTH_COPY.copied}` },
    savedUid: { key: 'done', text: `➡️ ${AUTH_COPY.saved}` },
} as const satisfies Record<string, ActionSpec>

/**
 * 把「静态按钮 + 点击函数」拼成 Action
 * · 不给 `onClick` → 组件渲染成纯文本（禁用态也这么表达，全站惯例）
 * · 不写 `onClick: undefined`：没有点击函数时就不带这个键
 */
export const actionOf = (spec: ActionSpec, onClick?: () => void): Action =>
    onClick ? { ...spec, onClick } : { ...spec }

/** 出题 / 编辑：提交按钮随阶段变（填题面 → 填答案） */
export const submitSpecOf = (phase: CreatePhase): ActionSpec =>
    phase === CREATE_PHASE.Puzzle ? ACTION.submitPuzzle : ACTION.submitSolution
