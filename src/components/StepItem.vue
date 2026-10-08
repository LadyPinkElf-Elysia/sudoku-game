<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
const props = defineProps<{
    step: number
}>()
const store = useGameStore()
const activeClass = computed(() => ({
    active: props.step === store.steps,
    future: props.step > store.steps
}))
const jump = (): void => store.jump(props.step)
</script>

<template>
    <button class="step-block" :class="activeClass" @click="jump">
        {{ step }}步
    </button>
</template>

<style scoped>
.step-block {
    flex: 0 0 auto;
    min-width: 44px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0 8px;
    white-space: nowrap;
}

.step-block:hover {
    background: #eef2ff;
    border-color: #a5b4fc;
}

.step-block.active {
    background: #6366f1;
    border-color: #4f46e5;
    color: #fff;
    font-weight: 600;
}

/* 未来步（撤回之后）：灰色、半透明 */
.step-block.future {
    color: #cbd5e1;
    background: #fafafa;
    border-color: #f1f5f9;
}

.step-block.future:hover {
    color: #64748b;
    background: #f1f5f9;
    border-color: #e2e8f0;
}
</style>