<script setup lang="ts">
import ActionItem from './ActionItem.vue';
import { type ActionDef } from '@/types/actionDef';
defineProps<{
    items: ActionDef[]
}>()
</script>

<template>
    <div class="action-row">
        <ActionItem v-for="item in items" :key="item.key" :item="item" />
    </div>
    <div class="action-tip">
        <slot name="tip"></slot>
    </div>
</template>

<style scoped>
.action-row {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin: 10px 0;
    flex-wrap: wrap;
}

.action-tip {
    color: #4f46e5;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
    font-size: 0.9rem;
    padding: 6px 12px;
    border-radius: 8px;
    text-align: center;
    margin-top: 8px;
}

.action-tip:empty {
    display: none;
}
</style>