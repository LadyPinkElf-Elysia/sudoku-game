<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElEmpty, ElMessageBox } from 'element-plus'
import ActionBar from '@/components/ActionBar.vue'
import Flex from '@/components/Flex.vue'
import TipLine from '@/components/TipLine.vue'
import { ACTION, ACTION_OF as actionOf } from '@/constants/actions'
import { LOADING_COPY, SAVE_COPY } from '@/constants/copy'
import { SAVE_NAME_MAX } from '@/constants/game'
import { dateTimeTextOf } from '@/composables/puzzle/metaText'
import { useGameSave } from '@/composables/game/useGameSave'
import type { GameSave } from '@/types/game'
import type { Actions } from '@/types/item'

/**
 * 继续游戏：**存档列表** —— 一条存档 = 一个条（标题 + 「存档于 … · 进度 n 步」+ 两颗文字按钮）
 * · 业务全在 useGameSave（列表 / 继续 / 删除）；本页只负责摆位置
 */
const { saves, hasData, tip, resume, remove, rename } = useGameSave()

/** 空态文案：分清"没存过"和"存了但读不出来"（后者多半是校验/版本不匹配） */
const emptyText = computed<string>(() =>
    (saves.value.length ? '' : hasData.value ? SAVE_COPY.broken : SAVE_COPY.empty))

/** 继续：恢复真源 + 跳游戏页（首次可能还要下载路由分块）→ 全屏加载，避免像卡住 */
const resuming = ref(false)
const startSave = async (id: string): Promise<void> => {
    if (resuming.value) return
    resuming.value = true
    try {
        await resume(id)
    } finally {
        resuming.value = false
    }
}

/** 存档条两行文案：优先玩家起的名字，其次题目标题，最后来源名（时间格式复用 metaText 那一份） */
const titleOf = (item: GameSave): string => item.name || item.meta.title || SAVE_COPY.origin[item.origin]
const infoOf = (item: GameSave): string =>
    `${SAVE_COPY.savedAt} ${dateTimeTextOf(item.savedAt, false)} · ${SAVE_COPY.stepLabel} ${item.currentStep} ${SAVE_COPY.stepUnit}`

/** 行内改名：同一个命名弹框（预填当前显示的名字），空名字 / 超长就地提示 */
const askingRename = ref(false)
const askRename = async (item: GameSave): Promise<void> => {
    if (askingRename.value) return
    askingRename.value = true
    try {
        const { value } = await ElMessageBox.prompt(SAVE_COPY.namePrompt, SAVE_COPY.renameTitle, {
            inputValue: titleOf(item),
            inputPlaceholder: SAVE_COPY.namePlaceholder,
            confirmButtonText: ACTION.renameSave.text,
            cancelButtonText: ACTION.cancel.text,
            inputValidator: (raw) => {
                const name = (raw ?? '').trim()
                return name && name.length <= SAVE_NAME_MAX ? true : SAVE_COPY.nameInvalid
            },
        })
        rename(item.id, value)
    } catch {
        // 取消 / 关闭 → 什么都不做
    } finally {
        askingRename.value = false
    }
}

/** 每条存档右侧三颗按钮：继续 / 重命名 / 删除（文案在 constants/actions.ts） */
const rowActions = (item: GameSave): Actions => [
    actionOf(ACTION.resumeSave, () => { void startSave(item.id) }),
    actionOf(ACTION.renameSave, () => { void askRename(item) }),
    actionOf(ACTION.removeSave, () => { remove(item.id) }),
]
</script>

<template>
    <div class="page-card wide" v-loading.fullscreen.lock="resuming" :element-loading-text="LOADING_COPY.game">
        <h2 class="section-title">{{ SAVE_COPY.title }}</h2>

        <el-empty v-if="!saves.length" :description="emptyText" />

        <Flex v-else direction="column" :gap="10" align="stretch">
            <article v-for="s in saves" :key="s.id" class="item-card save-item">
                <Flex align="baseline" justify="between" :gap="10" wrap>
                    <div class="save-text">
                        <h3 class="item-title">{{ titleOf(s) }}</h3>
                        <p class="meta-line">{{ infoOf(s) }}</p>
                    </div>

                    <ActionBar :actions="rowActions(s)" :gap="14" />
                </Flex>
            </article>
        </Flex>

        <TipLine :text="tip" />
    </div>
</template>

<style scoped>
/* .page-card / .section-title / .item-card / .item-title / .meta-line / .tip 来自全局；
   空态用 EP 的 el-empty，时间格式来自 metaText.dateTimeTextOf */

/* 存档条：比列表卡片矮一点（只有两行文字 + 两颗按钮） */
.save-item {
    padding: 10px 12px;
}

/* 标题过长时省略，不要挤走右侧按钮 */
.save-text {
    min-width: 0;
}
</style>
