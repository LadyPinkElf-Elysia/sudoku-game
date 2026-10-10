<script setup lang="ts">
import type { Menus } from '@/types/item.ts';
import MenuItem from './MenuItem.vue';

defineProps<{
    items:Menus
}>()
</script>

<template>
    <nav class="menu-list">
        <MenuItem v-for="item in items" :item :key="item.key"></MenuItem>
    </nav>
</template>

<style scoped>
.menu-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>