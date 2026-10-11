<script setup lang="ts">
import { computed } from 'vue';
import ActionItems from './ActionItems.vue';
import { SEARCH_COPY } from '@/constants/puzzle';
import type { Action, Actions } from '@/types/item';
import type { SearchResult } from '@/types/puzzle';

const props = defineProps<{
    item: SearchResult
}>()

const emit = defineEmits<{ preview: [pid: string]; challenge: [pid: string] }>()

/** 出题时间（本地时区、24 小时制）：旧数据 / 旧后端没给 createdAt → 按「现在」显示，有记录就按记录 */
const createdText = computed<string>(() => new Date(props.item.createdAt || Date.now()).toLocaleString('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}))

const actions = computed<Actions>(() => {
    const preview: Action = {
        key: 'preview', icon: '👁', message: SEARCH_COPY.preview,
        onClick: () => emit('preview', props.item.pid),
    }
    const challenge: Action = {
        key: 'challenge', icon: '▶', message: SEARCH_COPY.challenge,
        onClick: () => emit('challenge', props.item.pid),
    }
    return [preview, challenge]
})
</script>

<template>
    <article class="puzzle-card">
        <h3 class="card-title">{{ item.title }}</h3>
        <p class="card-meta">
            盘面大小 {{ item.sideS }}×{{ item.sideS }} · 挖空 {{ item.blankCount }} 格 ·
            创建时间 {{ createdText }} · 热度 {{ item.playCount ?? 0 }}
        </p>
        <ActionItems :items="actions" />
    </article>
</template>

<style scoped>
.puzzle-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px 14px;
    background: #fff;
}

.card-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #111827;
    word-break: break-all;
}

.card-meta {
    margin: 6px 0 0;
    font-size: 0.78rem;
    color: #6b7280;
}
</style>
