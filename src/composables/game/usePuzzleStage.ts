import { ref } from 'vue'
import { CREATE_PHASE } from '@/constants/game'
import { puzzleSubmitErrorOf } from '@/core/message'
import { useGameStore } from '@/stores/game'
import type { NumBoard } from '@/types/board'
import type { CreatePhase } from '@/types/game'

/**
 * 出题页 / 编辑页共用的「题面 → 答案」两阶段状态机（§六：跨页共用的流程 → 公共组合式）
 * · 阶段与阶段数据：`phase` · `puzzleSnapshot`（提交题面时的快照，答案要与它成对）
 * · 提交题面：全空 / 空行空列空宫 / 冲突 / 40%~65% —— 规则全在 `core/message`
 * · 提交答案前：题面 + 答案成对校验（不成立就亮失败遮罩）
 * 页面级的东西（标题、缩放、POST / PATCH、跳转）留在各自流程里，不进这里
 */
export const usePuzzleStage = () => {
    const gameStore = useGameStore()

    /** 当前阶段：填题面 / 填答案 */
    const phase = ref<CreatePhase>(CREATE_PHASE.Puzzle)
    /** 提交题面时快照的题面 */
    const puzzleSnapshot = ref<NumBoard>([])
    const errorMsg = ref('')
    /** 失败遮罩（submit 类错误才弹） */
    const showFail = ref(false)

    /** 回到「填题面」阶段并清掉报错（重建 / 重新载入时用） */
    const resetStage = (): void => {
        phase.value = CREATE_PHASE.Puzzle
        puzzleSnapshot.value = []
        errorMsg.value = ''
        showFail.value = false
    }

    /** 提交题面：校验 → 锁题（规则在 core）→ 进入填答案阶段；false = 校验没过 */
    const submitPuzzle = (): boolean => {
        const bad = puzzleSubmitErrorOf(gameStore.numBoard, gameStore.config.boxSize, gameStore.sudoku)
        if (bad) {
            errorMsg.value = bad
            return false
        }
        errorMsg.value = ''
        puzzleSnapshot.value = gameStore.numBoard
        gameStore.lockPuzzle()
        phase.value = CREATE_PHASE.Solution
        return true
    }

    /** 提交答案前的成对校验：不成立就亮失败遮罩；false = 校验没过 */
    const checkSolution = (): boolean => {
        if (gameStore.sudoku.validatePuzzle(puzzleSnapshot.value, gameStore.numBoard)) return true
        errorMsg.value = '答案不完整、有冲突，或与题面不符'
        showFail.value = true
        return false
    }

    /** 关掉失败遮罩，继续修改 */
    const backToEdit = (): void => {
        showFail.value = false
        errorMsg.value = ''
    }

    return {
        phase, puzzleSnapshot, errorMsg, showFail,
        resetStage, submitPuzzle, checkSolution, backToEdit,
    }
}
