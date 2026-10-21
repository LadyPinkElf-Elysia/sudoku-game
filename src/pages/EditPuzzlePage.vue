<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ActionBar from '@/components/ActionBar.vue'
import BoardView from '@/components/BoardView.vue'
import NumberPad from '@/components/NumberPad.vue'
import Overlay from '@/components/Overlay.vue'
import { ACTION, ACTION_OF as actionOf } from '@/constants/actions'
import { CREATE_PHASE, GAME_MODE } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { errorTextOf } from '@/core/message'
import { boardToStr, parsePuzzle } from '@/core/sudoku/parse'
import { usePuzzleStage } from '@/composables/game/usePuzzleStage'
import { getOne, update } from '@/services/api/puzzleApi'
import { useGameStore } from '@/stores/game'
import type { Actions } from '@/types/item'

/**
 * 编辑页流程（FR-10，**只有这一页用 → 就地写**）：载入自己的题面（未锁定）
 * →（两阶段 / 校验交给 usePuzzleStage，出题页共用）→ PATCH → 回「我的题目」
 */
const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

/** 两阶段状态机（阶段 / 题面快照 / 报错 / 失败遮罩）——与出题页共用一份 */
const { phase, puzzleSnapshot, errorMsg, showFail, resetStage, submitPuzzle, checkSolution, backToEdit } =
    usePuzzleStage()

const pid = ref('')
const loading = ref(false)

const goMyPuzzles = (): void => { void router.replace({ name: PAGE.MyPuzzles }) }

/** 载入自己的题面（不预填旧答案） */
const load = async (): Promise<void> => {
    const id = String(route.params.pid ?? '')
    if (!id) { goMyPuzzles(); return }

    loading.value = true
    resetStage()       // 回到「填题面」阶段（清掉上一轮残留）
    try {
        const detail = await getOne(id)
        const parsed = parsePuzzle(detail.puzzleText)
        if (!parsed) {
            errorMsg.value = '题目数据异常，无法编辑'
            showFail.value = true
            return
        }
        pid.value = id
        gameStore.startInput(GAME_MODE.Create, parsed.boxSize, parsed.board)   // 未锁定 → 可增量改
    } catch (err) {
        errorMsg.value = errorTextOf(err, '题目加载失败')
        showFail.value = true
    } finally {
        loading.value = false
    }
}

/** 提交答案：成对校验 → 转圈 PATCH（题面/答案成对提交）→ 回「我的题目」 */
const submitSolution = async (): Promise<void> => {
    if (loading.value) return
    if (!checkSolution()) return

    loading.value = true
    try {
        await update(pid.value, {
            puzzleText: boardToStr(puzzleSnapshot.value),
            solutionText: boardToStr(gameStore.numBoard),
        })
        goMyPuzzles()
    } catch (err) {
        errorMsg.value = errorTextOf(err, '保存失败，请重试')
        showFail.value = true
    } finally {
        loading.value = false
    }
}

onMounted(() => { void load() })

/** 按钮条：返回「我的题目」+ 按阶段切换的提交（文案在 constants/actions；缩放归棋盘） */
const actions = computed<Actions>(() => [
    actionOf(ACTION.backToMine, goMyPuzzles),
    actionOf(
        phase.value === CREATE_PHASE.Puzzle ? ACTION.submitPuzzle : ACTION.submitSolution,
        phase.value === CREATE_PHASE.Puzzle ? submitPuzzle : submitSolution,
    ),
])

const failActions: Actions = [
    actionOf(ACTION.continueEdit, backToEdit),
]
</script>

<template>
    <div class="page-card wide" v-loading="loading" element-loading-text="正在处理…">
        <!-- FR-10：没有大小选择器、没有标题/可见性/参考答案开关 -->
        <ActionBar class="op-bar" :actions="actions" wrap />
        <p v-if="errorMsg && !showFail" class="tip">{{ errorMsg }}</p>

        <BoardView :board="gameStore.board" :box-size="gameStore.sudoku.B" :selected="gameStore.selected"
            :conflict-mask="gameStore.conflictMask" @cell-click="gameStore.select" />
        <NumberPad :max="gameStore.sudoku.S" :columns="gameStore.sudoku.B" @pick="gameStore.inputNum" />

        <!-- 提交 / 保存：页面级加载（v-loading 挂在根节点） -->

        <Overlay :show="showFail" text="⚠️ 未通过" :desc="errorMsg" :actions="failActions" />
    </div>
</template>
