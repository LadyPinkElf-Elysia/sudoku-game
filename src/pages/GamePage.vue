<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BoardView from '@/components/BoardView.vue'
import ExportOverlay from '@/components/ExportOverlay.vue'
import Flex from '@/components/Flex.vue'
import NumberPad from '@/components/NumberPad.vue'
import Overlay from '@/components/Overlay.vue'
import PagerBar from '@/components/PagerBar.vue'
import TextAction from '@/components/TextAction.vue'
import { ACTION, ACTION_OF as actionOf } from '@/constants/actions'
import { GAME_COPY } from '@/constants/copy'
import { GAME_MODE, GAME_ORIGIN, GAME_STATUS } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { fromPuzzle } from '@/core/board/model'
import { givenBoard } from '@/core/board/ops'
import { boardToStr } from '@/core/sudoku/parse'
import { useGameSave } from '@/composables/game/useGameSave'
import { useGameStore } from '@/stores/game'
import { usePuzzleStore } from '@/stores/puzzle'
import type { Cell } from '@/types/board'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'

/**
 * 游玩页流程（**只有这一页用 → 就地写**）：提示 / 存档 / 答案遮罩 / 导出 / 按钮条 / 通关
 * · 盘面状态全在 gameStore；本页只负责"什么时候显示什么、点了做什么"
 */
const gameStore = useGameStore()
const puzzleStore = usePuzzleStore()
const router = useRouter()

const tip = ref('')
const answerOpen = ref(false)
/** 存档（写这一局；提示与「💡 提示」共用同一条 tip 行） */
const { save: storeSave } = useGameSave()

/** 题目导出（只给系统生成的盘）：**只导题面、不给答案**；复制与提示都在 ExportOverlay 里 */
const exportOpen = ref(false)
const exportPuzzleText = ref('')
const exportPuzzle = (): void => {
    if (!gameStore.board.length) return
    exportPuzzleText.value = boardToStr(givenBoard(gameStore.board))
    exportOpen.value = true
}

/** 遮罩里的只读盘：由答案生成一块独立 Board（与游玩盘无关），整对象交给 Overlay 里的 BoardView */
const answerInput = computed<BoardRenderInput>(() => ({
    board: gameStore.solution.length ? fromPuzzle(gameStore.solution, true) : [],
    boxSize: gameStore.sudoku.B,
    interactive: false,
}))
const answerTitle = '答案'

/** 答案遮罩的按钮条：只留关闭（缩放贴棋盘，见 answerZoomActions） */
const answerActions = computed<Actions>(() => [
    actionOf(ACTION.closeAnswer, () => { answerOpen.value = false }),
])

/** 提示文案（**只有游戏页用 → 内部函数**）：未选中 / 锁定 / 有候选三种分支 */
const hintTextOf = (cell: Cell | null, candidates: number[]): string => {
    if (!cell) return '请选中一个格子'
    if (cell.lock) return '无法更改初始题目'
    return `此格可以填：${candidates.join('、') || '无'}`
}

const goBack = (): void => {
    if (router.options.history.state.back) router.back()
    else router.replace({ name: PAGE.Difficulty })
}
const restart = (): void => {
    gameStore.jump(0)
    answerOpen.value = false            // 重开时收起遮罩
}
const hint = (): void => {
    const cands = gameStore.selected ? gameStore.getCandidates(gameStore.selected) : []
    tip.value = hintTextOf(gameStore.selectedCell, cands)
}

const leadActions = computed<Actions>(() => [
    actionOf(ACTION.back, goBack),
    actionOf(ACTION.restart, restart),
])
const trailActions = computed<Actions>(() => [
    actionOf(ACTION.hint, hint),
    actionOf(ACTION.saveGame, () => { tip.value = storeSave() }),
    // 只有系统生成的盘才给导出（自定义的串本就在手上、挑战有 pid / 落地页可分享）
    ...(gameStore.origin === GAME_ORIGIN.System ? [actionOf(ACTION.exportPuzzle, exportPuzzle)] : []),
    // 「📖 答案」只给挑战：系统生成的答案由程序算出、自定义的是你自己填的，都不算"参考答案"
    ...(gameStore.origin === GAME_ORIGIN.Challenge && gameStore.solution.length
        ? [actionOf(ACTION.answer, () => { answerOpen.value = true })]
        : []),
    ...(import.meta.env.DEV ? [actionOf(ACTION.cheat, gameStore.fillSolution)] : []),
])
/** 通关遮罩：只留重开（回主页走顶栏） */
const resultActions: Actions = [actionOf(ACTION.restart, restart)]
const winOverlay = computed(() => (gameStore.status === GAME_STATUS.Won ? GAME_COPY.win : null))

onMounted(() => {
    if (gameStore.mode !== GAME_MODE.Game || !gameStore.board.length) {
        router.replace({ name: PAGE.Difficulty })
        return
    }
    // 自定义「提交到我的题目」成功后的轻提示（一次性，取走即清）
    const saved = puzzleStore.takeSavedTip()
    if (saved) tip.value = saved
})

/** 操作条：左段（返回/重开）＋ 右段（提示/存档/导出/答案/DEV 作弊）—— 缩放不在这里，贴棋盘 */
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
</script>

<template>
    <div class="page-card wide">
        <p class="meta-line game-info">{{ infoText }}</p>

        <Flex class="op-bar" :gap="12" justify="center" wrap>
            <TextAction v-for="a in items" :key="a.key" :text="a.text" :on-click="a.onClick" />
        </Flex>
        <p v-if="tip" class="tip">{{ tip }}</p>

        <!-- 游玩盘：**只给四个字段**（渲染入参不外露成中间对象） -->
        <BoardView :board="gameStore.board" :box-size="gameStore.sudoku.B" :selected="gameStore.selected"
            :conflict-mask="gameStore.conflictMask" @cell-click="gameStore.select" />

        <!-- 历史记录：数据（当前步 / 快照数）+ 渲染方式（steps）交给同一个通用组件 -->
        <p class="history-label">📜 历史记录</p>
        <PagerBar :page="gameStore.currentStep" :page-count="gameStore.snapshots.length" mode="steps"
            :step-label="stepLabel" @change="gameStore.jump" />
        <NumberPad :max="gameStore.sudoku.S" :columns="gameStore.sudoku.B" @pick="gameStore.inputNum" />

        <!-- 参考答案：同一个遮罩（只读棋盘走插槽，按钮条由 Overlay 渲染）；关掉后进度原样保留（不碰 store） -->
        <Overlay :show="answerOpen" :text="answerTitle" :actions="answerActions">
            <BoardView v-bind="answerInput" />
        </Overlay>

        <!-- 题目导出：只给当前这一盘的题面串（= 锁定格；玩家填的不进串，也不给答案）—— 复制与提示都在组件里 -->
        <ExportOverlay :show="exportOpen" :puzzle-text="exportPuzzleText" @close="exportOpen = false" />

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
