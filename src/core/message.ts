import { EMPTY_GROUP_COPY, RATIO_COPY } from '../constants/game'
import { countBlanks, isBlankBoard } from './board/ops'
import { percentOf } from './game/derive'
import { cellCountOf, isBlankRatioOk } from './sudoku/shape'
import type { NumBoard } from '../types/board'
import type { Sudoku } from '../types/sudoku'

/** 统一错误文案：Error（含 ApiError，message 本身就是后端文案）直接用，否则用调用方兜底 */
export const errorTextOf = (err: unknown, fallback: string): string =>
    err instanceof Error ? err.message : fallback

/** 挖空比例不合规 → 文案；'' = 通过（当前百分比由 core 自己算，调用方不写算式） */
export const blankRatioErrorOf = (blanks: number, boxSize: number): string =>
    isBlankRatioOk(blanks, boxSize)
        ? ''
        : `${RATIO_COPY.bad}（当前 ${percentOf(blanks / cellCountOf(boxSize))}%）`

/**
 * 提交题面的校验（出题 / 编辑共用）：整盘全空 → 有空行/列/宫 → 冲突 → 40%~70%
 * '' = 通过；否则返回第一条不合格的文案（书写顺序即报错优先级）
 */
export const puzzleSubmitErrorOf = (numBoard: NumBoard, boxSize: number, sudoku: Sudoku): string => {
    if (isBlankBoard(numBoard)) return '题目不能全空'
    if (sudoku.hasEmptyGroup(numBoard)) return EMPTY_GROUP_COPY.bad
    if (sudoku.hasConflict(numBoard)) return '题面存在冲突，请先修正'
    return blankRatioErrorOf(countBlanks(numBoard), boxSize)
}
