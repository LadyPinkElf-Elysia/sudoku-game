<script setup lang="ts">
import type { MenuDef } from '@/types/menu';
defineProps<{
    item:MenuDef
}>()
</script>

<template>
    <RouterLink :to="{name:item.routeName}" class="menu-btn">
        <span v-if="item.icon" class="icon">{{ item.icon }}</span>
        <span class="message">{{ item.message }}</span>
    </RouterLink>
</template>

<style scoped>
.menu-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 48px;
    padding: 0 18px;
    border-radius: 10px;
    border: 1px solid #d1d5db;
    background: #fff;
    color: #374151;
    font-size: 0.95rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: 0.15s;
    box-sizing: border-box;
}

.menu-btn:hover {
    background: #eef2ff;
    border-color: #6366f1;
}

.icon {
    width: 22px;
    text-align: center;
    font-size: 1.05rem;
    flex-shrink: 0;
}

.message {
    flex: 1;
}
</style>