<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

const props = defineProps<{
    /** 当前步（从 0 开始） */
    page: number
    /** 总步数（= 快照数） */
    pageCount: number
    /** 每一步的文案（不传就显示下标） */
    stepLabel?: (index: number) => string
    /** 信息行文案（不传 = 历史步数语义 page / pageCount - 1） */
    infoText?: string
}>()

const emit = defineEmits<{ change: [page: number] }>()

/** 信息行：默认沿用历史步数语义，调用方给了 infoText 就用它 */
const info = computed<string>(() => props.infoText ?? (props.page + ' / ' + (props.pageCount - 1)))

const stepsEl = ref<HTMLElement | null>(null)
const labelOf = (index: number): string => props.stepLabel?.(index) ?? String(index)
/** 当前步高亮、后面的步骤置灰 */
const classOf = (step: number): Record<string, boolean> => ({ active: step === props.page, future: step > props.page })

/** 当前步变化后把它滚进视野，否则步数多时看不到「当前步」 */
watch(() => props.page, async () => {
    await nextTick()
    stepsEl.value?.querySelector('.step-block.active')?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
})
</script>

<template>
    <!-- 「步骤条」式：一串可点选的步骤 + 当前位置（步数多时横向滚动） -->
    <div ref="stepsEl" class="steps">
        <button v-for="i in pageCount" :key="i - 1" type="button" class="step-block" :class="classOf(i - 1)"
            @click="emit('change', i - 1)">
            {{ labelOf(i - 1) }}
        </button>
    </div>
    <span class="pager-info">{{ info }}</span>
</template>

<style scoped>
.steps {
    display: flex;
    flex: 1;
    flex-wrap: nowrap;
    gap: 6px;
    min-height: 46px;
    padding: 4px 0 8px;
    overflow-x: auto;
    overflow-y: hidden;
    box-sizing: border-box;
    scrollbar-width: auto;
    scrollbar-color: #94a3b8 #f1f5f9;
}

/* 一颗步骤块（可点选） */
.step-block {
    flex: 0 0 auto;
    min-width: 44px;
    height: 32px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-family: inherit;
    color: #475569;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.15s;
}

.step-block:hover {
    background: #eef2ff;
    border-color: #a5b4fc;
}

.step-block.active {
    background: #6366f1;
    border-color: #4f46e5;
    color: #fff;
    font-weight: 600;
}

.step-block.future {
    color: #cbd5e1;
    background: #fafafa;
    border-color: #f1f5f9;
}

.step-block.future:hover {
    color: #64748b;
    background: #f1f5f9;
    border-color: #e2e8f0;
}

.steps::-webkit-scrollbar {
    height: 12px;
    background: #f1f5f9;
    border-radius: 6px;
}

.steps::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 6px;
}

.steps::-webkit-scrollbar-thumb:hover {
    background: #64748b;
}

.steps::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 6px;
}

.pager-info {
    font-size: 0.78rem;
    color: #6b7280;
    white-space: nowrap;
}
</style>
