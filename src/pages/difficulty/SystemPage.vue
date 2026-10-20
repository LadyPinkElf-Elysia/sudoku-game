<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import Flex from '@/components/Flex.vue';
import FormField from '@/components/FormField.vue';
import Overlay from '@/components/Overlay.vue';
import TextAction from '@/components/TextAction.vue';
import { ACTION } from '@/constants/actions';
import { BLANK_RATIO, BOX_SIZE_SELECT_OPTIONS, GAME_INIT_CONFIG, GAME_ORIGIN } from '@/constants/game';
import { PAGE } from '@/constants/pages';
import { actionOf } from '@/core/action';
import { percentOf } from '@/core/game/derive';
import { errorTextOf } from '@/core/message';
import { blankCountOf, cellCountOf } from '@/core/sudoku/shape';
import { generateInWorker } from '@/services/sudoku/workerClient';
import { useGameStore } from '@/stores/game';
import type { GameConfig } from '@/types/game';
import type { Actions } from '@/types/item';

/**
 * 难度页（系统生成 Tab）：配置草稿 → Worker 生成 → 开局并跳转
 * **只有这一页用 → 就地写**（跨页复用的才抽 composables）
 */
const gameStore = useGameStore()
const router = useRouter()

/** 配置草稿（可变：盘面大小走下拉、挖空比例走滑杆）—— 用 GameConfig 放宽字面量类型 */
const draft = ref<GameConfig>({ ...GAME_INIT_CONFIG })
const loading = ref(false)
const error = ref('')

const totalCells = computed(() => cellCountOf(draft.value.boxSize))
const blankCount = computed(() => blankCountOf(draft.value.boxSize, draft.value.blankRatio))
const blankPercent = computed<number>(() => percentOf(draft.value.blankRatio))

/** 生成并开局（双击保护 → 清旧错误 → 转圈 → Worker → 开局 → 跳页） */
const apply = async (): Promise<void> => {
    if (loading.value) return
    error.value = ''
    loading.value = true
    try {
        const cfg: GameConfig = { boxSize: draft.value.boxSize, blankRatio: draft.value.blankRatio }
        const { puzzle, solution } = await generateInWorker(cfg.boxSize, blankCount.value)
        gameStore.startGame(puzzle, solution, cfg, GAME_ORIGIN.System)
        router.replace({ name: PAGE.Game })
    } catch (err) {
        error.value = errorTextOf(err, '生成失败，请重试')
    } finally {
        loading.value = false        // 成功/失败都复位，否则转圈遮罩残留
    }
}

/** 回主页只走顶栏那一个入口，这里只留开局 */
const actions = computed<Actions>(() => [
    actionOf(ACTION.startGame, loading.value ? undefined : apply),
])
</script>

<template>
    <!-- 内容由壳（pages/DifficultyPage.vue）的 .page-card 承载，这里只放本 Tab 的表单 -->
    <div class="system-page">
        <h2 class="section-title">系统生成</h2>

        <FormField class="field" vertical type="select" label="盘面大小" :options="BOX_SIZE_SELECT_OPTIONS"
            :model-value="draft.boxSize" @update:model-value="(v) => (draft.boxSize = v as number)" />

        <FormField v-model="draft.blankRatio" class="field" vertical type="range" :label="`挖空比例:${blankPercent}%`"
            :min="BLANK_RATIO.min" :max="BLANK_RATIO.max" :step="BLANK_RATIO.step"
            :hint="`共 ${totalCells} 格，挖空 ${blankCount} 格`" />

        <Flex class="op-bar" :gap="12" justify="center" wrap>
            <TextAction v-for="a in actions" :key="a.key" :text="a.text" :on-click="a.onClick" />
        </Flex>

        <p v-if="error" class="form-error">{{ error }}</p>

        <Overlay :show="loading" spinning text="正在生成题目" desc="大盘面可能需要几秒…" />
    </div>
</template>

<style scoped>
/* .field / .label / .select / .hint / .form-error / .overlay-* 均来自全局样式 */

.title {
    margin: 0 0 18px;
    font-size: 1.05rem;
    color: #111827;
}

/* 本页特有的滑杆外观 */
.range {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: #e5e7eb;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
}

.range::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #6366f1;
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    cursor: pointer;
}

.range::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #6366f1;
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    cursor: pointer;
}
</style>
