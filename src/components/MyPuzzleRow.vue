<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import ActionItem from './ActionItem.vue';
import ValueIcons from './ValueIcons.vue';
import { TITLE_MAX } from '@/constants/game';
import { MINE_COPY, PUZZLE_VISIBILITY_OPTIONS, SOLUTION_OPTIONS, SOLUTION_VALUE } from '@/constants/puzzle';
import type { Action, MyPuzzleRowControls, ValueIconsProps } from '@/types/item';
import type { MyPuzzle, Visibility } from '@/types/puzzle';

const props = defineProps<{
    item: MyPuzzle
    /** 已按「显示 / 遮蔽」算好的 pid 文本 */
    pidText: string
    /** pid 右侧的裸图标组参数（👁 睁/闭 + 📋 复制，由 composable 现算） */
    pidIcons: ValueIconsProps
    /** 行内控件（可见性 / 参考答案下拉、内联重命名、预览、挑战、编辑、删除） */
    controls: MyPuzzleRowControls
}>()

/** 出题时间（本地时区、24 小时制）；没记录（旧数据 / 旧后端）→ 按「现在」显示 */
const createdText = computed<string>(() => new Date(props.item.createdAt || Date.now()).toLocaleString('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}))

/** 参考答案下拉的当前值（'on' / 'off'） */
const solutionValue = computed<string>(() => (props.item.showSolution ? SOLUTION_VALUE.On : SOLUTION_VALUE.Off))

/** 挑战：本行唯一保留的按钮（其余操作都是竖排文字 / 下拉） */
const challengeAction = computed<Action>(() => ({
    key: 'challenge', icon: '▶', message: MINE_COPY.challenge, onClick: props.controls.onChallenge,
}))

/** 进入内联重命名时自动聚焦输入框 */
const renameBox = ref<HTMLInputElement | null>(null)
watch(() => props.controls.renaming, async (on) => {
    if (!on) return
    await nextTick()
    renameBox.value?.focus()
})
</script>

<template>
    <article class="row">
        <!-- 标题行：标题 +「重命名」（点了标题变输入框）；右上角「删除 · 编辑」 -->
        <header class="row-head">
            <input v-if="controls.renaming" ref="renameBox" class="input row-rename" :value="controls.renameText"
                :maxlength="TITLE_MAX" :placeholder="MINE_COPY.renamePlaceholder"
                @input="controls.onRenameInput(($event.target as HTMLInputElement).value)"
                @keyup.enter="controls.onRenameCommit()" @keyup.esc="controls.onRenameCancel()"
                @blur="controls.onRenameCommit()">
            <template v-else>
                <h3 class="row-title" :title="item.title">{{ item.title }}</h3>
                <button class="text-btn" type="button" @click="controls.onRenameStart()">{{ MINE_COPY.rename }}</button>
            </template>

            <div v-if="!controls.renaming" class="row-corner">
                <button class="text-btn" type="button" @click="controls.onRemove()">{{ MINE_COPY.remove }}</button>
                <button class="text-btn" type="button" @click="controls.onEdit()">{{ MINE_COPY.edit }}</button>
            </div>
        </header>

        <p class="row-meta">
            盘面大小 {{ item.sideS }}×{{ item.sideS }} · 挖空 {{ item.blankCount }} 格 ·
            创建时间 {{ createdText }} · 热度 {{ item.playCount ?? 0 }}
        </p>

        <p class="row-pid">
            <span>{{ pidText }}</span>
            <ValueIcons v-bind="pidIcons" />
        </p>

        <!-- 竖排：可见性 / 参考答案（下拉，取代原来的三态按钮与开关按钮） -->
        <p class="row-field">
            <span class="row-label">{{ MINE_COPY.visibilityLabel }}</span>
            <select class="select is-sm" :value="item.visibility"
                @change="controls.onVisibility(($event.target as HTMLSelectElement).value as Visibility)">
                <option v-for="opt in PUZZLE_VISIBILITY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
        </p>
        <p class="row-field">
            <span class="row-label">{{ MINE_COPY.solutionLabel }}</span>
            <select class="select is-sm" :value="solutionValue"
                @change="controls.onSolution(($event.target as HTMLSelectElement).value === SOLUTION_VALUE.On)">
                <option v-for="opt in SOLUTION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
        </p>

        <!-- 竖排：预览（纯文字，不用按钮框） -->
        <p class="row-links">
            <button class="text-btn" type="button" @click="controls.onPreview(false)">{{ MINE_COPY.preview }}</button>
            <button class="text-btn" type="button" @click="controls.onPreview(true)">{{ MINE_COPY.answerPreview }}</button>
        </p>

        <!-- 挑战：唯一保留的按钮 -->
        <div class="row-challenge">
            <ActionItem :item="challengeAction" />
        </div>
    </article>
</template>

<style scoped>
/* .overlay-* 与列表公共类在全局；这里只有本行卡片外观 */
.row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px 14px;
    background: #fff;
}

/* 标题行：左标题（+ 重命名）右「删除 · 编辑」 */
.row-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
}

.row-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #111827;
    word-break: break-all;
}

.row-rename {
    height: 30px;
    font-size: 0.9rem;
}

.row-corner {
    display: flex;
    flex: none;
    gap: 10px;
}

.row-meta {
    margin: 0;
    font-size: 0.78rem;
    color: #6b7280;
}

.row-pid {
    margin: 0;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 0.78rem;
    color: #4b5563;
    word-break: break-all;
}

/* 竖排控件：标签 + 下拉 */
.row-field {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

.row-label {
    font-size: 0.78rem;
    color: #6b7280;
}

/* 预览竖排（纯文字，无按钮框） */
.row-links {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
}

.row-challenge {
    margin-top: 2px;
}

/* 文字型操作（重命名 / 删除 / 编辑 / 题目预览 / 答案预览）：无边框、无底色 */
.text-btn {
    border: none;
    background: none;
    padding: 0;
    color: #4f46e5;
    font-size: 0.78rem;
    font-family: inherit;
    cursor: pointer;
}

.text-btn:hover {
    text-decoration: underline;
}
</style>

