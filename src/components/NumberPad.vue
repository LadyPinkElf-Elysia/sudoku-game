<script setup lang="ts">
import { useGameStore } from '@/stores/game';
import { getSudoku } from '@/utils/sudoku/cache';
import { computed } from 'vue';

const gameStore = useGameStore()
const sudoku = computed(() => getSudoku(gameStore.config.boxSize))
const S = computed(() => sudoku.value.S)
const B = computed(() => sudoku.value.B)

const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${B.value}, minmax(0, 1fr))`
}))

</script>

<template>
    <div class="num-pad-wrapper">
        <div class="num-grid" :style="gridStyle">
            <button v-for="n in S" :key="n" class="num-btn" @click="gameStore.inputNum(n)" title="单击填入数字">
                {{ n }}
            </button>
        </div>
        <button class="num-btn clear-btn" @click="gameStore.inputNum(0)" title="清除当前格数字">
            X
        </button>
    </div>

</template>

<style scoped>
.num-pad-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin: 10px 0;
}

.num-grid {
    display: grid;
    gap: 4px;
    width: fit-content;
    margin: 0 auto;
}

.num-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid #d1d5db;
    background: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #374151;
    font-size: 0.8rem;
    padding: 0;
    transition: 0.15s;
}

.num-btn:hover {
    background: #eef2ff;
    border-color: #6366f1;
}

.num-btn.clear-btn {
    font-size: 1rem;
}
</style>