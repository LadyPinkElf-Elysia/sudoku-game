import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { GAME_INIT_CONFIG, GAME_MODE, TITLE_MAX, TITLE_PREFIX } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { usePuzzleStage } from '@/composables/game/usePuzzleStage'
import { errorTextOf } from '@/core/message'
import { boardToStr } from '@/core/sudoku/parse'
import { sideOf } from '@/core/sudoku/shape'
import { create } from '@/services/api/puzzleApi'
import { useGameStore } from '@/stores/game'

/** 默认标题「我的题目 9×9」（边长来自 core，不写字面量） */
const defaultTitleOf = (boxSize: number): string => {
    const s = sideOf(boxSize)
    return `${TITLE_PREFIX} ${s}×${s}`
}

/**
 * 出题页流程：标题 + POST 入库；题面/答案两阶段与校验交给 usePuzzleStage（编辑页共用）
 * 每页一份；缩放不在这里管（页面的 `useBoardZoom` 跟着盘面大小走）
 */
export const useCreateFlow = () => {
    const gameStore = useGameStore()
    const router = useRouter()

    /** 两阶段状态机（阶段 / 题面快照 / 报错 / 失败遮罩）—— 与编辑页共用一份 */
    const { phase, puzzleSnapshot, errorMsg, showFail, resetStage, submitPuzzle, checkSolution, backToEdit } =
        usePuzzleStage()

    const title = ref(defaultTitleOf(GAME_INIT_CONFIG.boxSize))
    const loading = ref(false)
    const showSuccess = ref(false)

    /** 重置本地流程状态（阶段那部分交给 usePuzzleStage） */
    const reset = (): void => {
        resetStage()
        showSuccess.value = false
    }

    /** 重建一盘空题（切盘面用）：语义（出题模式）在调用处，store 只认 mode 数据 */
    const restart = (boxSize: number): void => {
        reset()
        gameStore.startInput(GAME_MODE.Create, boxSize)
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

    /** 提交答案 → 成对校验（含标题）→ 转圈入库 → 完成遮罩 */
    const submitSolution = async (): Promise<void> => {
        if (loading.value) return
        if (!checkSolution()) return
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
            errorMsg.value = errorTextOf(err, '提交失败，请重试')
            showFail.value = true
        } finally {
            loading.value = false
        }
    }

    onMounted(() => restart(GAME_INIT_CONFIG.boxSize))

    return {
        phase, title, errorMsg, loading, showSuccess, showFail,
        changeBoxSize, goMine,
        submitPuzzle, submitSolution, backToEdit,
    }
}
