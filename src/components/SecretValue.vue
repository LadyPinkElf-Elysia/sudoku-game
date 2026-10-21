<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElButton, ElIcon } from 'element-plus';
import { CopyDocument, Hide, Select, View } from '@element-plus/icons-vue';
import { useClipboard } from '@/composables/useClipboard';

/**
 * 敏感值（pid / uid 共用，全站唯一一个）：**传标签 + 传取值方式 → 自己决定怎么显示**
 * · 默认遮蔽（`pid ▮▮▮▮▮▮▮▮`）；点 👁 才现取真值并明文显示（取到的值缓存在本组件）
 * · 点 📋 直接复制真值（不进界面，成功变 ✅）
 * · 点击事件就在组件里响应，调用方不用管「遮蔽 / 明文 / 复制」那套状态
 */
const props = withDefaults(defineProps<{
    /** 值标签（`pid` / `uid`；遮蔽与明文都带同一前缀，点开不会换模样） */
    label: string
    /** 取真值（点了才调；返回空 = 没取到，保持遮蔽） */
    load: () => Promise<string | null>
    /** 初始就是明文 */
    revealed?: boolean
}>(), { revealed: false })

const { copied, copy } = useClipboard()
/** 是否明文 */
const open = ref<boolean>(props.revealed)
/** 已取到的真值 */
const value = ref('')

const MASK = '▮▮▮▮▮▮▮▮'

/** 现取真值（取过就复用） */
const fetchValue = async (): Promise<string> => {
    if (!value.value) value.value = (await props.load()) ?? ''
    return value.value
}

/** 👁：明文 ↔ 遮蔽 */
const toggle = async (): Promise<void> => {
    if (open.value) { open.value = false; return }
    if (await fetchValue()) open.value = true
}

/** 📋：真值进剪贴板 */
const copyValue = async (): Promise<void> => {
    const v = await fetchValue()
    if (v) await copy(v)
}

const text = computed<string>(() => `${props.label} ${open.value ? value.value : MASK}`)
</script>

<template>
    <!-- 等宽敏感值 + 👁/📋（两颗都是「可点击文本」，眼睛图形与密码框同一套） -->
    <p class="secret">
        <span>{{ text }}</span>

        <span class="icon-row">
            <el-button class="glyph" link title="显示 / 隐藏" @click="toggle">
                <el-icon><Hide v-if="open" /><View v-else /></el-icon>
            </el-button>

            <el-button class="glyph" link title="复制" @click="copyValue">
                <el-icon><Select v-if="copied" /><CopyDocument v-else /></el-icon>
            </el-button>
        </span>
    </p>
</template>

<style scoped>
.secret {
    margin: 0;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 0.78rem;
    color: #4b5563;
    word-break: break-all;
}

.icon-row {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-left: 6px;
    vertical-align: middle;
}

/* 裸图标：没有框，也没有 hover 底色（就是普通文字）
   ⚠️ 图标是 currentColor：这里给的是"图标颜色"，与 el-button link 的文字色分开 */
.glyph {
    --el-button-text-color: #4b5563;
    --el-button-hover-link-text-color: #6366f1;
    justify-content: center;
    height: auto;
    margin: 0;
    padding: 2px 4px;
    font-size: 1rem;
    line-height: 1;
    color: #4b5563;
}

.glyph:hover {
    color: #6366f1;
}
</style>
