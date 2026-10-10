<script setup lang="ts">
import Overlay from '@/components/Overlay.vue';
import SpinnerIcon from '@/components/SpinnerIcon.vue';
import ActionItems from '@/components/ActionItems.vue';
import { PAGE } from '@/constants/pages';
import { BLANK_RATIO, BOX_SIZE_OPTIONS } from '@/constants/game';
import { useStartGame } from '@/composables/useStartGame';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { ActionDef } from '@/types/action';

const router = useRouter()
const { draft, loading, error, totalCells, blankCount, apply } = useStartGame()

const actions = computed<ActionDef[]>(() => [
    { key: 'home', icon: '🏠', message: '主页', onClick: () => router.push({ name: PAGE.Home }) },
    { key: 'start', icon: '▶', message: '开始游戏', disabled: loading.value, onClick: apply },
])
</script>

<template>
    <div class="page-card">
        <h2 class="title">难度选择</h2>

        <div class="field">
            <label class="label">盘面大小</label>
            <select class="select" v-model.number="draft.boxSize">
                <option v-for="b in BOX_SIZE_OPTIONS" :key="b" :value="b">
                    {{ b * b }} X {{ b * b }}
                </option>
            </select>
        </div>

        <div class="field">
            <label class="label">挖空比例:{{ Math.round(draft.blankRatio * 100) }}%</label>
            <input class="range" type="range" :min="BLANK_RATIO.min" :max="BLANK_RATIO.max" :step="BLANK_RATIO.step"
                v-model.number="draft.blankRatio">
            <p class="hint">共 {{ totalCells }} 格，挖空 {{ blankCount }} 格</p>
        </div>

        <ActionItems :items="actions" />

        <p v-if="error" class="error">{{ error }}</p>

        <Overlay :show="loading">
            <SpinnerIcon />
            <p class="overlay-title">正在生成题目</p>
            <p class="overlay-desc">大盘面可能需要几秒…</p>
        </Overlay>

    </div>
</template>

<style scoped>
.title {
    margin: 0 0 20px;
    font-size: 1.1rem;
    color: #111827;
}

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

.hint {
    margin: 6px 0 0;
    font-size: 0.75rem;
    color: #9ca3af;
}

.error {
    margin: 12px 0 0;
    text-align: center;
    font-size: 0.85rem;
    color: #dc2626;
    background: #fee2e2;
    padding: 8px 12px;
    border-radius: 6px;
}

.overlay-title {
    margin: 12px 0 0;
    font-size: 1rem;
    color: #111827;
}

.overlay-desc {
    margin: 6px 0 0;
    font-size: 0.85rem;
    color: #6b7280;
}
</style>