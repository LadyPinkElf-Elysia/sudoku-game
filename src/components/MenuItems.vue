<script setup lang="ts">
import type { MenuDef } from '@/types/menu';
import MenuItem from './MenuItem.vue';

defineProps<{
    items:MenuDef[]
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