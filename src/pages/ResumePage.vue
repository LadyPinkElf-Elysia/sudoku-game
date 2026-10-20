<script setup lang="ts">
import { computed } from 'vue'
import Flex from '@/components/Flex.vue'
import TextAction from '@/components/TextAction.vue'
import { ACTION } from '@/constants/actions'
import { SAVE_COPY } from '@/constants/copy'
import { actionOf } from '@/core/action'
import { useGameSave } from '@/composables/game/useGameSave'
import { hasSaveData } from '@/services/saveGame'
import type { GameSave } from '@/types/game'
import type { Actions } from '@/types/item'

/**
 * 继续游戏：**存档列表** —— 一条存档 = 一个条（标题 + 「存档于 … · 进度 n 步」+ 两颗文字按钮）
 * · 业务全在 useGameSave（列表 / 继续 / 删除）；本页只负责摆位置
 */
const { saves, tip, resume, remove } = useGameSave()

/** 空态文案：分清"没存过"和"存了但读不出来"（后者多半是校验/版本不匹配） */
const emptyText = computed<string>(() =>
    (saves.value.length ? '' : hasSaveData() ? SAVE_COPY.broken : SAVE_COPY.empty))

/** 存档条上的时间（本地时区、24 小时制、带分钟）—— 只有这个列表用，所以写在页面里 */
const savedAtTextOf = (ms: number): string => new Date(ms).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

/** 存档条两行文案：标题（题目标题 / 来源）+「存档于 … · 进度 n 步」 */
const titleOf = (item: GameSave): string => item.meta.title || SAVE_COPY.origin[item.origin]
const infoOf = (item: GameSave): string =>
    `${SAVE_COPY.savedAt} ${savedAtTextOf(item.savedAt)} · ${SAVE_COPY.stepLabel} ${item.currentStep} ${SAVE_COPY.stepUnit}`

/** 每个存档条右侧两颗文字按钮：继续 / 删除（文案在 constants/actions.ts） */
const rowActions = (item: GameSave): Actions => [
    actionOf(ACTION.resumeSave, () => { void resume(item.id) }),
    actionOf(ACTION.removeSave, () => { remove(item.id) }),
]
</script>

<template>
    <div class="page-card wide">
        <h2 class="section-title">{{ SAVE_COPY.title }}</h2>

        <p v-if="!saves.length" class="state">{{ emptyText }}</p>

        <Flex v-else direction="column" :gap="10">
            <article v-for="s in saves" :key="s.id" class="item-card save-item">
                <Flex align="baseline" justify="between" :gap="10" wrap>
                    <div class="save-text">
                        <h3 class="item-title">{{ titleOf(s) }}</h3>
                        <p class="meta-line">{{ infoOf(s) }}</p>
                    </div>

                    <Flex :gap="14">
                        <TextAction v-for="a in rowActions(s)" :key="a.key" :text="a.text" :on-click="a.onClick" />
                    </Flex>
                </Flex>
            </article>
        </Flex>

        <p v-if="tip" class="tip">{{ tip }}</p>
    </div>
</template>

<style scoped>
/* .page-card / .section-title / .state / .item-card / .item-title / .meta-line / .tip 均来自全局样式 */

/* 存档条：比列表卡片矮一点（只有两行文字 + 两颗按钮） */
.save-item {
    padding: 10px 12px;
}

/* 标题过长时省略，不要挤走右侧按钮 */
.save-text {
    min-width: 0;
}
</style>
