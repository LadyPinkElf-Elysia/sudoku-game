import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { usePuzzleStage } from '@/composables/game/usePuzzleStage'
import { errorTextOf } from '@/core/message'
import { boardToStr, parsePuzzle } from '@/core/sudoku/parse'
import { getOne, update } from '@/services/api/puzzleApi'
import { useGameStore } from '@/stores/game'

/**
 * 编辑页流程（FR-10）：进入预填自己的题面（未锁定）→（提交题面 / 提交答案与校验交给
 * usePuzzleStage，出题页共用）→ PATCH → 回「我的题目」；不改 created_at，也不含标题/可见性
 */
export const useEditFlow = () => {
    const route = useRoute()
    const router = useRouter()
    const gameStore = useGameStore()

    /** 两阶段状态机（阶段 / 题面快照 / 报错 / 失败遮罩）—— 与出题页共用一份 */
    const { phase, puzzleSnapshot, errorMsg, showFail, resetStage, submitPuzzle, checkSolution, backToEdit } =
        usePuzzleStage()

    const pid = ref('')
    const loading = ref(false)

    const goMyPuzzles = (): void => { void router.replace({ name: PAGE.MyPuzzles }) }

    /** 载入自己的题面（不预填旧答案） */
    const load = async (): Promise<void> => {
        const id = String(route.params.pid ?? '')
        if (!id) { goMyPuzzles(); return }

        loading.value = true
        resetStage()       // 回到「填题面」阶段（清掉上一轮残留）
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
        } catch (err) {
            errorMsg.value = errorTextOf(err, '题目加载失败')
            showFail.value = true
        } finally {
            loading.value = false
        }
    }

    /** 提交答案：成对校验 → 转圈 PATCH（题面/答案成对提交）→ 回「我的题目」 */
    const submitSolution = async (): Promise<void> => {
        if (loading.value) return
        if (!checkSolution()) return

        loading.value = true
        try {
            await update(pid.value, {
                puzzleText: boardToStr(puzzleSnapshot.value),
                solutionText: boardToStr(gameStore.numBoard),
            })
            goMyPuzzles()
        } catch (err) {
            errorMsg.value = errorTextOf(err, '保存失败，请重试')
            showFail.value = true
        } finally {
            loading.value = false
        }
    }

    onMounted(() => { void load() })

    return { pid, phase, errorMsg, loading, showFail, load, submitPuzzle, submitSolution, backToEdit, goMyPuzzles }
}
