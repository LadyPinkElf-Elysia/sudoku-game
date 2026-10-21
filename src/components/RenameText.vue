<script setup lang="ts">
import { nextTick, ref, watch, type Component } from 'vue';
import { ElButton, ElIcon, ElInput } from 'element-plus';
import { EditPen } from '@element-plus/icons-vue';
import type { InputInstance } from 'element-plus';

const props = defineProps<{
    /** 显示文本（列表行标题 / 「我的」页显示名） */
    text: string
    /** 文本前的小图标（EP 图标组件；不传就只有文本） */
    icon?: Component
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
const box = ref<InputInstance>()
watch(() => props.renaming, async (on) => {
    if (!on) return
    await nextTick()
    box.value?.focus()
})
</script>

<template>
    <!-- 「文本 + 重命名」：点「重命名」文字就地变输入框（行内标题 / 账号显示名共用同一套键位） -->
    <span class="rename">
        <el-input v-if="renaming" ref="box" class="rename-input" :model-value="renameText" :maxlength="maxlength"
            :placeholder="placeholder" @update:model-value="(v) => emit('input', v)"
            @keyup.enter="emit('commit')" @keyup.esc="emit('cancel')" @blur="emit('commit')" />

        <template v-else>
            <el-icon v-if="icon" class="rename-icon"><component :is="icon" /></el-icon>
            <component :is="tag ?? 'span'" class="rename-text" :title="text">{{ text }}</component>
            <el-button class="text-action" link type="primary" @click="emit('start')">
                <el-icon class="rename-btn-icon"><EditPen /></el-icon>{{ label }}
            </el-button>
        </template>
    </span>
</template>

<style scoped>
/* 文本与「重命名」按基线对齐（字号不同才不会一高一低） */
.rename {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
}

/* 名字前的小图标（EP 图标；主色）—— 图标按中线对齐，不参与文字基线 */
.rename-icon {
    align-self: center;
    font-size: 1rem;
    color: var(--el-color-primary);
}

/* 「重命名」前的铅笔图标：与 ActionBar 的图标同色（主色）、略小一号 */
.rename-btn-icon {
    font-size: 13px;
    color: var(--el-color-primary);
}

.rename-text {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #111827;
    word-break: break-all;
}

/* 编辑态输入框：占满剩余宽度（高度走 EP 默认 36px，与其它控件一致） */
.rename-input {
    flex: 1;
    min-width: 0;
}
</style>
