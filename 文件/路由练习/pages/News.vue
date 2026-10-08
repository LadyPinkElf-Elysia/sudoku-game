<script setup lang="ts">
import { ref } from 'vue';

let id = 0
const newsList = ref([
    { id: id++, title: '1', content: 'h' },
    { id: id++, title: '2', content: 'hh' },
    { id: id++, title: '3', content: 'hhh' },
    { id: id++, title: '4', content: 'hhhh' },
])
</script>

<template>
    <ul>
        <li v-for="news in newsList" :key="news.id">
            <RouterLink :to="{
                name:'detail',
                query:{
                    id:news.id,
                    title:news.title,
                    content:news.content
                }}">
                {{ news.title }}
            </RouterLink>
        </li>
    </ul>
    <RouterView />
</template>