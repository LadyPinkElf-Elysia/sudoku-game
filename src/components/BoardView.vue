<script setup lang="ts">
import { useGameStore, type GameStore } from '@/stores/game';
import type { Cell } from '@/types/game';
import { getSudoku } from '@/utils/getSudoku';
import type { Sudoku } from '@/utils/sudoku';
import { computed } from 'vue';

const store: GameStore = useGameStore()
const sudoku = computed<Sudoku>(() => getSudoku(store.config.boxSize))
const S = computed(() => sudoku.value.S)
const B = computed(() => sudoku.value.B)

const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${S.value}, 34px)`
}))

const cellClass = (cell: Cell, r: number, c: number) => ({
    empty: cell.v === 0,
    given: cell.lock,
    conflict: store.conflictSet.has(`${r},${c}`),
    selected: store.selected?.[0] === r && store.selected?.[1] === c,
    'box-right': (c + 1) % B.value === 0 && c !== S.value - 1,
    'box-bottom': (r + 1) % B.value === 0 && r !== S.value - 1,
})

const pick = (r: number, c: number): void => store.select([r, c] as const)

</script>

<template>
    <div class="board-scroll-container">
        <div class="board-wrapper">
            <div class="board-grid" :style="gridStyle">
                <template v-for="(row, r) in store.board" :key="r">
                    <div v-for="(cell, c) in row" :key="c" class="cell" :class="cellClass(cell, r, c)"
                        @click="pick(r, c)">
                        {{ cell.v || '' }}
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ===== 外层滚动容器 ===== */
.board-scroll-container {
    width: 100%;
    max-height: 60vh;
    overflow: auto;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    padding: 8px 0;
    /* Firefox */
    scrollbar-width: auto;
    scrollbar-color: #94a3b8 #f1f5f9;
}

.board-scroll-container::-webkit-scrollbar {
    width: 12px;
    height: 12px;
    background: #f1f5f9;
    border-radius: 6px;
}

.board-scroll-container::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 6px;
}

.board-scroll-container::-webkit-scrollbar-thumb:hover {
    background: #64748b;
}

.board-scroll-container::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 6px;
}

.board-wrapper {
    display: flex;
    justify-content: center;
}

.board-grid {
    display: grid;
    border: 2px solid #333;
    width: fit-content;
    background: #fff;
    user-select: none;
}

/* ===== 格子基础 ===== */
.cell {
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e5e7eb;
    font-size: 15px;
    box-sizing: border-box;
    color: #2563eb;         /* 玩家填的：蓝字 */
    font-weight: 400;       /* 玩家填的：常规 */
    cursor: pointer;
    transition: background 0.08s, box-shadow 0.08s;
}

/* ===== 各维度独立 ===== */

/* 空 */
.cell.empty {
    color: #d1d5db;
}

/* 题目：黑字 + 粗 */
.cell.given {
    color: #111827;
    font-weight: 700;
}

/* 冲突：红底 */
.cell.conflict {
    background: #fecaca;
}

/* 选中：蓝内框 */
.cell.selected {
    box-shadow: inset 0 0 0 2px #2563eb;
}

/* ===== 宫格线 ===== */
.cell.box-right {
    border-right: 2px solid #333;
}

.cell.box-bottom {
    border-bottom: 2px solid #333;
}
</style>