import { EMPTY_GROUP_COPY, RATIO_COPY } from '../../src/constants/copy'
import { countBlanks } from '../../src/core/board/ops'
import { parsePuzzle } from '../../src/core/sudoku/parse'
import { getSudoku } from '../../src/core/sudoku/rules'
import { isBlankRatioOk } from '../../src/core/sudoku/shape'
import { fail } from './json'

/** 校验题面 + 答案；不合法返回 Response，合法返回归一化结果 */
export interface PuzzleCheck { puzzleText: string; solutionText: string; sideS: number; blanks: number }

export const checkPuzzle = (puzzleText: string, solutionText: string): PuzzleCheck | Response => {
    const p = parsePuzzle(puzzleText)
    if (!p) return fail('题面格式不对：需要 16/81/256/625/1296/2401/4096/6561/10000 个 0-9 的数字')
    const s = parsePuzzle(solutionText)
    if (!s) return fail('答案格式不对：同上')
    if (p.boxSize !== s.boxSize) return fail('题面与答案的盘面大小必须一致')

    const blanks = countBlanks(p.board)
    const sideS = p.boxSize * p.boxSize
    if (blanks === 0) return fail('题面不能全空（至少要挖掉一些格子）')
    if (getSudoku(p.boxSize).hasEmptyGroup(p.board)) return fail(EMPTY_GROUP_COPY.bad)
    if (!isBlankRatioOk(blanks, p.boxSize))
        return fail(`${RATIO_COPY.bad}（当前 ${Math.round((blanks / (sideS * sideS)) * 100)}%）`)
    if (!getSudoku(p.boxSize).validatePuzzle(p.board, s.board))
        return fail('题面与答案不一致，或答案不是合法终盘')

    return { puzzleText: puzzleText.trim(), solutionText: solutionText.trim(), sideS, blanks }
}
