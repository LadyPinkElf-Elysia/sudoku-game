import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { fromPuzzle } from '@/core/board/model'
import { errorTextOf } from '@/core/message'
import { parsePuzzle } from '@/core/sudoku/parse'
import { useStartFromTexts } from '@/composables/game/useStartFromTexts'
import { getOne, play } from '@/services/api/puzzleApi'
import { useUserStore } from '@/stores/user'
import { metaTextOf } from './metaText'
import type { PuzzleDetail } from '@/types/puzzle'
import type { BoardRenderInput } from '@/types/render'

/**
 * 题目详情：搜索页的「题目预览」遮罩、落地页 /p/:pid、挑战 三处共用同一份取数
 * （列表接口不带题面串，预览与挑战都必须回到 GET /api/puzzles/:pid）
 */
export const usePuzzleDetail = () => {
    const userStore = useUserStore()
    const router = useRouter()
    /** 「挑战」开局：题面 / 答案串 → 棋局真源（业务编排收在这个组合式里） */
    const startFromTexts = useStartFromTexts()

    const pid = ref('')
    const data = ref<PuzzleDetail | null>(null)
    const loading = ref(false)
    const error = ref('')

    /** 题面串 → { 盘面, 宫边长 }（格式非法为 null） */
    const parsed = computed(() => (data.value ? parsePuzzle(data.value.puzzleText) : null))

    /** 只读盘（预览与落地页共用；挑战也用同一份题面） */
    const boardInput = computed<BoardRenderInput>(() => ({
        board: parsed.value ? fromPuzzle(parsed.value.board, true) : [],
        boxSize: parsed.value?.boxSize ?? 0,
    }))

    const title = computed<string>(() => data.value?.title ?? '')
    /** 元信息行文本（文案与时间格式都在 metaTextOf 一处；与列表项、游戏页同一份） */
    const metaText = computed<string>(() => metaTextOf({
        sideS: data.value?.sideS ?? 0,
        blankCount: data.value?.blankCount ?? 0,
        createdAt: data.value?.createdAt ?? 0,
        author: data.value?.uname ?? '',
    }))

    /** 取详情（预览 / 落地页 / 挑战前都要先有它） */
    const load = async (nextPid: string): Promise<void> => {
        pid.value = nextPid
        loading.value = true
        error.value = ''
        try {
            data.value = await getOne(nextPid)
        } catch (err) {
            data.value = null
            error.value = errorTextOf(err, '题目加载失败')
        } finally {
            loading.value = false
        }
    }

    /**
     * 挑战：以该题题面开局并跳游戏页
     * · 答案按 show_solution 下发，缺失也能玩（胜负判定走规则，不依赖答案串）
     * · 热度只对已登录用户上报（服务端 1 人 1 小时去重；作者不计）
     */
    const challenge = async (): Promise<void> => {
        const info = data.value
        if (!info) return

        // 题面 / 答案串 → 开局（解析与比例在 core，来源 = Challenge；落地页不带来源信息）
        if (!startFromTexts(info.puzzleText, info.solutionText ?? '', info.blankCount)) return

        if (!userStore.isGuest) {
            try { await play(info.pid) } catch { /* 热度失败不影响开局 */ }
        }
        await router.push({ name: PAGE.Game })
    }

    return { pid, loading, error, title, metaText, boardInput, load, challenge }
}
