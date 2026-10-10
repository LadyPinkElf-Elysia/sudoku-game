<script setup lang="ts">
import MenuItems from '@/components/MenuItems.vue';
import { PAGE } from '@/constants/pages';
import type { Menus } from '@/types/item';

const menuItems: Menus = [
    { key: 'start', icon: '▶', message: '开始游戏', routeName: PAGE.Difficulty },
    { key: 'create', icon: '✏️', message: '出题', routeName: PAGE.Create },
]

</script>

<template>
    <div class="page-card home-page">
        <header class="title">数独</header>
        <MenuItems :items="menuItems"></MenuItems>
    </div>
</template>

<style scoped>
.home-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.title {
    text-align: center;
    font-size: 1.6rem;
    font-weight: 700;
    color: #111827;
    letter-spacing: 2px;
}
</style>