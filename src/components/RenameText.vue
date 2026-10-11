<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

const props = defineProps<{
    /** 显示文本（列表行标题 / 「我的」页显示名） */
    text: string
    /** 文本前的小图标（账号区传 👤；不传就只有文本） */
    icon?: string
    /** 是否处于编辑态（父组件控制；编辑时文本位置换成输入框） */
    renaming: boolean
    /** 编辑中的文本 */
    renameText: string
    /** 最大长度（与常量一致） */
    maxlength: number
    placeholder: string
    /** 「重命名」四个字的文案来源（MINE_COPY / AUTH_COPY） */
    label: string
    /** 文本用什么标签渲染：标题传 'h3'，其余默认 span */
    tag?: string
}>()

const emit = defineEmits<{
    /** 点了「重命名」 */
    start: []
    /** 输入变化 */
    input: [value: string]
    /** 回车 / 失焦 → 提交 */
    commit: []
    /** Esc → 取消 */
    cancel: []
}>()

/** 进入编辑态就聚焦（本组件常驻，输入框由内部 v-if 控制出现） */
const box = ref<HTMLInputElement | null>(null)
watch(() => props.renaming, async (on) => {
    if (!on) return
    await nextTick()
    box.value?.focus()
})
</script>

<template>
    <!-- 「文本 + 重命名」：点「重命名」文字就地变输入框（行内标题 / 账号显示名共用同一套键位） -->
    <span class="rename">
        <input v-if="renaming" ref="box" class="input rename-input" :value="renameText" :maxlength="maxlength"
            :placeholder="placeholder" @input="emit('input', ($event.target as HTMLInputElement).value)"
            @keyup.enter="emit('commit')" @keyup.esc="emit('cancel')" @blur="emit('commit')">

        <template v-else>
            <!-- 图标与文本一起插值，避免模板把 `{{ icon }}` 后面的空格吃掉 -->
            <component :is="tag ?? 'span'" class="rename-text" :title="text">{{ icon ? `${icon} ` : '' }}{{ text }}</component>
            <button class="text-btn" type="button" @click="emit('start')">{{ label }}</button>
        </template>
    </span>
</template>

<style scoped>
/* 文本与「重命名」紧挨着（不用 space-between，避免被挤到行中间） */
.rename {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
}

.rename-text {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #111827;
    word-break: break-all;
}

.rename-input {
    flex: 1;
    height: 30px;
    font-size: 0.9rem;
}
</style>
