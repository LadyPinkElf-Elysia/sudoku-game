<script setup lang="ts">
import ValueIcons from './ValueIcons.vue';
import type { ValueIconsProps } from '@/types/item';

defineProps<{
    /** 已算好的文本（遮蔽 `pid ▮▮▮▮…` / 明文 `pid <值>`） */
    text: string
    /** 值右侧裸图标组参数（👁 睁/闭 + 📋 复制 / ✅ 已复制） */
    icons: ValueIconsProps
}>()
</script>

<template>
    <!-- 等宽敏感值 + 👁/📋（pid / uid 共用；遮蔽/明文规则由 useSecretValue 统一提供） -->
    <p class="secret">
        <span>{{ text }}</span>
        <ValueIcons v-bind="icons" />
    </p>
</template>

<style scoped>
.secret {
    margin: 0;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 0.78rem;
    color: #4b5563;
    word-break: break-all;
}
</style>
