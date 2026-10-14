<script setup lang="ts">
import { computed } from 'vue'
import BoardView from '@/components/BoardView.vue'
import Flex from '@/components/Flex.vue'
import NumberPad from '@/components/NumberPad.vue'
import Overlay from '@/components/Overlay.vue'
import FormField from '@/components/FormField.vue'
import TextAction from '@/components/TextAction.vue'
import { BOX_SIZE_SELECT_OPTIONS, CREATE_PHASE, TITLE_MAX } from '@/constants/game'
import { useGameStore } from '@/stores/game'
import { useZoom } from '@/composables/board/useZoom'
import { useCreateFlow } from '@/composables/game/useCreateFlow'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'
import { defaultZoomOf } from '@/core/board/zoom'

const gameStore = useGameStore()
const { zoom, zoomActions, resetZoom } = useZoom(defaultZoomOf(gameStore.config.boxSize))
const {
    phase, title, errorMsg, loading, showSuccess, showFail,
    changeBoxSize, goMine,
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

/** 按钮条：按阶段提交（缩放贴棋盘；回主页只走顶栏那一个入口） */
const actions = computed<Actions>(() => [
    {
        key: 'submit',
        text: phase.value === CREATE_PHASE.Puzzle ? '📤 提交题目' : '📤 提交答案',
        onClick: phase.value === CREATE_PHASE.Puzzle ? submitPuzzle : submitSolution,
    },
])

/** 出题完成：只留「去我的题目」（🔸 刚保存的题就在那儿；回主页走顶栏那一个入口） */
const successActions: Actions = [
    { key: 'goMine', text: '📋 去我的题目', onClick: goMine },
]

const failActions: Actions = [
    { key: 'back', text: '↩ 继续修改', onClick: backToEdit },
]
</script>

<template>
    <div class="page-card wide">
        <div class="field">
            <label class="label">标题</label>
            <input class="input" v-model="title" :maxlength="TITLE_MAX" placeholder="1~40 位">
        </div>

        <FormField class="field" vertical type="select" label="盘面大小" :options="BOX_SIZE_SELECT_OPTIONS"
            :model-value="boxSize" @update:model-value="(v) => (boxSize = v as number)" />

        <Flex class="op-bar" :gap="12" justify="center" wrap>
            <TextAction v-for="a in actions" :key="a.key" :text="a.text" :on-click="a.onClick" />
        </Flex>
        <p v-if="errorMsg && !showFail" class="tip">{{ errorMsg }}</p>

        <BoardView v-bind="boardParams" :zoom-actions="zoomActions" @cell-click="gameStore.select" />
        <NumberPad :max="gameStore.sudoku.S" :columns="gameStore.config.boxSize" @pick="gameStore.inputNum" />

        <!-- 提交：转圈（校验 + 上传） -->
        <Overlay :show="loading" spinning text="正在提交题目…" />

        <!-- 成功：只留「去我的题目」 -->
        <Overlay :show="showSuccess" text="🎉 出题完成" desc="题目已通过验证并保存" :actions="successActions" />

        <Overlay :show="showFail" text="⚠️ 验证未通过" :desc="errorMsg" :actions="failActions" />
    </div>
</template>
