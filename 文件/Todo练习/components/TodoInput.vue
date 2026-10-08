<script setup lang="ts">
import { ref } from 'vue';

const todoText = ref<string>('')

const emit = defineEmits<{
    addTodo: [todoText: string]
}>()

const addTodo = (): void => {
    emit('addTodo', todoText.value)
    todoText.value = ''
}
</script>

<template>
    <input type="text" v-model.trim="todoText" placeholder="添加Todo">
    <button @click="addTodo">加入</button>
</template>