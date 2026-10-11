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

/** 出题日期（本机时区，与「我的题目」行同格式） */
const createdText = computed<string>(() => new Date(props.item.createdAt).toLocaleDateString('zh-CN'))

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
            {{ item.sideS }}×{{ item.sideS }} · 挖空 {{ item.blankCount }} 格 ·
            {{ createdText }} · 热度 {{ item.playCount }}
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
