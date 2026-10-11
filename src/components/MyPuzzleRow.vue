<script setup lang="ts">
import { computed } from 'vue';
import Flex from './Flex.vue';
import FormField from './FormField.vue';
import RenameText from './RenameText.vue';
import SecretValue from './SecretValue.vue';
import TextAction from './TextAction.vue';
import { metaTextOf } from '@/composables/puzzle/metaText';
import { TITLE_MAX } from '@/constants/game';
import { MINE_COPY, PUZZLE_VISIBILITY_OPTIONS, SOLUTION_OPTIONS, SOLUTION_VALUE } from '@/constants/puzzle';
import type { Actions, MyPuzzleRowControls } from '@/types/item';
import type { MyPuzzle, Visibility } from '@/types/puzzle';

/** 卡片里两个设置下拉要求等宽 */
const SELECT_WIDTH = '7rem'

const props = defineProps<{
    item: MyPuzzle
    /** 行内控件（可见性 / 参考答案下拉、内联重命名、预览、挑战、编辑、删除、pid 取值） */
    controls: MyPuzzleRowControls
}>()

/** 元信息行文本（组件只画一行；文案与时间格式在 metaTextOf 一处） */
const metaText = computed<string>(() => metaTextOf(props.item))

/** 两个设置下拉都用可写 computed：读 item、写回走 controls（落库） */
const visPick = computed<Visibility>({
    get: () => props.item.visibility,
    set: (value) => props.controls.onVisibility(value),
})

const solutionPick = computed<string>({
    get: () => (props.item.showSolution ? SOLUTION_VALUE.On : SOLUTION_VALUE.Off),
    set: (value) => props.controls.onSolution(value === SOLUTION_VALUE.On),
})

/** 右上角：删除 · 编辑（左删除右编辑） */
const cornerItems = computed<Actions>(() => [
    { key: 'remove', text: MINE_COPY.remove, onClick: props.controls.onRemove },
    { key: 'edit', text: MINE_COPY.edit, onClick: props.controls.onEdit },
])

/** 题目预览 / 答案预览（同一行的纯文字） */
const previewItems = computed<Actions>(() => [
    { key: 'preview', text: MINE_COPY.preview, onClick: () => props.controls.onPreview(false) },
    { key: 'answer', text: MINE_COPY.answerPreview, onClick: () => props.controls.onPreview(true) },
])

/** 挑战：本行唯一的动作 */
const challengeItems = computed<Actions>(() => [
    { key: 'challenge', text: `▶ ${MINE_COPY.challenge}`, onClick: props.controls.onChallenge },
])
</script>

<template>
    <!-- 私人列表项（「我的题目」，选项多）：外壳是全局 .item-card，这里只画自己的内容 -->
    <article class="item-card">
        <Flex class="item-head" align="baseline" justify="between" :gap="8">
            <div class="item-title-line">
                <!-- 标题位：标题 +「重命名」（点了就地变输入框） -->
                <RenameText :text="item.title" :renaming="controls.renaming" :rename-text="controls.renameText"
                    :maxlength="TITLE_MAX" :placeholder="MINE_COPY.renamePlaceholder" :label="MINE_COPY.rename"
                    tag="h3" @start="controls.onRenameStart()" @input="controls.onRenameInput"
                    @commit="controls.onRenameCommit()" @cancel="controls.onRenameCancel()" />
            </div>

            <!-- 右上角：删除 · 编辑 -->
            <Flex class="item-corner" :gap="6">
                <TextAction v-for="a in cornerItems" :key="a.key" :text="a.text" :on-click="a.onClick" />
            </Flex>
        </Flex>

        <p class="meta-line">{{ metaText }}</p>

        <SecretValue :label="MINE_COPY.pidTag" :load="controls.loadPid" />

        <!-- 设置项：可见性靠左、答案靠右（分居两侧）；两个下拉等宽 -->
        <Flex justify="between" :gap="12" wrap>
            <FormField v-model="visPick" type="select" compact :label="MINE_COPY.visibilityLabel"
                :options="PUZZLE_VISIBILITY_OPTIONS" :width="SELECT_WIDTH" />
            <FormField v-model="solutionPick" type="select" compact :label="MINE_COPY.solutionLabel"
                :options="SOLUTION_OPTIONS" :width="SELECT_WIDTH" />
        </Flex>

        <!-- 题目预览 · 答案预览 · 挑战：同一行，挑战在最右边 -->
        <Flex class="op-bar" justify="between" :gap="12">
            <Flex :gap="6">
                <TextAction v-for="a in previewItems" :key="a.key" :text="a.text" :on-click="a.onClick" />
            </Flex>

            <TextAction v-for="a in challengeItems" :key="a.key" :text="a.text" :on-click="a.onClick" />
        </Flex>
    </article>
</template>

<style scoped>
/* 列表项外壳 .item-card/.item-head/.item-title-line/.item-corner 来自全局 styles/card.css；
   间距与对齐由 Flex 给，这里不再需要样式 */
</style>


