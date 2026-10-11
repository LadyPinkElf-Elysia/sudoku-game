<script setup lang="ts">
import { computed } from 'vue';
import ActionItem from './ActionItem.vue';
import PuzzleCardShell from './PuzzleCardShell.vue';
import PuzzleSettings from './PuzzleSettings.vue';
import RenameText from './RenameText.vue';
import SecretValue from './SecretValue.vue';
import TextButtons from './TextButtons.vue';
import { TITLE_MAX } from '@/constants/game';
import { MINE_COPY } from '@/constants/puzzle';
import type { Action, MyPuzzleRowControls, TextItems, ValueIconsProps } from '@/types/item';
import type { MyPuzzle } from '@/types/puzzle';

const props = defineProps<{
    item: MyPuzzle
    /** 已按「显示 / 遮蔽」算好的 pid 文本 */
    pidText: string
    /** pid 右侧的裸图标组参数（👁 睁/闭 + 📋 复制，由 composable 现算） */
    pidIcons: ValueIconsProps
    /** 行内控件（可见性 / 参考答案下拉、内联重命名、预览、挑战、编辑、删除） */
    controls: MyPuzzleRowControls
}>()

/** 右上角：删除 · 编辑（左删除右编辑） */
const cornerItems = computed<TextItems>(() => [
    { key: 'remove', label: MINE_COPY.remove, onClick: props.controls.onRemove },
    { key: 'edit', label: MINE_COPY.edit, onClick: props.controls.onEdit },
])

/** 题目预览 / 答案预览（同一行的纯文字） */
const previewItems = computed<TextItems>(() => [
    { key: 'preview', label: MINE_COPY.preview, onClick: () => props.controls.onPreview(false) },
    { key: 'answer', label: MINE_COPY.answerPreview, onClick: () => props.controls.onPreview(true) },
])

/** 挑战：本行唯一保留的按钮（其余操作都是文字 / 下拉） */
const challengeAction = computed<Action>(() => ({
    key: 'challenge', icon: '▶', message: MINE_COPY.challenge, onClick: props.controls.onChallenge,
}))
</script>

<template>
    <PuzzleCardShell :title="item.title" :side-s="item.sideS" :blank-count="item.blankCount"
        :created-at="item.createdAt" :play-count="item.playCount">
        <!-- 标题位：标题 +「重命名」（点了就地变输入框） -->
        <template #title>
            <RenameText :text="item.title" :renaming="controls.renaming" :rename-text="controls.renameText"
                :maxlength="TITLE_MAX" :placeholder="MINE_COPY.renamePlaceholder" :label="MINE_COPY.rename" tag="h3"
                @start="controls.onRenameStart()" @input="controls.onRenameInput" @commit="controls.onRenameCommit()"
                @cancel="controls.onRenameCancel()" />
        </template>

        <!-- 右上角：删除 · 编辑 -->
        <template #corner>
            <TextButtons :items="cornerItems" />
        </template>

        <SecretValue :text="pidText" :icons="pidIcons" />

        <PuzzleSettings :visibility="item.visibility" :solution-on="item.showSolution"
            :on-visibility="controls.onVisibility" :on-solution="controls.onSolution" />

        <TextButtons :items="previewItems" />

        <div class="challenge">
            <ActionItem :item="challengeAction" />
        </div>
    </PuzzleCardShell>
</template>

<style scoped>
/* 卡片外壳 / 文字按钮 / 值行的样式各自在自己的组件里；这里只剩「挑战」按钮的落位 */
.challenge {
    display: flex;
    justify-content: flex-start;
    margin-top: 2px;
}
</style>

