<script setup lang="ts">
import { PAGER_MODE } from '@/constants/puzzle';
import type { PagerMode } from '@/types/puzzle';

const props = defineProps<{
    page: number
    pageCount: number
    /** 进度条（按钮翻页）/ 滑动条（拖动跳页） */
    mode: PagerMode
}>()

const emit = defineEmits<{ change: [page: number] }>()

const go = (next: number): void => {
    if (next < 1 || next > props.pageCount || next === props.page) return
    emit('change', next)
}

const onSlide = (e: Event): void => { go(Number((e.target as HTMLInputElement).value)) }
</script>

<template>
    <!-- 只有一页（或空）时不显示分页条 -->
    <div v-if="pageCount > 1" class="pager">
        <template v-if="mode === PAGER_MODE.Bar">
            <button class="pager-btn" type="button" :disabled="page <= 1" @click="go(page - 1)">上一页</button>
            <span class="pager-info">{{ page }} / {{ pageCount }}</span>
            <button class="pager-btn" type="button" :disabled="page >= pageCount" @click="go(page + 1)">下一页</button>
        </template>

        <template v-else>
            <input class="pager-slider" type="range" min="1" :max="pageCount" :value="page" @input="onSlide">
            <span class="pager-info">{{ page }} / {{ pageCount }}</span>
        </template>
    </div>
</template>

<style scoped>
.pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 14px;
}

.pager-btn {
    height: 28px;
    padding: 0 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    color: #374151;
    font-size: 0.8rem;
    font-family: inherit;
    cursor: pointer;
    transition: 0.15s;
}

.pager-btn:hover:not(:disabled) {
    background: #eef2ff;
    border-color: #6366f1;
}

.pager-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.pager-slider {
    flex: 1;
    accent-color: #6366f1;
}

.pager-info {
    font-size: 0.78rem;
    color: #6b7280;
    white-space: nowrap;
}
</style>
