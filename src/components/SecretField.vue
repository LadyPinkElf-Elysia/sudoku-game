<script setup lang="ts">
import { ref } from 'vue';
import EyeGlyph from './EyeGlyph.vue';

defineProps<{
    /** 字段标题 */
    label: string
    /** v-model 绑定的密码文本 */
    modelValue: string
    /** 可选说明（如「至少 8 位」） */
    hint?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

/** 默认遮蔽，点眼睛切明文（睁/闭图标来自 EyeGlyph，全站一套） */
const visible = ref(false);
const toggle = (): void => { visible.value = !visible.value };
</script>

<template>
    <label class="field">
        <span class="label">{{ label }}</span>

        <span class="control">
            <input class="input" :type="visible ? 'text' : 'password'" :value="modelValue" spellcheck="false"
                autocomplete="off" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)">
            <button type="button" class="eye" :aria-label="visible ? '隐藏密码' : '显示密码'" @click="toggle">
                <EyeGlyph :revealed="visible" />
            </button>
        </span>

        <span v-if="hint" class="hint">{{ hint }}</span>
    </label>
</template>

<style scoped>
/* .field / .label / .input / .hint 来自 styles/form.css（全局） */
.control {
    position: relative;
    display: block;
}

/* 仅布局微调：右侧给 👁 留位（scoped 优先级高于全局 .input） */
.input {
    padding-right: 38px;
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
</style>
