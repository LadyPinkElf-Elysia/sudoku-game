<script setup lang="ts">
import { type Todo, useTodoStore } from "@/stores/todo";
import { useTemplateRef } from "vue";

const props = defineProps<{
    todo: Todo
}>()

const todoStore = useTodoStore()

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const saveTodo = () => {
    if (todoStore.editingId !== props.todo.id) return
    if (!inputRef.value) return
    todoStore.updateTodo(props.todo.id, (inputRef.value as HTMLInputElement).value)
}
</script>

<template>
    <input v-if="todoStore.editingId === todo.id" type="text" ref="inputRef" :value="todo.text" @blur="saveTodo"
        @keyup.enter="saveTodo" @keyup.esc="todoStore.cancelEditTodo" />
    <span v-else :class="{ done: todo.done }" title="双击编辑" @dblclick="todoStore.startEditTodo(todo.id)">{{ todo.text
        }}</span>
</template>

<style scoped>
.done {
    text-decoration: line-through;
}
</style>