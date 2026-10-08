<script setup lang="ts">
import { useTodoStore } from '@/stores/todo'

const store = useTodoStore()
</script>

<template>
  <div class="toolbar">
    <button @click="store.toggleFilter">
      {{ store.hideCompleted ? '显示全部' : '隐藏已完成' }}
    </button>
  </div>
</template>