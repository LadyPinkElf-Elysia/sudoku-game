import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { GAME_INIT_CONFIG } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { useGameStore } from '@/stores/game'
import type { GameConfig } from '@/types/game'
import { cellCountOf, blankCountOf } from '@/core/sudoku/shape'
import { generateInWorker } from '@/services/sudoku/workerClient'
import { percentOf } from '@/core/game/derive'

/** 难度页：配置草稿 → 后台生成题目 → 开局并跳转；每页一份 */
export const useDifficultyFlow = () => {
    const gameStore = useGameStore()
    const router = useRouter()

    const draft = ref({ ...GAME_INIT_CONFIG })
    const loading = ref(false)
    const error = ref('')

    const totalCells = computed(() => cellCountOf(draft.value.boxSize))
    const blankCount = computed(() => blankCountOf(draft.value.boxSize, draft.value.blankRatio))
    const blankPercent = computed<number>(() => percentOf(draft.value.blankRatio))
    /** 生成并开局 */
    const apply = async (): Promise<void> => {
        if (loading.value) return
        error.value = ''
        loading.value = true
        try {
            const cfg: GameConfig = { boxSize: draft.value.boxSize, blankRatio: draft.value.blankRatio }
            const { puzzle, solution } = await generateInWorker(cfg.boxSize, blankCount.value)
            gameStore.startGame(puzzle, solution, cfg)
            router.replace({ name: PAGE.Game })
        } catch (err) {
            error.value = err instanceof Error ? err.message : '生成失败，请重试'
        } finally {
            loading.value = false        // ← 修复：原先成功路径不复位，overlay 会残留
        }
    }

    return { draft, loading, error, totalCells, blankCount,blankPercent, apply }
}
