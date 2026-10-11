<script setup lang="ts">
import type { TextItems } from '@/types/item';

defineProps<{
    /** 一组纯文字操作（.text-btn：无边框 / 无底色，样式在全局 form.css） */
    items: TextItems
}>()
</script>

<template>
    <!-- 纯文字操作组：删除·编辑 / 题目预览·答案预览 / 退出… -->
    <p class="text-buttons">
        <button v-for="item in items" :key="item.key" class="text-btn" type="button" @click="item.onClick">
            {{ item.label }}
        </button>
    </p>
</template>

<style scoped>
/* 同一行、等间距；窄屏自动换行 */
.text-buttons {
    margin: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}
</style>
