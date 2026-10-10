<script setup lang="ts">
import ActionItems from '@/components/ActionItems.vue';
import BoardView from '@/components/BoardView.vue';
import NumberPad from '@/components/NumberPad.vue';
import Overlay from '@/components/Overlay.vue';
import HistoryBar from '@/components/HistoryBar.vue';
import { PAGE } from '@/constants/pages';
import { useGameStore } from '@/stores/game';
import { useGameFlow } from '@/composables/useGameFlow';
import { useZoom } from '@/composables/useZoom';
import type { ActionDef } from '@/types/action';
import type { RenderParams } from '@/types/canvas';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const gameStore = useGameStore()
const router = useRouter()
const { zoom, zoomIn, zoomOut, canZoomIn, canZoomOut } = useZoom()
const { tip, hint, winOverlay, resultActions } = useGameFlow()

/** 棋盘渲染入参：一个对象喂给 BoardView */
const boardParams = computed<Omit<RenderParams, 'canvas'>>(() => ({
    board: gameStore.board,
    boxSize: gameStore.sudoku.B,
    selected: gameStore.selected,
    conflictMask: gameStore.conflictMask,
    zoom: zoom.value,
    // interactive 省略 → 走 BoardView 的 withDefaults(true)
}))

const actions = computed<ActionDef[]>(() => [
    { key: 'difficulty', icon: '◀', message: '返回', onClick: () => router.replace({ name: PAGE.Difficulty }) },
    { key: 'zoomOut', icon: '➖', message: '缩小', disabled: !canZoomOut.value, onClick: zoomOut },
    { key: 'zoomIn', icon: '➕', message: '放大', disabled: !canZoomIn.value, onClick: zoomIn },
    { key: 'hint', icon: '💡', message: '提示', onClick: hint },
    ...(import.meta.env.DEV ? [{ key: 'answer', icon: '⚡', message: '作弊', onClick: gameStore.cheat }] : []),
])
</script>


<template>
    <div class="page-card wide">
        <ActionItems :items="actions">
            <template v-if="tip" #tip>{{ tip }}</template>
        </ActionItems>
        <BoardView v-bind="boardParams" @cell-click="gameStore.select"></BoardView>
        <HistoryBar :count="gameStore.snapshots.length" :current="gameStore.currentStep" @select="gameStore.jump"/>
        <NumberPad :max="gameStore.sudoku.S" :columns="gameStore.sudoku.B" @pick="gameStore.inputNum"></NumberPad>

        <Overlay :show="!!winOverlay">
            <p class="overlay-title">{{ winOverlay?.title }}</p>
            <p class="overlay-desc">{{ winOverlay?.desc }}</p>
            <ActionItems :items="resultActions" />
        </Overlay>
    </div>
</template>

<style scoped>
.overlay-title {
    margin: 0;
    font-size: 1.1rem;
    color: #111827;
}

.overlay-desc {
    margin: 8px 0 0;
    font-size: 0.85rem;
    color: #6b7280;
}
</style>