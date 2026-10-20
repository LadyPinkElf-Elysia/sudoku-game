<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BoardView from '@/components/BoardView.vue'
import Flex from '@/components/Flex.vue'
import NumberPad from '@/components/NumberPad.vue'
import Overlay from '@/components/Overlay.vue'
import FormField from '@/components/FormField.vue'
import TextAction from '@/components/TextAction.vue'
import { ACTION } from '@/constants/actions'
import { TITLE_PREFIX } from '@/constants/copy'
import { BOX_SIZE_SELECT_OPTIONS, CREATE_PHASE, GAME_INIT_CONFIG, GAME_MODE, TITLE_MAX } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { actionOf, submitSpecOf } from '@/core/action'
import { errorTextOf } from '@/core/message'
import { boardToStr } from '@/core/sudoku/parse'
import { sideOf } from '@/core/sudoku/shape'
import { useBoardZoom } from '@/composables/board/useZoom'
import { usePuzzleStage } from '@/composables/game/usePuzzleStage'
import { create } from '@/services/api/puzzleApi'
import { useGameStore } from '@/stores/game'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'

/**
 * 出题页流程（**只有这一页用 → 就地写**）：标题 + POST 入库；
 * 题面/答案两阶段与校验交给 `usePuzzleStage`（编辑页共用）
 */
const gameStore = useGameStore()
const router = useRouter()
const { zoom, zoomActions } = useBoardZoom(() => gameStore.config.boxSize)

/** 两阶段状态机（阶段 / 题面快照 / 报错 / 失败遮罩）—— 与编辑页共用一份 */
const { phase, puzzleSnapshot, errorMsg, showFail, resetStage, submitPuzzle, checkSolution, backToEdit } =
    usePuzzleStage()

/** 默认标题「我的题目 9×9」（边长来自 core，不写字面量） */
const defaultTitleOf = (boxSize: number): string => {
    const s = sideOf(boxSize)
    return `${TITLE_PREFIX} ${s}×${s}`
}

const title = ref(defaultTitleOf(GAME_INIT_CONFIG.boxSize))
const loading = ref(false)
const showSuccess = ref(false)

/** 重置本地流程状态（阶段那部分交给 usePuzzleStage） */
const reset = (): void => {
    resetStage()
    showSuccess.value = false
}

/** 重建一盘空题（切盘面用）：语义（出题模式）在调用处，store 只认 mode 数据 */
const restart = (boxSize: number): void => {
    reset()
    gameStore.startInput(GAME_MODE.Create, boxSize)
}

/** 切换盘面大小：必须重建 board，否则键盘与盘面尺寸不一致 */
const changeBoxSize = (b: number): void => {
    if (b === gameStore.config.boxSize) return
    const custom = title.value.trim() && title.value !== defaultTitleOf(gameStore.config.boxSize)
        ? title.value
        : ''
    restart(b)
    // 用户改过标题就保留，否则跟随新尺寸给默认名
    title.value = custom || defaultTitleOf(b)
}

/** 出题完成 → 去「我的题目」（与编辑完成一致；回主页走顶栏那一个入口） */
const goMine = (): void => { void router.replace({ name: PAGE.MyPuzzles }) }

/** 提交答案 → 成对校验（含标题）→ 转圈入库 → 完成遮罩 */
const submitSolution = async (): Promise<void> => {
    if (loading.value) return
    if (!checkSolution()) return
    const name = title.value.trim()
    if (!name || name.length > TITLE_MAX) {
        errorMsg.value = `标题必填（1~${TITLE_MAX} 位）`
        showFail.value = true
        return
    }

    loading.value = true
    try {
        await create({
            title: name,
            puzzleText: boardToStr(puzzleSnapshot.value),
            solutionText: boardToStr(gameStore.numBoard),
        })
        showSuccess.value = true
    } catch (err) {
        errorMsg.value = errorTextOf(err, '提交失败，请重试')
        showFail.value = true
    } finally {
        loading.value = false
    }
}

onMounted(() => restart(GAME_INIT_CONFIG.boxSize))

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

/** 按钮条：按阶段提交（文案见 constants/actions 的 submitSpecOf；缩放贴棋盘；回主页只走顶栏那一个入口） */
const actions = computed<Actions>(() => [
    actionOf(
        submitSpecOf(phase.value),
        phase.value === CREATE_PHASE.Puzzle ? submitPuzzle : submitSolution,
    ),
])

/** 出题完成：只留「去我的题目」（🔸 刚保存的题就在那儿；回主页走顶栏那一个入口） */
const successActions: Actions = [
    actionOf(ACTION.goMine, goMine),
]

const failActions: Actions = [
    actionOf(ACTION.continueEdit, backToEdit),
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
