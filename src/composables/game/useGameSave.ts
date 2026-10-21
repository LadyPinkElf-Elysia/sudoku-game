import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { SAVE_COPY } from '@/constants/copy'
import { useTip } from '@/composables/useTip'
import { SAVE } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { addSave, hasSaveData, readSaves, removeSaveById } from '@/services/saveGame'
import { useGameStore } from '@/stores/game'
import type { GameSave } from '@/types/game'

/**
 * 一局存档（本地）：游戏页「💾 存档」写入、**继续游戏页按条列出**（每条两个文字按钮：继续 / 删除）
 * · 存的是**真源**（配置 / 来源 / 题目信息 / 答案 / 历史快照 / 当前步 / 选中），派生值恢复时重算
 * · 落盘在 `services/saveGame.ts`（localStorage，一张表）；这里只做编排：组数据、给提示、恢复并跳页
 * · **为什么在 composable**：它要读 store、写提示、跳页 —— 业务编排；store 只留 `restoreGame` 这个纯写入
 * · **只做"业务"**：行内文案（标题 / 存档时间 / 进度）由列表页自己拼 —— 只有它在用（见 ResumePage.vue）
 */
export const useGameSave = () => {
    const gameStore = useGameStore()
    const router = useRouter()

    /** **本局的存档 id**：一次进入游戏页 = 一条；同一局重复点「💾 存档」覆盖这一条 */
    const slotId = String(Date.now())
    /** 存档列表（继续游戏页渲染它就够；服务侧已按存档时间倒序） */
    const saves = ref<GameSave[]>(readSaves())
    /** 本地有没有存档数据（区分"没存过"与"存了但读不出来"；随增删刷新） */
    const hasData = ref<boolean>(hasSaveData())
    /** 一次性提示（空盘 / 存不下 / 已删除 / 没存档）—— **3 秒后自动淡出**，游戏页与继续游戏页共用 */
    const { tip, showTip } = useTip()

    /** 本局已存档的话，上次起的名字（命名弹框预填，避免覆盖时把自定义名丢了） */
    const currentName = computed<string>(() => saves.value.find((item) => item.id === slotId)?.name ?? '')

    /** 重新读表（增删之后同步列表） */
    const refresh = (): void => {
        saves.value = readSaves()
        hasData.value = hasSaveData()
    }

    /** 存档：`name` 是玩家给这局起的名字（留空 = 列表里回退显示题目名 / 来源名） */
    const save = (name = ''): string => {
        if (!gameStore.board.length) {
            showTip(SAVE_COPY.empty)
            return tip.value
        }

        const data: GameSave = {
            version: SAVE.version,
            id: slotId,
            savedAt: Date.now(),
            origin: gameStore.origin,
            meta: { ...gameStore.meta },
            config: { ...gameStore.config },
            solution: gameStore.solution,
            snapshots: gameStore.snapshots,
            currentStep: gameStore.currentStep,
            selected: gameStore.selected,
        }
        const trimmed = name.trim()
        if (trimmed) data.name = trimmed

        showTip(addSave(data) ? SAVE_COPY.saved : SAVE_COPY.tooBig)
        refresh()
        return tip.value
    }

    /** 继续某一条：恢复真源后跳游戏页；false = 这条已经不在了 */
    const resume = async (id: string): Promise<boolean> => {
        const data = saves.value.find((item) => item.id === id)
        if (!data) {
            refresh()
            showTip(SAVE_COPY.empty)
            return false
        }
        gameStore.restoreGame(data)
        await router.push({ name: PAGE.Game })
        return true
    }

    /** 删某一条（就地刷新列表） */
    const remove = (id: string): void => {
        showTip(removeSaveById(id) ? SAVE_COPY.removed : SAVE_COPY.empty)
        refresh()
    }

    /** 改名：写回同一条（id 不变 → 列表顺序按存档时间不变）；空名字不接受 */
    const rename = (id: string, name: string): string => {
        const data = saves.value.find((item) => item.id === id)
        if (!data) {
            refresh()
            showTip(SAVE_COPY.empty)
            return tip.value
        }
        const trimmed = name.trim()
        if (!trimmed) {
            showTip(SAVE_COPY.nameInvalid)
            return tip.value
        }
        showTip(addSave({ ...data, name: trimmed }) ? SAVE_COPY.renamed : SAVE_COPY.tooBig)
        refresh()
        return tip.value
    }

    return { saves, hasData, tip, currentName, save, resume, remove, rename }
}
