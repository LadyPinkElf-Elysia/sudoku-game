<script setup lang="ts">

const props = defineProps<{
    hideCompleted: boolean
}>()

const emit = defineEmits<{
    toggle: []
}>()

const toggle = (): void => {
    emit('toggle')
}

const content = (): string => props.hideCompleted ? '显示全部' : '隐藏已完成'
</script>

<template>
    <button @click="toggle">{{ content() }}</button>
</template>