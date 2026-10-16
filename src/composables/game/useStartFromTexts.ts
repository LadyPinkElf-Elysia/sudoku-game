import { GAME_ORIGIN } from '@/constants/game'
import { parsePuzzle } from '@/core/sudoku/parse'
import { cellCountOf } from '@/core/sudoku/shape'
import { useGameStore } from '@/stores/game'
import type { GameMeta } from '@/types/game'

/**
 * 「挑战」开局：题面 / 答案串 → 棋局真源（我的题目页与落地页 / 搜索页共用）
 * · 解析与比例换算都在 core；答案串缺失也允许开局（胜负判定走规则，不依赖答案）
 * · 来源固定 `Challenge`（→ 游戏页不给「导出题目」）；source 给了才有「标题 · 出题人」信息行
 * · 题面串解析失败返回 false，调用方不跳页
 *
 * **为什么在 composable 而不在 store**：它要解析两串、算比例、并决定"来源 = 挑战" —— 属于业务编排；
 * store 只留 `startGame` / `startInput` 两个"给定数据、写真源"的基本操作（§六 归位原则）。
 */
export const useStartFromTexts = () => {
    const gameStore = useGameStore()

    return (puzzleText: string, solutionText: string, blankCount: number, source?: GameMeta): boolean => {
        const parsed = parsePuzzle(puzzleText)
        if (!parsed) return false

        gameStore.startGame(
            parsed.board,
            parsePuzzle(solutionText)?.board ?? [],
            { boxSize: parsed.boxSize, blankRatio: blankCount / cellCountOf(parsed.boxSize) },
            GAME_ORIGIN.Challenge,
            source,
        )
        return true
    }
}
