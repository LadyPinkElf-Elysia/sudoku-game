<script setup lang="ts">
/**
 * 眼睛图形（全站唯一一套）：睁眼 = 遮蔽中（点它显示）/ 闭眼 = 已明文（点它隐藏）
 * uid / pid 的裸图标组与密码框共用，避免各画一套
 */
defineProps<{
    /** 值当前是否已明文 */
    revealed: boolean
}>()
</script>

<template>
    <!-- 已明文 → 闭眼 -->
    <svg v-if="revealed" class="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" aria-hidden="true">
        <path d="M3 13.2c3.1 3.2 6 4.8 9 4.8s5.9-1.6 9-4.8" />
        <path d="M6.2 16.1 4.6 18.9" />
        <path d="M12 18v3" />
        <path d="M17.8 16.1 19.4 18.9" />
    </svg>
    <!-- 遮蔽中 → 睁眼 -->
    <svg v-else class="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
</template>

<style scoped>
.glyph {
    width: 16px;
    height: 16px;
    display: block;
}
</style>
