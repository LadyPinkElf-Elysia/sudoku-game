import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CREATE_PHASE, RATIO_COPY } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { countBlanks, isBlankBoard } from '@/core/board/ops'
import { percentOf } from '@/core/game/derive'
import { boardToStr, parsePuzzle } from '@/core/sudoku/parse'
import { cellCountOf, isBlankRatioOk } from '@/core/sudoku/shape'
import { getOne, update } from '@/services/api/puzzleApi'
import { useGameStore } from '@/stores/game'
import type { NumBoard } from '@/types/board'
import type { CreatePhase } from '@/types/game'

/**
 * 编辑页流程（FR-10）：进入预填自己的题面（未锁定）→ 提交题目（含 40%~70%）→ 锁定
 * → 重新填答案 → PATCH → 回「我的题目」；不改 created_at，也不含标题/可见性
 */
export const useEditFlow = (resetZoom: () => void) => {
    const route = useRoute()
    const router = useRouter()
    const gameStore = useGameStore()

    const pid = ref('')
    const phase = ref<CreatePhase>(CREATE_PHASE.Puzzle)
    const puzzleSnapshot = ref<NumBoard>([])
    const errorMsg = ref('')
    const loading = ref(false)
    const showFail = ref(false)

    const goMyPuzzles = (): void => { void router.replace({ name: PAGE.MyPuzzles }) }

    /** 载入自己的题面（不预填旧答案） */
    const load = async (): Promise<void> => {
        const id = String(route.params.pid ?? '')
        if (!id) { goMyPuzzles(); return }

        loading.value = true
        errorMsg.value = ''
        try {
            const detail = await getOne(id)
            const parsed = parsePuzzle(detail.puzzleText)
            if (!parsed) {
                errorMsg.value = '题目数据异常，无法编辑'
                showFail.value = true
                return
            }
            pid.value = id
            gameStore.startCreate(parsed.boxSize, parsed.board)   // 未锁定 → 可增量改
            resetZoom()
        } catch (err) {
            errorMsg.value = err instanceof Error ? err.message : '题目加载失败'
            showFail.value = true
        } finally {
            loading.value = false
        }
    }

    /** 提交题目：非空 + 无冲突 + 40%~70% → 锁题进入填答案阶段 */
    const submitPuzzle = (): void => {
        const numBoard = gameStore.numBoard
        if (isBlankBoard(numBoard)) { errorMsg.value = '题目不能全空'; return }
        if (gameStore.sudoku.hasConflict(numBoard)) { errorMsg.value = '题面存在冲突，请先修正'; return }

        const blanks = countBlanks(numBoard)
        const cells = cellCountOf(gameStore.config.boxSize)
        if (!isBlankRatioOk(blanks, gameStore.config.boxSize)) {
            errorMsg.value = `${RATIO_COPY.bad}（当前 ${percentOf(blanks / cells)}%）`
            return
        }

        errorMsg.value = ''
        puzzleSnapshot.value = numBoard
        gameStore.lockPuzzle()
        phase.value = CREATE_PHASE.Solution
    }

    /** 提交答案：校验 → 转圈 PATCH（题面/答案成对提交）→ 回「我的题目」 */
    const submitSolution = async (): Promise<void> => {
        if (loading.value) return
        if (!gameStore.sudoku.validatePuzzle(puzzleSnapshot.value, gameStore.numBoard)) {
            errorMsg.value = '答案不完整、有冲突，或与题面不符'
            showFail.value = true
            return
        }

        loading.value = true
        try {
            await update(pid.value, {
                puzzleText: boardToStr(puzzleSnapshot.value),
                solutionText: boardToStr(gameStore.numBoard),
            })
            goMyPuzzles()
        } catch (err) {
            errorMsg.value = err instanceof Error ? err.message : '保存失败，请重试'
            showFail.value = true
        } finally {
            loading.value = false
        }
    }

    const backToEdit = (): void => {
        showFail.value = false
        errorMsg.value = ''
    }

    onMounted(() => { void load() })

    return { pid, phase, errorMsg, loading, showFail, load, submitPuzzle, submitSolution, backToEdit, goMyPuzzles }
}
