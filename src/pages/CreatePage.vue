<script setup lang="ts">
import { computed } from 'vue'
import ActionItems from '@/components/ActionItems.vue'
import BoardView from '@/components/BoardView.vue'
import NumberPad from '@/components/NumberPad.vue'
import Overlay from '@/components/Overlay.vue'
import { BOX_SIZE_OPTIONS, CREATE_PHASE } from '@/constants/game'
import { useGameStore } from '@/stores/game'
import { useZoom } from '@/composables/board/useZoom'
import { useCreateFlow } from '@/composables/game/useCreateFlow'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'

const gameStore = useGameStore()
const { zoom, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut } = useZoom()
const {
    phase, errorMsg, showSuccess, showFail,
    changeBoxSize, createAgain, goHome,
    submitPuzzle, submitSolution, backToEdit,
} = useCreateFlow(resetZoom)

/** v-model 适配：读 store 的盘面大小，写回走流程切换 */
const boxSize = computed<number>({
    get: () => gameStore.config.boxSize,
    set: (b: number) => changeBoxSize(b),
})

/** 棋盘渲染入参：一个对象喂给 BoardView */
const boardParams = computed<BoardRenderInput>(() => ({
    board: gameStore.board,
    boxSize: gameStore.sudoku.B,
    selected: gameStore.selected,
    conflictMask: gameStore.conflictMask,
    zoom: zoom.value,
}))

/** 按钮条：两个阶段都有主页，中间那个按阶段切换 */
const actions = computed<Actions>(() => [
    { key: 'home', icon: '🏠', message: '主页', onClick: goHome },
    { key: 'zoomOut', icon: '➖', message: '缩小', disabled: !canZoomOut.value, onClick: zoomOut },
    { key: 'zoomIn', icon: '➕', message: '放大', disabled: !canZoomIn.value, onClick: zoomIn },
    {
        key: 'submit',
        icon: '📤',
        message: phase.value === CREATE_PHASE.Puzzle ? '提交题目' : '提交答案',
        onClick: phase.value === CREATE_PHASE.Puzzle ? submitPuzzle : submitSolution,
    },
])

const successActions: Actions = [
    { key: 'home', icon: '🏠', message: '回主页', onClick: goHome },
    { key: 'again', icon: '↺', message: '再出一道', onClick: createAgain },
]

const failActions: Actions = [
    { key: 'back', icon: '↩', message: '继续修改', onClick: backToEdit },
]
</script>


<template>
    <div class="page-card wide">
        <div class="field">
            <label class="label">盘面大小</label>
            <select class="select" v-model.number="boxSize">
                <option v-for="b in BOX_SIZE_OPTIONS" :key="b" :value="b">
                    {{ b * b }} X {{ b * b }}
                </option>
            </select>
        </div>
        <ActionItems :items="actions">
            <template v-if="errorMsg && !showFail" #tip>{{ errorMsg }}</template>
        </ActionItems>
        <BoardView v-bind="boardParams" @cell-click="gameStore.select" />
        <NumberPad :max="gameStore.sudoku.S" :columns="gameStore.config.boxSize" @pick="gameStore.inputNum" />

        <Overlay :show="showSuccess">
            <p class="overlay-title">🎉 出题完成</p>
            <p class="overlay-desc">题目已通过验证</p>
            <ActionItems :items="successActions" />
        </Overlay>

        <Overlay :show="showFail">
            <p class="overlay-title">⚠️ 验证未通过</p>
            <p class="overlay-desc">{{ errorMsg }}</p>
            <ActionItems :items="failActions" />
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