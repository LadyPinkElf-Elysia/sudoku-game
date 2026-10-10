/**
 * 棋局状态的对外派生（纯函数层）：状态、提示文案
 */
import { GAME_STATUS, } from '@/constants/game'
import type { Cell } from '@/types/board'
import type { GameStatus } from '@/types/game'

/** 状态推导：已胜 > 无盘面 > 进行中 */
export const statusOf = (hasBoard: boolean, isWin: boolean): GameStatus =>
    isWin ? GAME_STATUS.Won : hasBoard ? GAME_STATUS.Playing : GAME_STATUS.Idle

/** 提示文案；未选中 / 锁定 / 有候选三种分支 */
export const hintTextOf = (cell: Cell | null, candidates: number[]): string => {
    if (!cell) return '请选中一个格子'
    if (cell.lock) return '无法更改初始题目'
    return `此格可以填：${candidates.join('、') || '无'}`
}
