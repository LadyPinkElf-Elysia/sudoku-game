import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { GAME_MODE, GAME_STATUS } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { useGameStore } from '@/stores/game'
import type { ActionDef } from '@/types/action'
import { hintTextOf } from '@/utils/hint'

/** 游戏页流程：提示文案、进入守卫、胜利遮罩与结果按钮；每页一份 */
export const useGameFlow = () => {
    const gameStore = useGameStore()
    const router = useRouter()

    const tip = ref<string>('')

    /** 生成一条提示，写进 tip */
    const hint = (): void => {
        const cands = gameStore.selected ? gameStore.getCandidates(gameStore.selected) : []
        tip.value = hintTextOf(gameStore.selectedCell, cands)
    }

    /** 胜利遮罩文案；未胜利为 null */
    const winOverlay = computed(() => {
        if (gameStore.status !== GAME_STATUS.Won) return null
        return { title: '🎉 恭喜完成', desc: '全部填对，太厉害了' }
    })

    const resultActions: ActionDef[] = [
        { key: 'home', icon: '🏠', message: '回主页', onClick: () => router.replace({ name: PAGE.Home }) },
        { key: 'again', icon: '↺', message: '再来一局', onClick: () => router.replace({ name: PAGE.Difficulty }) },
    ]

    // 直接进本页但没有棋局（含只有出题态盘面）→ 回难度页
    onMounted(() => {
        if (gameStore.mode !== GAME_MODE.Game || !gameStore.board.length) {
            router.replace({ name: PAGE.Difficulty })
        }
    })

    return { tip, hint, winOverlay, resultActions }
}
