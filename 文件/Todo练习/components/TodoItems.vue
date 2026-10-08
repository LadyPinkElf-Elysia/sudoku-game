<script setup lang="ts">
import { inject } from 'vue';
import type { Todos } from '../types/TodoType.ts'
import TodoItemsEdit from './TodoItemsEdit.vue';
import { TODO_API_KEY, type TodoApi } from '../types/TodoApi.ts';

defineProps<{
    todos: Todos
}>()

const {removeTodo,toggleTodo} = inject(TODO_API_KEY) as TodoApi

</script>

<template>
    <ul>
        <li v-for="todo in todos" :key="todo.id">
            <input type="checkbox" :checked="todo.done" @change="toggleTodo(todo.id)">
            <TodoItemsEdit :todo="todo" />
            <button @click="removeTodo(todo.id)">删除</button>
        </li>
    </ul>
</template>

