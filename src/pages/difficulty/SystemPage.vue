<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import ActionBar from '@/components/ActionBar.vue';
import FormField from '@/components/FormField.vue';
import { ACTION, ACTION_OF as actionOf } from '@/constants/actions';
import { BLANK_RATIO, BOX_SIZE_SELECT_OPTIONS, GAME_INIT_CONFIG, GAME_ORIGIN } from '@/constants/game';
import { PAGE } from '@/constants/pages';
import { percentOf } from '@/core/sudoku/shape';
import { blankCountOf, cellCountOf } from '@/core/sudoku/shape';
import { useSudokuEngine } from '@/composables/game/useSudokuEngine';
import { useGameStore } from '@/stores/game';
import type { GameConfig } from '@/types/game';
import type { Actions } from '@/types/item';

/**
 * 难度页（系统生成 Tab）：配置草稿 → Worker 生成 → 开局并跳转
 * **只有这一页用 → 就地写**（跨页复用的才抽 composables）
 */
const gameStore = useGameStore()
const router = useRouter()
/** 生成 + 挖空 + 求解：**数独引擎收在一个组合式里**（页面只给配置、拿结果） */
const { loading, error, generate } = useSudokuEngine()

/** 配置草稿（可变：盘面大小走下拉、挖空比例走滑杆）—— 用 GameConfig 放宽字面量类型 */
const draft = ref<GameConfig>({ ...GAME_INIT_CONFIG })

const totalCells = computed(() => cellCountOf(draft.value.boxSize))
const blankCount = computed(() => blankCountOf(draft.value.boxSize, draft.value.blankRatio))
const blankPercent = computed<number>(() => percentOf(draft.value.blankRatio))

/** 生成并开局（转圈 / 错误 / 双击守卫由 useGeneratePuzzle 管；这里只负责开局与跳页） */
const apply = async (): Promise<void> => {
    const cfg: GameConfig = { boxSize: draft.value.boxSize, blankRatio: draft.value.blankRatio }
    const data = await generate(cfg)
    if (!data) return                       // 失败时 error 已由组合式写好
    gameStore.startGame(data.puzzle, data.solution, cfg, GAME_ORIGIN.System)
    router.replace({ name: PAGE.Game })
}

/** 回主页只走顶栏那一个入口，这里只留开局 */
const actions = computed<Actions>(() => [
    actionOf(ACTION.startGame, loading.value ? undefined : apply),
])
</script>

<template>
    <!-- 内容由壳（pages/DifficultyPage.vue）的 .page-card 承载，这里只放本 Tab 的表单 -->
    <div class="system-page" v-loading="loading" element-loading-text="正在生成题目">
        <h2 class="section-title">系统生成</h2>

        <FormField class="field" vertical type="select" label="盘面大小" :options="BOX_SIZE_SELECT_OPTIONS"
            :model-value="draft.boxSize" @update:model-value="(v) => (draft.boxSize = v as number)" />

        <FormField v-model="draft.blankRatio" class="field" vertical type="range" :label="`挖空比例:${blankPercent}%`"
            :min="BLANK_RATIO.min" :max="BLANK_RATIO.max" :step="BLANK_RATIO.step"
            :hint="`共 ${totalCells} 格，挖空 ${blankCount} 格`" />

        <ActionBar class="op-bar" :actions="actions" wrap />

        <p v-if="error" class="form-error">{{ error }}</p>

        <!-- 生成中：页面级加载（v-loading 挂在根节点） -->
    </div>
</template>

<style scoped>
/* .field / .hint / .form-error / .section-title 来自全局；表单控件由 Element Plus 提供
   （原先本页手写的 .range 滑杆样式已删除：range 分支现在是 el-slider） */
</style>
