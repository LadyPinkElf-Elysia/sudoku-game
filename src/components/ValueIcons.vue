<script setup lang="ts">
import EyeGlyph from './EyeGlyph.vue'
import type { ValueIconsProps } from '@/types/item'

/**
 * 值右侧的裸图标组（uid / pid 共用）：👁 睁/闭切换 + 📋 复制
 * · inline（`<span>`，可放进 `<p>`），不画按钮框、不带文字；文案转成 title / aria-label
 * · 眼睛图形来自 EyeGlyph（与登录页密码框同一套，全站没有猴子）
 */
defineProps<ValueIconsProps>()
</script>

<template>
    <span class="icon-row">
        <button type="button" class="icon-btn" :title="eyeLabel" :aria-label="eyeLabel" @click="onToggle">
            <EyeGlyph :revealed="revealed" />
        </button>

        <button type="button" class="icon-btn" :title="copyLabel" :aria-label="copyLabel" @click="onCopy">
            <span class="emoji">{{ copyIcon }}</span>
        </button>
    </span>
</template>

<style scoped>
.icon-row {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-left: 6px;
    vertical-align: middle;
}

.icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    padding: 2px 4px;
    border-radius: 6px;
    color: #4b5563;
    cursor: pointer;
    transition: 0.15s;
}

.icon-btn:hover {
    background: #eef2ff;
    color: #4f46e5;
}

.emoji {
    font-size: 1rem;
    line-height: 1;
}
</style>
