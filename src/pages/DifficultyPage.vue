<script setup lang="ts">
import Overlay from '@/components/Overlay.vue';
import SpinnerIcon from '@/components/SpinnerIcon.vue';
import { PAGE } from '@/constants/enums';
import { BLANK_RATIO, BOX_SIZE_OPTIONS, GAME_CONFIG } from '@/constants/game';
import { useGameStore } from '@/stores/game';
import type { GameConfig } from '@/types/game';
import { generate } from '@/utils/sudoku/generator';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter()
const gameStore=useGameStore()

const draft = ref({ ...GAME_CONFIG })
const loading = ref(false)
const error = ref('')

const totalCells = computed(() => {
    const S = draft.value.boxSize * draft.value.boxSize
    return S * S
})

const blankCount = computed(() => Math.floor(totalCells.value * draft.value.blankRatio))

const apply = async (): Promise<void> => {
    if (loading.value) return
    error.value = ''
    loading.value = true
    try {
        const cfg: GameConfig = {
            boxSize: draft.value.boxSize,
            maxSteps: draft.value.maxSteps,
            blankRatio: draft.value.blankRatio,
        }
        const S = cfg.boxSize * cfg.boxSize
        const blanks = Math.floor(S * S * cfg.blankRatio)
        const { puzzle } = await generate(cfg.boxSize, blanks)
        gameStore.startFromPuzzle(puzzle, cfg)
        router.push({ name: PAGE.Game })
    } catch (err) {
        error.value = err instanceof Error ? err.message : '生成失败，请重试'
        loading.value=false
    }
}
</script>

<template>
    <div class="difficulty-page">
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

        <div class="actions">
            <button class="btn primary" @click="apply">开始游戏</button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <Overlay :show="loading">
            <SpinnerIcon />
            <p class="overlay-title">正在生成题目</p>
            <p class="overlay-desc">大盘面可能需要几秒…</p>
        </Overlay>

    </div>
</template>

<style scoped>
.difficulty-page {
    max-width: 420px;
    margin: 20px auto;
    padding: 20px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.title {
    margin: 0 0 20px;
    font-size: 1.1rem;
    color: #111827;
}

.field {
    margin-bottom: 18px;
}

.label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
}

.select {
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
    color: #374151;
    background: #fff;
    box-sizing: border-box;
    cursor: pointer;
}

.select:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 2px #eef2ff;
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

.actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
}

.btn {
    height: 36px;
    padding: 0 20px;
    border-radius: 6px;
    border: 1px solid #4f46e5;
    background: #6366f1;
    color: #fff;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: 0.15s;
}

.btn:hover {
    background: #4f46e5;
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