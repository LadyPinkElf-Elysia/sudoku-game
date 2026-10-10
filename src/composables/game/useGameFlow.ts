import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { GAME_COPY, GAME_MODE, GAME_STATUS } from '@/constants/game'   // ① GAME_COPY
import { PAGE } from '@/constants/pages'
import { useGameStore } from '@/stores/game'
import { fromPuzzle } from '@/core/board/model'
import { hintTextOf } from '@/core/game/derive'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'

export const useGameFlow = () => {
    const gameStore = useGameStore()
    const router = useRouter()

    const tip = ref('')
    /** 参考答案遮罩开关 */
    const answerOpen = ref(false)

    /** ② 遮罩里的只读盘：由答案生成一块独立 Board（与游玩盘无关），整对象交给 BoardOverlay */
    const answerInput = computed<BoardRenderInput>(() => ({
        board: gameStore.solution.length ? fromPuzzle(gameStore.solution, true) : [],
        boxSize: gameStore.sudoku.B,
    }))

    const goBack = (): void => {
        if (router.options.history.state.back) router.back()
        else router.replace({ name: PAGE.Difficulty })
    }
    const restart = (): void => {
        gameStore.jump(0)
        answerOpen.value = false            // ③ 重开时收起遮罩
    }
    const hint = (): void => {
        const cands = gameStore.selected ? gameStore.getCandidates(gameStore.selected) : []
        tip.value = hintTextOf(gameStore.selectedCell, cands)
    }

    const leadActions = computed<Actions>(() => [
        { key: 'back',    icon: '◀', message: '返回', onClick: goBack },
        { key: 'restart', icon: '↺', message: '重开', onClick: restart },
    ])
    const trailActions = computed<Actions>(() => [
        { key: 'hint', icon: '💡', message: '提示', onClick: hint },
        ...(gameStore.solution.length
            ? [{ key: 'answer', icon: '📖', message: '参考答案', onClick: () => { answerOpen.value = true } }]
            : []),
        ...(import.meta.env.DEV
            ? [{ key: 'cheat', icon: '⚡', message: '作弊', onClick: gameStore.cheat }]
            : []),
    ])
    const resultActions: Actions = [
        { key: 'home',    icon: '🏠', message: '回主页', onClick: () => router.replace({ name: PAGE.Home }) },
        { key: 'restart', icon: '↺', message: '重开',   onClick: restart },
    ]
    const winOverlay = computed(() => (gameStore.status === GAME_STATUS.Won ? GAME_COPY.win : null))

    onMounted(() => {
        if (gameStore.mode !== GAME_MODE.Game || !gameStore.board.length) {
            router.replace({ name: PAGE.Difficulty })
        }
    })

    return { tip, answerOpen, answerInput, leadActions, trailActions, resultActions, winOverlay }
}
