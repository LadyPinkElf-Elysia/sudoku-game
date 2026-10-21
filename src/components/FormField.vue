<script setup lang="ts">
import { computed } from 'vue';
import { ElInput, ElOption, ElSelect, ElSlider } from 'element-plus';
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
/** 紧凑（列表工具条 / 卡片设置项）→ EP 的 small 尺寸 */
const size = computed(() => (props.compact ? 'small' : 'default'))

/** 文本 / 多行 / 密码：el-input 回传字符串 */
const onText = (value: string): void => {
    emit('update:modelValue', value)
}

/** 下拉：选项值原样带回（盘面大小 B 这类数字选项不再手工还原类型） */
const onPick = (value: string | number): void => {
    emit('update:modelValue', value)
}

/** 滑动条：EP 在范围模式下回传数组，这里只认单值 */
const onSlide = (value: number | number[]): void => {
    emit('update:modelValue', Array.isArray(value) ? value[0] : value)
}
</script>

<template>
    <!--
      通用表单字段：**数据 + 渲染方式**传进来，由本组件决定画哪个控件
      type = text / textarea / password / select / range；外观走 Element Plus（主题变量见 styles/form.css）
      根节点仍是 <label>：页面上挂在 FormField 上的原生事件（如登录页 @paste）继续冒泡到这里
    -->
    <label class="field" :class="{ 'is-vertical': vertical }">
        <span v-if="label" class="text">{{ label }}</span>

        <el-input v-if="type === 'textarea'" class="control textarea" type="textarea" :rows="4" resize="none"
            :model-value="modelValue" :placeholder="placeholder" :maxlength="maxlength"
            @update:model-value="onText" />

        <el-select v-else-if="type === 'select'" class="control" :class="{ 'is-compact': compact }" :size="size"
            :style="width ? { width } : undefined" :model-value="modelValue" @update:model-value="onPick">
            <el-option v-for="opt in options ?? []" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>

        <el-slider v-else-if="type === 'range'" class="control" :model-value="Number(modelValue)"
            :min="min ?? 0" :max="max ?? 100" :step="step ?? 1" @update:model-value="onSlide" />

        <!-- 密码：show-password 自带 👁（原来的 EyeGlyph + 定位样式已删除） -->
        <el-input v-else-if="type === 'password'" class="control" type="password" show-password :size="size"
            :model-value="modelValue" :placeholder="placeholder" :maxlength="maxlength"
            :autocomplete="autocomplete" @update:model-value="onText" />

        <el-input v-else class="control" :class="{ 'is-mono': mono }" :size="size" :model-value="modelValue"
            :placeholder="placeholder" :maxlength="maxlength" :autocomplete="autocomplete"
            @update:model-value="onText" />

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
.textarea :deep(.el-textarea__inner) {
    height: 96px;
    padding: 8px 10px;
    line-height: 1.5;
    font-family: ui-monospace, Menlo, monospace;
    resize: vertical;
}

/* 等宽：账号 ID 一类需要逐字核对的值（要穿到 el-input 内层去） */
.is-mono :deep(.el-input__inner) {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: .5px;
}

/* 控件默认撑满一行 */
.control {
    width: 100%;
}

/* 紧凑下拉（列表工具条两项并排）：不撑满 */
.control.is-compact {
    width: auto;
    min-width: 108px;
}
</style>
