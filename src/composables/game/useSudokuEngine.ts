import { ref } from 'vue'
import { SOLVE_COPY } from '@/constants/copy'
import { errorTextOf } from '@/core/message'
import { blankCountOf } from '@/core/sudoku/shape'
import { generateInWorker, solveMultiInWorker } from '@/services/sudoku/workerClient'
import type { NumBoard } from '@/types/board'
import type { GameConfig } from '@/types/game'
import type { PuzzleData } from '@/types/puzzle'

/**
 * 数独引擎（**出题链路收成一个组合式**）：生成 → 挖空 → 求解，对外只有 `loading / error / 结果 / 动作`
 *
 * 为什么"写在一起"：这三件事在业务上是一条线（一份盘面：生成 → 按比例挖空 → 求解校验），
 * 调用方只关心「给配置/给盘面 → 拿数据」，不关心中间经过几个模块。
 *
 * **为什么算法本体仍留在 `core/`**（`generator.ts` / `digger.ts` / `solver.ts` / `multiSolver.ts`）：
 *   · `services/sudoku/worker.ts`（Worker 线程）**直接 import core** —— 按 R2 矩阵 services 不能 import composables；
 *   · 后端 `functions/` 也复用 core（解析 / 规则）；纯函数还便于注入 rng、单独测；
 *   · 组合式只负责"**异步 + 状态 + 参数收口**"这一层（R7），不承载算法。
 *
 * 一次调用只做一件事（生成或求解），所以 `loading` / `error` 共用一份即可。
 */
export const useSudokuEngine = () => {
    const loading = ref(false)
    const error = ref('')
    /** 最近一次求解的解列表（生成不使用） */
    const solutions = ref<NumBoard[]>([])

    /** 清掉上一轮的解（换盘 / 换串 / 重新求解前调用） */
    const reset = (): void => {
        solutions.value = []
    }

    /**
     * 出一盘题：入参 `GameConfig`（盘面大小 B + 挖空比例）
     * → core 的 `blankCountOf` 算挖空格数 → Worker 里 `generatePuzzle`（内部调 `digPuzzle` 挖空）
     * 成功返回 `{ puzzle, solution }`；失败（含超时）返回 null 且 `error` 已写好
     */
    const generate = async (cfg: GameConfig): Promise<PuzzleData | null> => {
        if (loading.value) return null
        error.value = ''
        loading.value = true
        try {
            return await generateInWorker(cfg.boxSize, blankCountOf(cfg.boxSize, cfg.blankRatio))
        } catch (err) {
            error.value = errorTextOf(err, '生成失败，请重试')
            return null
        } finally {
            loading.value = false
        }
    }

    /**
     * 多解求解：盘面 + 解数上限 → 解列表写进 `solutions`
     * 成功（0 解也算成功，由页面按结果提示）返回 true；抛错/超时返回 false 且 `error` 已写好
     */
    const solve = async (board: NumBoard, maxSolutions: number): Promise<boolean> => {
        if (loading.value) return false
        error.value = ''
        loading.value = true
        try {
            solutions.value = await solveMultiInWorker(board, maxSolutions)
            return true
        } catch (err) {
            error.value = errorTextOf(err, SOLVE_COPY.fail)
            return false
        } finally {
            loading.value = false
        }
    }

    return { loading, error, solutions, generate, solve, reset }
}
