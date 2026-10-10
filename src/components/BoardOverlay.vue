<script setup lang="ts">
import { computed } from 'vue'
import ActionItems from './ActionItems.vue'
import BoardView from './BoardView.vue'
import Overlay from './Overlay.vue'
import { useZoom } from '@/composables/board/useZoom'
import type { Action, Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'

const props = defineProps<{
    show: boolean
    input: BoardRenderInput
    title: string
    desc?: string
    closeText?: string
}>()
const emit = defineEmits<{ close: [] }>()

const { zoom, zoomActions } = useZoom()
const boardInput = computed<BoardRenderInput>(() => ({
    ...props.input,
    zoom: zoom.value,
    interactive: false,
}))

const actions = computed<Actions>(() => {
    const close: Action = { key: 'close', icon: '↩', message: props.closeText ?? '返回', onClick: () => emit('close') }
    return [...zoomActions.value, close]
})
</script>

<template>
    <Overlay :show="show">
        <p class="overlay-title">{{ title }}</p>
        <p v-if="desc" class="overlay-desc">{{ desc }}</p>
        <BoardView v-bind="boardInput" />
        <ActionItems :items="actions" />
    </Overlay>
</template>

<style scoped>
.overlay-title { margin: 0; font-size: 1.1rem; color: #111827; }
.overlay-desc  { margin: 8px 0 0; font-size: .85rem; color: #6b7280; }
</style>
