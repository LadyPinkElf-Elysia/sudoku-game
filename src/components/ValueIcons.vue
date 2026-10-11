<script setup lang="ts">
import type { ValueIconsProps } from '@/types/item'

/**
 * 值右侧的裸图标组（uid / pid 共用）：👁 睁/闭切换 + 📋 复制
 * · inline（`<span>`，可放进 `<p>`），不画按钮框、不带文字；文案转成 title / aria-label
 * · 已明文 → 闭眼（点它隐藏）；遮蔽中 → 睁眼（点它显示）
 */
defineProps<ValueIconsProps>()
</script>

<template>
    <span class="icon-row">
        <button type="button" class="icon-btn" :title="eyeLabel" :aria-label="eyeLabel" @click="onToggle">
            <!-- 已明文 → 闭眼（点它隐藏） -->
            <svg v-if="revealed" class="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round">
                <path d="M3 13.2c3.1 3.2 6 4.8 9 4.8s5.9-1.6 9-4.8" />
                <path d="M6.2 16.1 4.6 18.9" />
                <path d="M12 18v3" />
                <path d="M17.8 16.1 19.4 18.9" />
            </svg>
            <!-- 遮蔽中 → 睁眼（点它显示） -->
            <svg v-else class="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
            </svg>
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

.glyph {
    width: 16px;
    height: 16px;
}

.emoji {
    font-size: 1rem;
    line-height: 1;
}
</style>
