import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CREATE_PHASE, GAME_INIT_CONFIG } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { useGameStore } from '@/stores/game'
import type { NumBoard } from '@/types/board'
import type { CreatePhase } from '@/types/game'
import { isBlankBoard } from '@/core/board/model'


/**
 * 出题页流程：题面 → 答案两阶段的状态机、校验与提交
 * 每页一份；缩放由页面注入，避免再次 useZoom() 产生第二份 zoom
 */
export const useCreateFlow = (resetZoom: () => void) => {
    const gameStore = useGameStore()
    const router = useRouter()

    /** 当前阶段：填题面 / 填答案 */
    const phase = ref<CreatePhase>(CREATE_PHASE.Puzzle)
    /** 提交题目时快照的题面 */
    const puzzleSnapshot = ref<NumBoard>([])
    const errorMsg = ref('')
    const showSuccess = ref(false)
    const showFail = ref(false)

    /** 重置本地流程状态 */
    const reset = (): void => {
        phase.value = CREATE_PHASE.Puzzle
        puzzleSnapshot.value = []
        errorMsg.value = ''
        showSuccess.value = false
        showFail.value = false
    }

    /** 重建一盘空题（切盘面 / 再出一道共用） */
    const restart = (boxSize: number): void => {
        reset()
        gameStore.startCreate(boxSize)
        resetZoom()
    }

    /** 切换盘面大小：必须重建 board，否则键盘与盘面尺寸不一致 */
    const changeBoxSize = (b: number): void => {
        if (b === gameStore.config.boxSize) return
        restart(b)
    }

    /** 再出一道：保持当前盘面大小 */
    const createAgain = (): void => restart(gameStore.config.boxSize)

    const goHome = (): void => { router.replace({ name: PAGE.Home }) }

    /** 提交题面 → 校验后锁题，进入填答案阶段 */
    const submitPuzzle = (): void => {
        const numBoard = gameStore.numBoard
        if (isBlankBoard(numBoard)) {
            errorMsg.value = '题目不能全空'
            return
        }
        if (gameStore.sudoku.hasConflict(numBoard)) {
            errorMsg.value = '题面存在冲突，请先修正'
            return
        }
        errorMsg.value = ''
        puzzleSnapshot.value = numBoard
        gameStore.lockPuzzle()
        phase.value = CREATE_PHASE.Solution
    }

    /** 提交答案 → 校验后弹成功遮罩 */
    const submitSolution = (): void => {
        if (!gameStore.sudoku.validatePuzzle(puzzleSnapshot.value, gameStore.numBoard)) {
            errorMsg.value = '答案不完整、有冲突，或与题面不符'
            showFail.value = true
            return
        }
        showSuccess.value = true
    }

    /** 关掉失败遮罩，继续修改 */
    const backToEdit = (): void => {
        showFail.value = false
        errorMsg.value = ''
    }

    onMounted(() => restart(GAME_INIT_CONFIG.boxSize))

    return {
        phase, errorMsg, showSuccess, showFail,
        changeBoxSize, createAgain, goHome,
        submitPuzzle, submitSolution, backToEdit,
    }
}
