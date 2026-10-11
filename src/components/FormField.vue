<script setup lang="ts">
import { computed, ref } from 'vue';
import EyeGlyph from './EyeGlyph.vue';
import TextAction from './TextAction.vue';
import type { SelectOption } from '@/types/item';

const props = defineProps<{
    /** 渲染方式：单行文本 / 多行文本 / 密码（带 👁）/ 下拉 / 滑动条 */
    type?: 'text' | 'textarea' | 'password' | 'select' | 'range'
    /** 标签文案（不传就不显示标签） */
    label?: string
    /** v-model 绑定的值（下拉可传数字，如盘面大小 B） */
    modelValue: string | number
    /** 下拉选项（type=select） */
    options?: readonly SelectOption[]
    /** 滑动条范围（type=range） */
    min?: number
    max?: number
    step?: number
    placeholder?: string
    /** 最大长度（与常量一致） */
    maxlength?: number
    /** 说明行（格式提示 / 字符计数都由调用方算好传进来） */
    hint?: string
    /** 等宽字体（账号 ID、题面串这类要逐字核对） */
    mono?: boolean
    /** 浏览器自动填充提示（如 'off'） */
    autocomplete?: string
    /** 小号（列表工具条 / 卡片设置项） */
    compact?: boolean
    /** 标签放上面（表单用）；默认放左边 */
    vertical?: boolean
    /** 固定宽度（例如卡片里两个下拉要等宽） */
    width?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

const type = computed(() => props.type ?? 'text')
/** 密码的明文开关（type=password） */
const visible = ref(false)

/** 文本类控件：直接回传文本 */
const onInput = (e: Event): void => {
    emit('update:modelValue', (e.target as HTMLInputElement | HTMLTextAreaElement).value)
}

/** 下拉 / 滑动条：下拉按键值还原原始类型（数字选项如盘面大小 B），滑动条转数字 */
const onValue = (e: Event): void => {
    const raw = (e.target as HTMLInputElement | HTMLSelectElement).value
    const hit = props.options?.find((o) => String(o.value) === raw)
    emit('update:modelValue', hit ? hit.value : Number(raw))
}
</script>

<template>
    <!--
      通用表单字段：**数据 + 渲染方式**传进来，由本组件决定画哪个控件
      type = text / textarea / password / select / range；规格来自全局 styles/form.css
    -->
    <label class="field" :class="{ 'is-vertical': vertical }">
        <span v-if="label" class="text">{{ label }}</span>

        <textarea v-if="type === 'textarea'" class="input textarea" :value="modelValue" :placeholder="placeholder"
            :maxlength="maxlength" spellcheck="false" @input="onInput"></textarea>

        <select v-else-if="type === 'select'" class="select" :class="{ 'is-sm': compact }"
            :style="width ? { width } : undefined" :value="modelValue" @change="onValue">
            <option v-for="opt in options ?? []" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>

        <input v-else-if="type === 'range'" class="slider" type="range" :min="min" :max="max" :step="step"
            :value="modelValue" @input="onValue">

        <span v-else class="control">
            <input class="input" :class="{ 'is-mono': mono, 'has-eye': type === 'password' }"
                :type="type === 'password' && !visible ? 'password' : 'text'" :value="modelValue"
                :placeholder="placeholder" :maxlength="maxlength" :autocomplete="autocomplete" spellcheck="false"
                @input="onInput">

            <!-- 密码右侧的 👁 就是通用的「可点击文本」（自绘图形走插槽） -->
            <TextAction v-if="type === 'password'" class="eye" :on-click="() => (visible = !visible)">
                <EyeGlyph :revealed="visible" />
            </TextAction>
        </span>

        <span v-if="hint" class="hint">{{ hint }}</span>
    </label>
</template>

<style scoped>
/* 横向：标签在左、控件在右（列表工具条 / 卡片设置项）—— 必须显式 row，否则会继承全局 .field 的纵向 */
.field {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
    margin-bottom: 0;
}

/* 纵向：标签在上（表单用），沿用全局 .field 的间距 */
.field.is-vertical {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    margin-bottom: 18px;
}

.text {
    font-size: 0.78rem;
    color: #6b7280;
    white-space: nowrap;
}

.field.is-vertical .text {
    font-weight: 600;
}

/* 多行输入：等宽 + 可纵向拉伸（题面串要逐字核对） */
.textarea {
    height: 96px;
    padding: 8px 10px;
    line-height: 1.5;
    font-family: ui-monospace, Menlo, monospace;
    resize: vertical;
}

/* 滑动条 */
.slider {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: #e5e7eb;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
}

.slider::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #6366f1;
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    cursor: pointer;
}

.slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #6366f1;
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    cursor: pointer;
}

/* 等宽：账号 ID 一类需要逐字核对的值 */
.input.is-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: .5px;
}

/* 密码框：右侧给 👁 留位 */
.control {
    position: relative;
    display: block;
}

.input.has-eye {
    padding-right: 38px;
}

.eye {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    width: 30px;
    height: 28px;
    justify-content: center;
}
</style>
