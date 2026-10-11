import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CREATE_PHASE, GAME_INIT_CONFIG, RATIO_COPY, TITLE_MAX, TITLE_PREFIX } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { countBlanks, isBlankBoard } from '@/core/board/ops'
import { percentOf } from '@/core/game/derive'
import { boardToStr } from '@/core/sudoku/parse'
import { cellCountOf, isBlankRatioOk, sideOf } from '@/core/sudoku/shape'
import { create } from '@/services/api/puzzleApi'
import { useGameStore } from '@/stores/game'
import type { NumBoard } from '@/types/board'
import type { CreatePhase } from '@/types/game'

/** 默认标题「我的题目 9×9」（边长来自 core，不写字面量） */
const defaultTitleOf = (boxSize: number): string => {
    const s = sideOf(boxSize)
    return `${TITLE_PREFIX} ${s}×${s}`
}

/**
 * 出题页流程：标题 + 题面/答案两阶段 + 40%~70% 校验 + POST 入库
 * 每页一份；缩放由页面注入，避免再次 useZoom() 产生第二份 zoom
 */
export const useCreateFlow = (resetZoom: () => void) => {
    const gameStore = useGameStore()
    const router = useRouter()

    /** 当前阶段：填题面 / 填答案 */
    const phase = ref<CreatePhase>(CREATE_PHASE.Puzzle)
    /** 提交题目时快照的题面 */
    const puzzleSnapshot = ref<NumBoard>([])
    const title = ref(defaultTitleOf(GAME_INIT_CONFIG.boxSize))
    const errorMsg = ref('')
    const loading = ref(false)
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

    /** 重建一盘空题（切盘面用） */
    const restart = (boxSize: number): void => {
        reset()
        gameStore.startCreate(boxSize)
        resetZoom()
    }

    /** 切换盘面大小：必须重建 board，否则键盘与盘面尺寸不一致 */
    const changeBoxSize = (b: number): void => {
        if (b === gameStore.config.boxSize) return
        const custom = title.value.trim() && title.value !== defaultTitleOf(gameStore.config.boxSize)
            ? title.value
            : ''
        restart(b)
        // 用户改过标题就保留，否则跟随新尺寸给默认名
        title.value = custom || defaultTitleOf(b)
    }

    /** 出题完成 → 去「我的题目」（与编辑完成一致；回主页走顶栏那一个入口） */
    const goMine = (): void => { void router.replace({ name: PAGE.MyPuzzles }) }

    /** 提交题面 → 非空 + 无冲突 + 40%~70% → 锁题进入填答案阶段 */
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

    /** 提交答案 → 校验（含标题）→ 转圈入库 → 完成遮罩 */
    const submitSolution = async (): Promise<void> => {
        if (loading.value) return
        if (!gameStore.sudoku.validatePuzzle(puzzleSnapshot.value, gameStore.numBoard)) {
            errorMsg.value = '答案不完整、有冲突，或与题面不符'
            showFail.value = true
            return
        }
        const name = title.value.trim()
        if (!name || name.length > TITLE_MAX) {
            errorMsg.value = `标题必填（1~${TITLE_MAX} 位）`
            showFail.value = true
            return
        }

        loading.value = true
        try {
            await create({
                title: name,
                puzzleText: boardToStr(puzzleSnapshot.value),
                solutionText: boardToStr(gameStore.numBoard),
            })
            showSuccess.value = true
        } catch (err) {
            errorMsg.value = err instanceof Error ? err.message : '提交失败，请重试'
            showFail.value = true
        } finally {
            loading.value = false
        }
    }

    /** 关掉失败遮罩，继续修改 */
    const backToEdit = (): void => {
        showFail.value = false
        errorMsg.value = ''
    }

    onMounted(() => restart(GAME_INIT_CONFIG.boxSize))

    return {
        phase, title, errorMsg, loading, showSuccess, showFail,
        changeBoxSize, goMine,
        submitPuzzle, submitSolution, backToEdit,
    }
}
