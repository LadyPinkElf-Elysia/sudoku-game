<script setup lang="ts">
import { computed } from 'vue'
import ActionItems from '@/components/ActionItems.vue'
import BoardView from '@/components/BoardView.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import NumberPad from '@/components/NumberPad.vue'
import Overlay from '@/components/Overlay.vue'
import { CREATE_PHASE } from '@/constants/game'
import { useGameStore } from '@/stores/game'
import { useZoom } from '@/composables/board/useZoom'
import { useEditFlow } from '@/composables/game/useEditFlow'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'

const gameStore = useGameStore()
const { zoom, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut } = useZoom()
const {
    phase, errorMsg, loading, showFail,
    submitPuzzle, submitSolution, backToEdit, goMyPuzzles,
} = useEditFlow(resetZoom)

/** 棋盘渲染入参：一个对象喂给 BoardView */
const boardParams = computed<BoardRenderInput>(() => ({
    board: gameStore.board,
    boxSize: gameStore.sudoku.B,
    selected: gameStore.selected,
    conflictMask: gameStore.conflictMask,
    zoom: zoom.value,
}))

/** 按钮条：返回「我的题目」+ 缩放 + 按阶段切换的提交 */
const actions = computed<Actions>(() => [
    { key: 'back', icon: '←', message: '我的题目', onClick: goMyPuzzles },
    { key: 'zoomOut', icon: '➖', message: '缩小', disabled: !canZoomOut.value, onClick: zoomOut },
    { key: 'zoomIn', icon: '➕', message: '放大', disabled: !canZoomIn.value, onClick: zoomIn },
    {
        key: 'submit',
        icon: '📤',
        message: phase.value === CREATE_PHASE.Puzzle ? '提交题目' : '提交答案',
        onClick: phase.value === CREATE_PHASE.Puzzle ? submitPuzzle : submitSolution,
    },
])

const failActions: Actions = [
    { key: 'back', icon: '↩', message: '继续修改', onClick: backToEdit },
]
</script>

<template>
    <div class="page-card wide">
        <!-- FR-10：没有大小选择器、没有标题/可见性/参考答案开关 -->
        <ActionItems :items="actions">
            <template v-if="errorMsg && !showFail" #tip>{{ errorMsg }}</template>
        </ActionItems>

        <BoardView v-bind="boardParams" @cell-click="gameStore.select" />
        <NumberPad :max="gameStore.sudoku.S" :columns="gameStore.sudoku.B" @pick="gameStore.inputNum" />

        <LoadingOverlay :show="loading" title="正在处理…" />

        <Overlay :show="showFail">
            <p class="overlay-title">⚠️ 未通过</p>
            <p class="overlay-desc">{{ errorMsg }}</p>
            <ActionItems :items="failActions" />
        </Overlay>
    </div>
</template>
