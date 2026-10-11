<script setup lang="ts">
import type { Menus } from '@/types/item';
import MenuItem from './MenuItem.vue';

defineProps<{
    items: Menus
}>()

/** 灰显项被点击 → 冒泡给页面，由页面决定提示文案（components 不碰文案策略/路由） */
const emit = defineEmits<{ blocked: [] }>()
</script>

<template>
    <nav class="menu-list">
        <MenuItem v-for="item in items" :item="item" :key="item.key" @blocked="emit('blocked')"></MenuItem>
    </nav>
    <p class="menu-tip">
        <slot name="tip"></slot>
    </p>
</template>

<style scoped>
.menu-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

/* 提示条：与 ActionItems 的 .action-tip 同款；为空时整行隐藏 */
.menu-tip {
    margin: 12px 0 0;
    padding: 6px 12px;
    border-radius: 8px;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
    color: #4f46e5;
    font-size: 0.9rem;
    text-align: center;
}

.menu-tip:empty {
    display: none;
}
</style>
