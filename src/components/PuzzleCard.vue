<script setup lang="ts">
import { computed } from 'vue';
import ActionItems from './ActionItems.vue';
import PuzzleCardShell from './PuzzleCardShell.vue';
import { SEARCH_COPY } from '@/constants/puzzle';
import type { Action, Actions } from '@/types/item';
import type { SearchResult } from '@/types/puzzle';

const props = defineProps<{
    item: SearchResult
}>()

const emit = defineEmits<{ preview: [pid: string]; challenge: [pid: string] }>()

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
    <!-- 外壳（标题 + 元信息行 PuzzleMeta）与「我的题目」行共用；这里只挂搜索页的两个按钮 -->
    <PuzzleCardShell :title="item.title" :side-s="item.sideS" :blank-count="item.blankCount"
        :created-at="item.createdAt" :play-count="item.playCount">
        <ActionItems :items="actions" />
    </PuzzleCardShell>
</template>
