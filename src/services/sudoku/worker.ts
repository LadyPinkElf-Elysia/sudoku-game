/// <reference lib="webworker" />
import { generatePuzzle } from "@/core/sudoku/generator"
import { solvePuzzleMulti } from "@/core/sudoku/multiSolver"
import { SOLVE_COPY } from "@/constants/solve"
import type { WorkerRequest } from "@/types/worker"

/** 按 kind 派活：单解/多解/生成都只是调 core，随机由这里注入（services 层才允许宿主对象） */
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
    try {
        const req = e.data
        if (req.kind === 'solve') {
            const solutions = solvePuzzleMulti(req.board, Math.random, req.maxSolutions)
            if (!solutions.length) {
                self.postMessage({ ok: false, error: SOLVE_COPY.noSolution })
                return
            }
            self.postMessage({ ok: true, result: solutions })
            return
        }
        self.postMessage({ ok: true, result: generatePuzzle(req.boxSize, req.blanks, Math.random) })
    } catch (err) {
        self.postMessage({ ok: false, error: (err as Error).message })
    }
}

export { }
