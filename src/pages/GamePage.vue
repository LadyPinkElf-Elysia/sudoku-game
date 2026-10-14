<script setup lang="ts">
import { computed } from 'vue'
import BoardView from '@/components/BoardView.vue'
import Flex from '@/components/Flex.vue'
import NumberPad from '@/components/NumberPad.vue'
import Overlay from '@/components/Overlay.vue'
import PagerBar from '@/components/PagerBar.vue'
import TextAction from '@/components/TextAction.vue'
import { useGameStore } from '@/stores/game'
import { useZoom } from '@/composables/board/useZoom'
import { useGameFlow } from '@/composables/game/useGameFlow'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'
import { defaultZoomOf } from '@/core/board/zoom'

const gameStore = useGameStore()
const { zoom, zoomActions } = useZoom(defaultZoomOf(gameStore.config.boxSize))
const { tip, answerOpen, answerTitle, answerInput, answerActions, answerZoomActions, leadActions, trailActions, resultActions, winOverlay } = useGameFlow()

/** 操作条：左段（返回/重开）＋ 右段（提示/参考答案/DEV 作弊）—— 缩放不在这里，贴棋盘 */
const items = computed<Actions>(() => [...leadActions.value, ...trailActions.value])

/** 步骤文案（步骤条的渲染内容由传进去的 label 决定） */
const stepLabel = (index: number): string => `${index}步`

/** 题目信息行：挑战/自有题显示「标题 · 出题人」，否则显示「系统生成 S×S」（.meta-line 来自全局样式） */
const infoText = computed<string>(() => {
    const meta = gameStore.meta
    if (meta.title) return `${meta.title} · ${meta.uname}`
    const s = gameStore.sudoku.S
    return `系统生成 ${s}×${s}`
})

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
        <p class="meta-line game-info">{{ infoText }}</p>

        <Flex class="op-bar" :gap="12" justify="center" wrap>
            <TextAction v-for="a in items" :key="a.key" :text="a.text" :on-click="a.onClick" />
        </Flex>
        <p v-if="tip" class="tip">{{ tip }}</p>

        <BoardView v-bind="boardParams" :zoom-actions="zoomActions" @cell-click="gameStore.select" />

        <!-- 历史记录：数据（当前步 / 快照数）+ 渲染方式（steps）交给同一个通用组件 -->
        <p class="history-label">📜 历史记录</p>
        <PagerBar :page="gameStore.currentStep" :page-count="gameStore.snapshots.length" mode="steps"
            :step-label="stepLabel" @change="gameStore.jump" />
        <NumberPad :max="gameStore.sudoku.S" :columns="gameStore.sudoku.B" @pick="gameStore.inputNum" />

        <!-- 参考答案：同一个遮罩（只读棋盘走插槽，按钮条由 Overlay 渲染）；关掉后进度原样保留（不碰 store） -->
        <Overlay :show="answerOpen" :text="answerTitle" :actions="answerActions">
            <BoardView v-bind="answerInput" :zoom-actions="answerZoomActions" />
        </Overlay>

        <!-- 通关：文案 + 按钮条都由数据决定 -->
        <Overlay :show="!!winOverlay" :text="winOverlay?.title" :desc="winOverlay?.desc" :actions="resultActions" />
    </div>
</template>

<style scoped>
/* 操作条 / 提示条：全局 .op-bar / .tip；这里只剩历史记录标题与信息行 */
.history-label {
    margin: 10px 0 4px;
    font-size: 0.8rem;
    color: #6b7280;
    font-weight: 600;
    text-align: left;
}

/* 题目信息行：居中显示，其余规格来自全局 .meta-line */
.game-info {
    margin: 0 0 8px;
    text-align: center;
}
</style>
