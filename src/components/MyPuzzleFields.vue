<script setup lang="ts">
import { computed } from 'vue';
import { MINE_COPY, PUZZLE_VISIBILITY_OPTIONS, SOLUTION_OPTIONS, SOLUTION_VALUE } from '@/constants/puzzle';
import type { Visibility } from '@/types/puzzle';

const props = defineProps<{
    /** 当前可见性（下拉选中值） */
    visibility: Visibility
    /** 参考答案开关（下拉选中值） */
    solutionOn: boolean
    onVisibility: (value: Visibility) => void
    onSolution: (on: boolean) => void
}>()

/** 参考答案下拉的当前值（'on' / 'off'） */
const solutionValue = computed<string>(() => (props.solutionOn ? SOLUTION_VALUE.On : SOLUTION_VALUE.Off))
</script>

<template>
    <!-- 可见性与参考答案同一行；两个下拉刻意等宽（都加 .row-select） -->
    <div class="row-fields">
        <p class="row-field">
            <span class="row-label">{{ MINE_COPY.visibilityLabel }}</span>
            <select class="select is-sm row-select" :value="visibility"
                @change="onVisibility(($event.target as HTMLSelectElement).value as Visibility)">
                <option v-for="opt in PUZZLE_VISIBILITY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
        </p>
        <p class="row-field">
            <span class="row-label">{{ MINE_COPY.solutionLabel }}</span>
            <select class="select is-sm row-select" :value="solutionValue"
                @change="onSolution(($event.target as HTMLSelectElement).value === SOLUTION_VALUE.On)">
                <option v-for="opt in SOLUTION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
        </p>
    </div>
</template>

<style scoped>
/* 同一行；换行只在窄屏发生 */
.row-fields {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
}

.row-field {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
}

.row-label {
    font-size: 0.78rem;
    color: #6b7280;
}

/* 两个下拉等宽（7rem）——宽度不随选项文字长短变化 */
.row-select {
    width: 7rem;
}
</style>
