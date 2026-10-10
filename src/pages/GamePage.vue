<script setup lang="ts">
import { computed } from 'vue'
import ActionItems from '@/components/ActionItems.vue'
import BoardOverlay from '@/components/BoardOverlay.vue'
import BoardView from '@/components/BoardView.vue'
import HistoryBar from '@/components/HistoryBar.vue'
import NumberPad from '@/components/NumberPad.vue'
import Overlay from '@/components/Overlay.vue'
import { useGameStore } from '@/stores/game'
import { useZoom } from '@/composables/board/useZoom'
import { useGameFlow } from '@/composables/game/useGameFlow'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'

const gameStore = useGameStore()
const { zoom, zoomActions } = useZoom()
const { tip, answerOpen, answerInput, leadActions, trailActions, resultActions, winOverlay } = useGameFlow()

/** 操作条：左段（返回/重开）＋ 缩放 ＋ 右段（提示/参考答案/DEV 作弊） */
const items = computed<Actions>(() => [...leadActions.value, ...zoomActions.value, ...trailActions.value])

/** 游玩盘：可玩（接 cell-click），只传 board/boxSize/selected/conflictMask/zoom */
const boardParams = computed<BoardRenderInput>(() => ({
    board: gameStore.board,
    boxSize: gameStore.sudoku.B,
    selected: gameStore.selected,
    conflictMask: gameStore.conflictMask,
    zoom: zoom.value,
}))
</script>

<template>
    <div class="page-card wide">
        <ActionItems :items="items">
            <template v-if="tip" #tip>{{ tip }}</template>
        </ActionItems>

        <BoardView v-bind="boardParams" @cell-click="gameStore.select" />

        <HistoryBar :count="gameStore.snapshots.length" :current="gameStore.currentStep" @select="gameStore.jump" />
        <NumberPad :max="gameStore.sudoku.S" :columns="gameStore.sudoku.B" @pick="gameStore.inputNum" />

        <!-- 参考答案：另一块只读棋盘，关掉后进度原样保留（不碰 store） -->
        <BoardOverlay :show="answerOpen" :input="answerInput" title="参考答案" close-text="回到挑战"
            @close="answerOpen = false" />

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
    font-size: .85rem;
    color: #6b7280;
}
</style>
