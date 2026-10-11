<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
    /** 字段标题 */
    label: string
    /** v-model 绑定的密码文本 */
    modelValue: string
    /** 可选说明（如「至少 8 位」） */
    hint?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

/** 默认遮蔽，点 👁 切明文 */
const visible = ref(false);
const toggle = (): void => { visible.value = !visible.value };
</script>

<template>
    <label class="field">
        <span class="label">{{ label }}</span>

        <span class="control">
            <input class="input" :type="visible ? 'text' : 'password'" :value="modelValue"
                spellcheck="false" autocomplete="off"
                @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)">
            <button type="button" class="eye" :aria-label="visible ? '隐藏密码' : '显示密码'"
                @click="toggle">{{ visible ? '🙈' : '👁' }}</button>
        </span>

        <span v-if="hint" class="hint">{{ hint }}</span>
    </label>
</template>

<style scoped>
.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.label {
    font-size: 0.78rem;
    color: #6b7280;
    font-weight: 600;
}

.control {
    position: relative;
    display: block;
}

.input {
    width: 100%;
    box-sizing: border-box;
    height: 36px;
    padding: 0 38px 0 10px;      /* 右侧给 👁 留位 */
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #111827;
    outline: none;
    transition: 0.15s;
}

.input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px #eef2ff;
}

.eye {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    width: 30px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: none;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
}

.eye:hover {
    background: #eef2ff;
}

.hint {
    font-size: 0.72rem;
    color: #9ca3af;
    line-height: 1.4;
}
</style>
