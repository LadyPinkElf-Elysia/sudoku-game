<script setup lang="ts">
import { computed } from 'vue';

/**
 * 可点击文本（全站唯一一种「按钮」）：**传文本 + 点击函数**
 * · 不传 `onClick` → 纯文本（禁用态就这么表达，不再另设 disabled）
 * · 样式就是全站的 `.text-btn`（无框、无底、hover 下划线）—— 不额外加任何悬停提示
 */
const props = defineProps<{
    /** 显示文本（图形也算文本：`➖` / `👁` / `▶ 挑战`） */
    text?: string
    /** 点击函数；不传就是纯文本 */
    onClick?: () => void
}>()

/** 可点 → `<button>`；纯文本 → `<span>`（键盘 / 读屏语义也对） */
const tag = computed<string>(() => (props.onClick ? 'button' : 'span'))
</script>

<template>
    <component :is="tag" class="text-action" :class="{ 'text-btn': !!onClick }" :type="onClick ? 'button' : undefined"
        @click="onClick">
        <slot>{{ text }}</slot>
    </component>
</template>

<style scoped>
/* 只补「图形与文字对齐」；颜色 / 字号 / 下划线由全局 .text-btn 决定（与「重命名」同款） */
.text-action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    line-height: 1.5;
    font-family: inherit;
}
</style>
