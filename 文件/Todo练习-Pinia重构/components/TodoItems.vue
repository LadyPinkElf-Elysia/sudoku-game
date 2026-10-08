<script setup lang="ts">
import { useTodoStore } from '@/stores/todo';
import TodoItemEdit from './TodoItemEdit.vue';

const todoStore=useTodoStore()
</script>

<template>
    <ul v-if="todoStore.visibleTodos.length>0">
        <li v-for="todo in todoStore.visibleTodos" :key="todo.id">
            <input type="checkbox" :checked="todo.done" @change="todoStore.toggleTodo(todo.id)" />
            <TodoItemEdit :todo="todo"></TodoItemEdit>
            <button @click="todoStore.removeTodo(todo.id)">删除Todo</button>
        </li>
    </ul>
    <p v-else>暂无Todo...</p>
</template>