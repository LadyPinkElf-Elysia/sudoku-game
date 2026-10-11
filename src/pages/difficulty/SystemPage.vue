<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import ActionItems from '@/components/ActionItems.vue';
import LoadingOverlay from '@/components/LoadingOverlay.vue';
import { BLANK_RATIO, BOX_SIZE_OPTIONS } from '@/constants/game';
import { PAGE } from '@/constants/pages';
import { useDifficultyFlow } from '@/composables/game/useDifficultyFlow';
import type { Actions } from '@/types/item';

const router = useRouter()
const { draft, loading, error, totalCells, blankCount, blankPercent, apply } = useDifficultyFlow()

const actions = computed<Actions>(() => [
    { key: 'home', icon: '🏠', message: '主页', onClick: () => router.push({ name: PAGE.Home }) },
    { key: 'start', icon: '▶', message: '开始游戏', disabled: loading.value, onClick: apply },
])
</script>

<template>
    <!-- 内容由壳（pages/DifficultyPage.vue）的 .page-card 承载，这里只放本 Tab 的表单 -->
    <div class="system-page">
        <h2 class="title">系统生成</h2>

        <div class="field">
            <label class="label">盘面大小</label>
            <select class="select" v-model.number="draft.boxSize">
                <option v-for="b in BOX_SIZE_OPTIONS" :key="b" :value="b">
                    {{ b * b }} X {{ b * b }}
                </option>
            </select>
        </div>

        <div class="field">
            <label class="label">挖空比例:{{ blankPercent }}%</label>
            <input class="range" type="range" :min="BLANK_RATIO.min" :max="BLANK_RATIO.max" :step="BLANK_RATIO.step"
                v-model.number="draft.blankRatio">
            <p class="hint">共 {{ totalCells }} 格，挖空 {{ blankCount }} 格</p>
        </div>

        <ActionItems :items="actions" />

        <p v-if="error" class="form-error">{{ error }}</p>

        <LoadingOverlay :show="loading" title="正在生成题目" desc="大盘面可能需要几秒…" />
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
