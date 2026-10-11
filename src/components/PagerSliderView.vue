<script setup lang="ts">
defineProps<{
    /** 当前页 */
    page: number
    /** 总页数 */
    pageCount: number
}>()

const emit = defineEmits<{ change: [page: number] }>()

const onSlide = (e: Event): void => { emit('change', Number((e.target as HTMLInputElement).value)) }
</script>

<template>
    <!-- 「滑动条」式浏览方式：拖动跳页 + 页码 -->
    <input class="pager-slider" type="range" min="1" :max="pageCount" :value="page" @input="onSlide">
    <span class="pager-info">{{ page }} / {{ pageCount }}</span>
</template>

<style scoped>
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
