<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ActionItems from '@/components/ActionItems.vue'
import BoardView from '@/components/BoardView.vue'
import NumberPad from '@/components/NumberPad.vue'
import Overlay from '@/components/Overlay.vue'
import { BOX_SIZE_OPTIONS, CREATE_PHASE, GAME_INIT_CONFIG } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { useGameStore } from '@/stores/game'
import type { ActionDef } from '@/types/action'
import type { NumBoard } from '@/types/board'
import type { CreatePhase } from '@/types/game'
import { useCanvasStore } from '@/stores/canvas'
import { BOARD_ZOOM } from '@/constants/board'

const router = useRouter()
const gameStore = useGameStore()
const canvasStore=useCanvasStore()

/** 当前阶段：填题面 / 填答案 */
const phase = ref<CreatePhase>(CREATE_PHASE.Puzzle)
/** 提交题目时快照的题面 */
const puzzleSnapshot = ref<NumBoard>([])
/** 错误信息 */
const errorMsg = ref('')
/** 成功/失败遮罩 */
const showSuccess = ref(false)
const showFail = ref(false)

const goHome = (): void => {router.replace({ name: PAGE.Home })}

const boxSize = computed<number>({
    get: () => gameStore.config.boxSize,
    set: (b: number) => changeBoxSize(b),
})

/** 重置出题页的本地流程状态（阶段 / 快照 / 提示 / 遮罩） */
const resetCreateState = (): void => {
    phase.value = CREATE_PHASE.Puzzle
    puzzleSnapshot.value = []
    errorMsg.value = ''
    showSuccess.value = false
    showFail.value = false
}

/** 切换盘面大小：必须重建 board，否则 canvas 与数字键盘尺寸不一致 */
const changeBoxSize = (b: number): void => {
    if (b === gameStore.config.boxSize) return
    resetCreateState()
    gameStore.startCreate(b)
    canvasStore.resetZoom()
}

/** 提交题目 */
const submitPuzzle = (): void => {
    const num = gameStore.numBoard
    const sudoku = gameStore.sudoku

    if (num.every(row => row.every(v => v === 0))) {
        errorMsg.value = '题目不能全空'
        return
    }
    if (sudoku.findConflicts(num).some(r => r.some(b => b))) {
        errorMsg.value = '题面存在冲突，请先修正'
        return
    }

    errorMsg.value = ''
    puzzleSnapshot.value = num
    gameStore.lockPuzzle()
    phase.value = CREATE_PHASE.Solution
}

/** 提交答案 */
const submitSolution = (): void => {
    const solution = gameStore.numBoard
    const sudoku = gameStore.sudoku

    if (!sudoku.validatePuzzle(puzzleSnapshot.value, solution)) {
        errorMsg.value = '答案不完整、有冲突，或与题面不符'
        showFail.value = true
        return
    }
    showSuccess.value = true
}

const backToSolution = (): void => {
    showFail.value = false
    errorMsg.value = ''
}

const createAgain = (): void => {
    resetCreateState()
    gameStore.startCreate(gameStore.config.boxSize)
    canvasStore.resetZoom()
}

/** 按钮条：两个阶段都有主页，中间那个按阶段切换 */
const actions = computed<ActionDef[]>(() => [
    { key: 'home', icon: '🏠', message: '主页', onClick: goHome },
    { key: 'zoomOut', icon: '➖', message: '缩小', disabled: canvasStore.zoom <= BOARD_ZOOM.min, onClick: canvasStore.zoomOut },
    { key: 'zoomIn', icon: '➕', message: '放大', disabled: canvasStore.zoom >= BOARD_ZOOM.max, onClick: canvasStore.zoomIn },
    {
        key: 'submit',
        icon: '📤',
        message: phase.value === CREATE_PHASE.Puzzle ? '提交题目' : '提交答案',
        onClick: phase.value === CREATE_PHASE.Puzzle ? submitPuzzle : submitSolution,
    },
])

const successActions: ActionDef[] = [
    { key: 'home', icon: '🏠', message: '回主页', onClick: goHome },
    { key: 'again', icon: '↺', message: '再出一道', onClick: createAgain },
]

const failActions: ActionDef[] = [
    { key: 'back', icon: '↩', message: '继续修改', onClick: backToSolution },
]

onMounted(() => {
    resetCreateState()
    gameStore.startCreate(GAME_INIT_CONFIG.boxSize)
})
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
        <BoardView />
        <NumberPad />

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