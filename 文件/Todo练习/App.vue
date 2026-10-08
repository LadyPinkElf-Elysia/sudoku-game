<script setup lang="ts">
import { provide, ref } from 'vue';
import TodoItems from './components/TodoItems.vue';
import TodoInput from './components/TodoInput.vue';
import TodoTitle from './components/TodoTitle.vue';
import TodoHide from './components/TodoHide.vue';
import { TODO_API_KEY, type TodoApi } from './types/TodoApi.ts';
import { useTodoList } from './composables/useTodoList.ts';
import { useTodoFilter } from './composables/useTodoFilter.ts';

const {todos,addTodo,removeTodo,toggleTodo,editTodo,updateTodo}=useTodoList()

const title = ref<string>('Todo列表')

const {hideCompleted,visibleTodos,toggle}=useTodoFilter(todos)

provide<TodoApi>(TODO_API_KEY, {
    removeTodo,
    toggleTodo,
    editTodo,
    updateTodo
})

</script>

<template>
    <TodoTitle :title="title" />
    <TodoInput @add-todo="addTodo" />
    <TodoItems :todos="visibleTodos" />
    <TodoHide :hide-completed="hideCompleted" @toggle="toggle" />
</template>
