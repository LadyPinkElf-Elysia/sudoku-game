<script setup lang="ts">
import { computed } from 'vue'
import BoardView from '@/components/BoardView.vue'
import Flex from '@/components/Flex.vue'
import NumberPad from '@/components/NumberPad.vue'
import Overlay from '@/components/Overlay.vue'
import TextAction from '@/components/TextAction.vue'
import { ACTION, actionOf, submitSpecOf } from '@/constants/actions'
import { CREATE_PHASE } from '@/constants/game'
import { useGameStore } from '@/stores/game'
import { useBoardZoom } from '@/composables/board/useZoom'
import { useEditFlow } from '@/composables/game/useEditFlow'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'
const gameStore = useGameStore()
const { zoom, zoomActions } = useBoardZoom(() => gameStore.config.boxSize)
const {
    phase, errorMsg, loading, showFail,
    submitPuzzle, submitSolution, backToEdit, goMyPuzzles,
} = useEditFlow()

/** 棋盘渲染入参：一个对象喂给 BoardView */
const boardParams = computed<BoardRenderInput>(() => ({
    board: gameStore.board,
    boxSize: gameStore.sudoku.B,
    selected: gameStore.selected,
    conflictMask: gameStore.conflictMask,
    zoom: zoom.value,
}))

/** 按钮条：返回「我的题目」+ 按阶段切换的提交（文案见 constants/actions；缩放贴棋盘） */
const actions = computed<Actions>(() => [
    actionOf(ACTION.backToMine, goMyPuzzles),
    actionOf(
        submitSpecOf(phase.value),
        phase.value === CREATE_PHASE.Puzzle ? submitPuzzle : submitSolution,
    ),
])

const failActions: Actions = [
    actionOf(ACTION.continueEdit, backToEdit),
]
</script>

<template>
    <div class="page-card wide">
        <!-- FR-10：没有大小选择器、没有标题/可见性/参考答案开关 -->
        <Flex class="op-bar" :gap="12" justify="center" wrap>
            <TextAction v-for="a in actions" :key="a.key" :text="a.text" :on-click="a.onClick" />
        </Flex>
        <p v-if="errorMsg && !showFail" class="tip">{{ errorMsg }}</p>

        <BoardView v-bind="boardParams" :zoom-actions="zoomActions" @cell-click="gameStore.select" />
        <NumberPad :max="gameStore.sudoku.S" :columns="gameStore.sudoku.B" @pick="gameStore.inputNum" />

        <Overlay :show="loading" spinning text="正在处理…" />

        <Overlay :show="showFail" text="⚠️ 未通过" :desc="errorMsg" :actions="failActions" />
    </div>
</template>
