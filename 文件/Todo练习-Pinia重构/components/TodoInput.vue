<script setup lang="ts">
import { useTodoStore } from '@/stores/todo';
import { ref } from 'vue';

const todoStore = useTodoStore()
const newText = ref('')

const submitTodo = (): void => {
    todoStore.addTodo(newText.value)
    newText.value = ''
}

</script>

<template>
    <input type="text" v-model="newText" placeholder="请输入Todo" @keyup.enter="submitTodo" />
    <button @click="submitTodo">加入Todo</button>
</template>