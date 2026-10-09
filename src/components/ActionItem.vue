<script setup lang="ts">
import { type ActionDef } from "@/types/action";
defineProps<{
    item: ActionDef
}>()
</script>

<template>
    <button class="action-btn" :disabled="item.disabled" @click="item.onClick">
        <span v-if="item.icon">{{ item.icon }}</span>
        <span>{{ item.message }}</span>
    </button>
</template>

<style scoped>
.action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;          
    border: 1px solid #d1d5db;   
    background: #fff;
    cursor: pointer;
    color: #374151;
    font-size: 0.85rem;
    font-weight: 500;            
    transition: 0.15s;
}

.action-btn:hover:not(:disabled) {
    background: #eef2ff;
    border-color: #6366f1;
}

.action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}
</style>