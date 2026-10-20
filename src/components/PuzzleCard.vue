<script setup lang="ts">
import { computed } from 'vue';
import Flex from './Flex.vue';
import TextAction from './TextAction.vue';
import { SEARCH_COPY } from '@/constants/copy';
import { metaTextOf } from '@/composables/puzzle/metaText';
import type { Action, Actions } from '@/types/item';
import type { SearchResult } from '@/types/puzzle';

const props = defineProps<{
    item: SearchResult
}>()

const emit = defineEmits<{ preview: [pid: string]; challenge: [pid: string] }>()

/** 元信息行文本（组件只画一行；文案与时间格式在 metaTextOf 一处） */
const metaText = computed<string>(() => metaTextOf(props.item))

const actions = computed<Actions>(() => {
    const preview: Action = {
        key: 'preview', text: `👁 ${SEARCH_COPY.preview}`,
        onClick: () => emit('preview', props.item.pid),
    }
    const challenge: Action = {
        key: 'challenge', text: `▶ ${SEARCH_COPY.challenge}`,
        onClick: () => emit('challenge', props.item.pid),
    }
    return [preview, challenge]
})
</script>

<template>
    <!-- 公开列表项（搜索页，选项少）：外壳是全局 .item-card，这里只画自己的内容 -->
    <article class="item-card">
        <Flex class="item-head" align="baseline" justify="between" :gap="8">
            <div class="item-title-line">
                <h3 class="item-title" :title="item.title">{{ item.title }}</h3>
            </div>
        </Flex>

        <p class="meta-line">{{ metaText }}</p>

        <Flex class="op-bar" :gap="6" justify="center">
            <TextAction v-for="a in actions" :key="a.key" :text="a.text" :on-click="a.onClick" />
        </Flex>
    </article>
</template>
