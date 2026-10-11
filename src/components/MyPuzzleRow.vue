<script setup lang="ts">
import { computed } from 'vue';
import ActionItems from './ActionItems.vue';
import { PUZZLE_VISIBILITY_COPY } from '@/constants/puzzle';
import type { Actions } from '@/types/item';
import type { MyPuzzle } from '@/types/puzzle';

const props = defineProps<{
    item: MyPuzzle
    /** 已按「显示 / 遮蔽」算好的 pid 文本 */
    pidText: string
    /** 本行按钮（闭包由页面/composable 提供） */
    actions: Actions
}>()

const visibilityText = computed<string>(() => PUZZLE_VISIBILITY_COPY[props.item.visibility])
const createdText = computed<string>(() => new Date(props.item.createdAt).toLocaleDateString('zh-CN'))
</script>

<template>
    <article class="row">
        <h3 class="row-title" :title="item.title">{{ item.title }}</h3>

        <p class="row-meta">
            {{ item.sideS }}×{{ item.sideS }} · 挖空 {{ item.blankCount }} 格 ·
            {{ visibilityText }} · {{ createdText }} · 热度 {{ item.playCount }}
        </p>

        <p class="row-pid">{{ pidText }}</p>

        <ActionItems :items="actions" />
    </article>
</template>

<style scoped>
/* .overlay-* 与列表公共类在全局；这里只有本行卡片外观 */
.row {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px 14px;
    background: #fff;
}

.row-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #111827;
    word-break: break-all;
}

.row-meta {
    margin: 6px 0 0;
    font-size: 0.78rem;
    color: #6b7280;
}

.row-pid {
    margin: 6px 0 0;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 0.78rem;
    color: #4b5563;
    word-break: break-all;
}
</style>
