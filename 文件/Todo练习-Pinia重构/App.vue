<script setup lang="ts">
import { ref } from 'vue';
import TodoHide from './components/TodoHide.vue';
import TodoInput from './components/TodoInput.vue';
import TodoItems from './components/TodoItems.vue';
import TodoTitle from './components/TodoTitle.vue';

const title=ref('Todo列表')
</script>

<template>
    <TodoTitle :title></TodoTitle>
    <TodoInput></TodoInput>
    <TodoItems></TodoItems>
    <TodoHide></TodoHide>
</template>