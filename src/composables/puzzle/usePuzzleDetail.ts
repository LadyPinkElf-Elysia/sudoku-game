import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { fromPuzzle } from '@/core/board/model'
import { parsePuzzle } from '@/core/sudoku/parse'
import { cellCountOf } from '@/core/sudoku/shape'
import { getOne, play } from '@/services/api/puzzleApi'
import { useGameStore } from '@/stores/game'
import { useUserStore } from '@/stores/user'
import type { PuzzleDetail } from '@/types/puzzle'
import type { BoardRenderInput } from '@/types/render'

/**
 * 题目详情：搜索页的「题目预览」遮罩、落地页 /p/:pid、挑战 三处共用同一份取数
 * （列表接口不带题面串，预览与挑战都必须回到 GET /api/puzzles/:pid）
 */
export const usePuzzleDetail = () => {
    const gameStore = useGameStore()
    const userStore = useUserStore()
    const router = useRouter()

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
    const uname = computed<string>(() => data.value?.uname ?? '')
    const sideS = computed<number>(() => data.value?.sideS ?? 0)
    const blankCount = computed<number>(() => data.value?.blankCount ?? 0)
    const createdText = computed<string>(() =>
        data.value ? new Date(data.value.createdAt).toLocaleDateString('zh-CN') : '')

    /** 取详情（预览 / 落地页 / 挑战前都要先有它） */
    const load = async (nextPid: string): Promise<void> => {
        pid.value = nextPid
        loading.value = true
        error.value = ''
        try {
            data.value = await getOne(nextPid)
        } catch (err) {
            data.value = null
            error.value = err instanceof Error ? err.message : '题目加载失败'
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
        const p = parsed.value
        const info = data.value
        if (!p || !info) return

        const solution = info.solutionText ? parsePuzzle(info.solutionText)?.board ?? [] : []
        gameStore.startGame(p.board, solution, {
            boxSize: p.boxSize,
            blankRatio: info.blankCount / cellCountOf(p.boxSize),
        })

        if (!userStore.isGuest) {
            try { await play(info.pid) } catch { /* 热度失败不影响开局 */ }
        }
        await router.push({ name: PAGE.Game })
    }

    return { pid, loading, error, title, uname, sideS, blankCount, createdText, boardInput, load, challenge }
}
