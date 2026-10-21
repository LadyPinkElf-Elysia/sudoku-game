<script setup lang="ts">
import { computed, ref } from 'vue'
import ActionBar from '@/components/ActionBar.vue'
import BoardView from '@/components/BoardView.vue'
import Flex from '@/components/Flex.vue'
import FormField from '@/components/FormField.vue'
import NumberPad from '@/components/NumberPad.vue'
import PagerStepsView from '@/components/PagerStepsView.vue'
import { ACTION, ACTION_OF as actionOf } from '@/constants/actions'
import { SOLVE_COPY } from '@/constants/copy'
import { BOX_SIZE_SELECT_OPTIONS, CUSTOM_TEXT_MAX, GAME_INIT_CONFIG, GAME_MODE } from '@/constants/game'
import { SOLVE_INPUT_MODE, SOLVE_LIMIT_DEFAULT, SOLVE_LIMIT_OPTIONS, SOLVE_MAX_BOX_SIZE } from '@/constants/solve'
import { fromPuzzle } from '@/core/board/model'
import { isBlankBoard } from '@/core/board/ops'
import { parsePuzzle } from '@/core/sudoku/parse'
import { useSudokuEngine } from '@/composables/game/useSudokuEngine'
import { useGameStore } from '@/stores/game'
import type { Position } from '@/types/board'
import type { BoardRenderInput } from '@/types/render'
import type { Actions } from '@/types/item'

/**
 * 题目求解流程（**只有这一页用 → 就地写**）：粘串/手填 → 本地校验 → Worker 多解 → 逐解浏览
 * · 输入盘复用 gameStore 的 Solve 模式；缩放归棋盘（`BoardView` 自己管）；解列表只活在本地
 */
type SolveInputMode = typeof SOLVE_INPUT_MODE[keyof typeof SOLVE_INPUT_MODE]

const gameStore = useGameStore()

const inputMode = ref<SolveInputMode>(SOLVE_INPUT_MODE.Text)
const puzzleText = ref('')
const maxSolutions = ref<number>(SOLVE_LIMIT_DEFAULT)
/** 求解（与"生成 + 挖空"同一个引擎组合式）：给盘面 + 上限，拿解列表 */
const { loading, error, solutions, reset: resetSolutions, solve: runSolve } = useSudokuEngine()
const solutionIndex = ref(0)

// 进页先起一张空盘：不把上一页留下的盘面带过来
gameStore.startInput(GAME_MODE.Solve, GAME_INIT_CONFIG.boxSize)

const boxSize = computed<number>(() => gameStore.config.boxSize)
const padMax = computed<number>(() => gameStore.sudoku.S)
const padColumns = computed<number>(() => gameStore.sudoku.B)
const boxSizeOptions = BOX_SIZE_SELECT_OPTIONS

/** 输入盘渲染：**只在棋盘内部有意义 → 页面不打包**（只读/可玩由 interactive 决定） */

/** 结果盘渲染入参（只读：解本身已填满） */
const solutionInput = computed<BoardRenderInput>(() => ({
    board: fromPuzzle(solutions.value[solutionIndex.value] ?? [], true),
    boxSize: gameStore.sudoku.B,
    interactive: false,
}))

/** 清掉上一轮的解 */
const resetResult = (): void => {
    resetSolutions()
    solutionIndex.value = 0
}

/** 换盘面大小：重建空盘 + 复位输入盘缩放 + 清结果 */
const setBoxSize = (next: number): void => {
    gameStore.startInput(GAME_MODE.Solve, next)
    error.value = ''
    resetResult()
}

/** 换输入方式（已输入的内容都保留） */
const setInputMode = (mode: SolveInputMode): void => {
    inputMode.value = mode
    error.value = ''
}

/** 清空棋盘（尺寸不变） */
const clearBoard = (): void => {
    gameStore.startInput(GAME_MODE.Solve, gameStore.sudoku.B)
    error.value = ''
    resetResult()
}

/**
 * 把题面串解析进棋盘：false = 没成功（已写 error，现有盘面不动）
 * 成功 = 回填棋盘 + 复位输入盘缩放 + 切到「棋盘填入」模式 + 清旧结果
 */
const applyText = (): boolean => {
    error.value = ''
    if (!puzzleText.value.trim()) {
        error.value = SOLVE_COPY.blank
        return false
    }
    const parsed = parsePuzzle(puzzleText.value)
    if (!parsed) {
        error.value = SOLVE_COPY.badPuzzle
        return false
    }
    gameStore.startInput(GAME_MODE.Solve, parsed.boxSize, parsed.board)
    inputMode.value = SOLVE_INPUT_MODE.Board
    resetResult()
    return true
}

/** 求解前的本地校验：全空 / 盘面过大 / 有冲突 —— 都不值得再让 Worker 跑长回溯 */
const validate = (): boolean => {
    if (isBlankBoard(gameStore.numBoard)) { error.value = SOLVE_COPY.blank; return false }
    if (gameStore.sudoku.B > SOLVE_MAX_BOX_SIZE) { error.value = SOLVE_COPY.tooBig; return false }
    if (gameStore.sudoku.hasConflict(gameStore.numBoard)) { error.value = SOLVE_COPY.conflict; return false }
    return true
}

/** 求解：先本地校验，再交给 useSolvePuzzle 跑 Worker（转圈 / 错误 / 解列表都由它管） */
const solve = async (): Promise<void> => {
    error.value = ''
    resetResult()
    if (inputMode.value === SOLVE_INPUT_MODE.Text && !applyText()) return
    if (!validate()) return

    if (!(await runSolve(gameStore.numBoard, maxSolutions.value))) return
}

/** 步骤条切到第 k 个解（越界直接忽略） */
const changeSolution = (index: number): void => {
    if (index < 0 || index >= solutions.value.length) return
    solutionIndex.value = index
}

const selectCell = (pos: Position): void => gameStore.select(pos)
const inputNum = (n: number): void => gameStore.inputNum(n)

/** 结果行：找到几个解（到上限说明还有更多解没找） */
const resultInfo = computed<string>(() => {
    const found = solutions.value.length
    const unit = SOLVE_COPY.solutionUnit
    return found >= maxSolutions.value
        ? `共找到 ${found} ${unit}（${SOLVE_COPY.limitNote} ${maxSolutions.value}）`
        : `共找到 ${found} ${unit}`
})

/** 步骤条信息行：第 k / 共 n 个解 */
const pagerInfo = computed<string>(() =>
    solutions.value.length ? `第 ${solutionIndex.value + 1} / 共 ${solutions.value.length} 个解` : '')

/** 步骤文案：解 1 / 解 2 … */
const stepLabel = (index: number): string => `解 ${index + 1}`

/** 输入方式 Tab（与难度页「系统生成 / 自定义」同一套视觉：.sub-nav / .sub-tab 走全局样式） */
const modeTabs = [
    { key: SOLVE_INPUT_MODE.Text, label: SOLVE_COPY.modeText },
    { key: SOLVE_INPUT_MODE.Board, label: SOLVE_COPY.modeBoard },
] as const

/**
 * 动作行（**一行两件**：题面工具在左、「求解」在右）
 * · 字符串模式：「⬇ 填入棋盘」（串为空时不给点击函数 → 纯文本，全站惯例）
 * · 棋盘模式：「🧹 清空棋盘」
 * · 求解中：「求解」不给点击函数 → 纯文本
 */
const actions = computed<Actions>(() => [
    ...(inputMode.value === SOLVE_INPUT_MODE.Text
        ? [actionOf(ACTION.fillBoard, puzzleText.value.trim() ? applyText : undefined)]
        : [actionOf(ACTION.clearBoard, clearBoard)]),
    actionOf(ACTION.solve, loading.value ? undefined : solve),
])
</script>

<template>
    <div class="page-card wide" v-loading="loading" :element-loading-text="SOLVE_COPY.solving">
        <h2 class="section-title">{{ SOLVE_COPY.title }}</h2>

        <!-- 输入方式：与难度页的「系统生成 / 自定义」同一套 Tab 视觉 -->
        <Flex class="sub-nav" :gap="6">
            <button v-for="m in modeTabs" :key="m.key" type="button" class="sub-tab"
                :class="{ 'is-active': inputMode === m.key }" @click="setInputMode(m.key)">
                {{ m.label }}
            </button>
        </Flex>

        <template v-if="inputMode === SOLVE_INPUT_MODE.Text">
            <FormField v-model="puzzleText" class="field" vertical type="textarea"
                :label="SOLVE_COPY.puzzleLabel" :maxlength="CUSTOM_TEXT_MAX"
                :hint="`${puzzleText.length} 字符`" placeholder="0 0 3 0 …" />
            <p class="meta-line">「求解」会先解析这串题面；「填入棋盘」= 解析后填进棋盘并切到棋盘模式（就在求解左边）</p>
        </template>

        <template v-else>
            <FormField class="field" vertical type="select" :label="SOLVE_COPY.boxSizeLabel"
                :options="boxSizeOptions" :model-value="boxSize"
                @update:model-value="(v) => setBoxSize(v as number)" />
            <p class="meta-line">点棋盘选格 → 用下方数字键填题面（右下角的清格键是删除）</p>
        </template>

        <!-- 棋盘只属于「棋盘填入」模式：两种输入方式互不干扰 -->
        <template v-if="inputMode === SOLVE_INPUT_MODE.Board">
            <BoardView :board="gameStore.board" :box-size="gameStore.sudoku.B" :selected="gameStore.selected"
                :conflict-mask="gameStore.conflictMask" @cell-click="selectCell" />
            <NumberPad :max="padMax" :columns="padColumns" @pick="inputNum" />
        </template>

        <FormField class="field" vertical type="select" :label="SOLVE_COPY.limitLabel"
            :options="SOLVE_LIMIT_OPTIONS" :model-value="maxSolutions"
            @update:model-value="(v) => (maxSolutions = v as number)" />

        <ActionBar class="op-bar" :actions="actions" wrap />
        <p v-if="error" class="form-error">{{ error }}</p>

        <template v-if="solutions.length">
            <p class="result-label">{{ SOLVE_COPY.resultLabel }} · {{ resultInfo }}</p>
            <BoardView v-bind="solutionInput" />
            <Flex :gap="10" justify="center">
                <PagerStepsView :page="solutionIndex" :page-count="solutions.length"
                    :step-label="stepLabel" :info-text="pagerInfo" @change="changeSolution" />
            </Flex>
        </template>

        <!-- 求解中：页面级加载（v-loading 挂在根节点） -->
    </div>
</template>

<style scoped>
/* 结果区标题：与游戏页历史记录同一规格（.meta-line 来自全局样式） */
.result-label {
    margin: 14px 0 6px;
    font-size: 0.8rem;
    color: #6b7280;
    font-weight: 600;
    text-align: left;
}
</style>
