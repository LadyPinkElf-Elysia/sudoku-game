import { ACTION } from '@/constants/actions'
import { CREATE_PHASE } from '@/constants/game'
import type { CreatePhase } from '@/types/game'
import type { Action } from '@/types/item'

/**
 * 把「按钮条静态项（key + 文案）+ 点击函数」拼成一个 Action
 * · 不给 `onClick` → 组件渲染成纯文本（禁用态就这么表达，全站惯例、不另设 disabled）
 * · 没有点击函数时**不带这个键**（不写 `onClick: undefined`）
 */
export const actionOf = (spec: Action, onClick?: () => void): Action =>
    onClick ? { ...spec, onClick } : { ...spec }

/** 出题 / 编辑：提交按钮随阶段变（填题面 → 填答案）—— 文案表在 constants/actions.ts */
export const submitSpecOf = (phase: CreatePhase): Action =>
    phase === CREATE_PHASE.Puzzle ? ACTION.submitPuzzle : ACTION.submitSolution
