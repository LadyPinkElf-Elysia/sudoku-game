<script setup lang="ts">
defineProps<{
    /** 直径（px），默认 44 */
    size?: number
}>()
</script>

<template>
    <div class="spinner" :style="{ width: `${size ?? 44}px`, height: `${size ?? 44}px` }"></div>
</template>

<style scoped>
.spinner {
    border-radius: 50%;
    border: 4px solid #e5e7eb;
    border-top-color: #6366f1;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>