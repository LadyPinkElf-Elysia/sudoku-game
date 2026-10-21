<script setup lang="ts">
/**
 * 页面底部的一次性提示（`.tip` 全局类）：
 * · **什么时候清空**由 `useTip()` 决定（默认 3 秒）
 * · 这里只负责淡出：`v-if` 配上 Transition 才有动画
 */
defineProps<{
    /** 提示文案（空字符串 = 不渲染） */
    text: string
}>()
</script>

<template>
    <Transition name="tip-fade">
        <p v-if="text" class="tip">{{ text }}</p>
    </Transition>
</template>

<style scoped>
.tip-fade-enter-active,
.tip-fade-leave-active {
    transition: opacity 0.3s ease;
}

.tip-fade-enter-from,
.tip-fade-leave-to {
    opacity: 0;
}
</style>
