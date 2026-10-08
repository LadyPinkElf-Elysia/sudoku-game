<script setup lang="ts">
import { inject } from 'vue';
import { TODO_API_KEY, type TodoApi } from '../types/TodoApi';
import type{ Todo } from '../types/TodoType';

const props=defineProps<{
    todo:Todo
}>()

const {updateTodo,editTodo} =inject(TODO_API_KEY) as TodoApi

const handleBlur = (e: Event):void => {
    if (!e.target) return
    const t = e.target as HTMLInputElement
    updateTodo(props.todo.id , t.value)
}

</script>

<template>
    <input v-if="todo.editing" type="text" :value="todo.text" @blur="handleBlur">
    <span v-else :class="{ done: todo.done }" @dblclick="editTodo(todo.id)">{{ todo.text }}</span>
</template>

<style scoped>
.done {
    text-decoration: line-through;
}
</style>