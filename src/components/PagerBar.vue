<script setup lang="ts">
import { computed } from 'vue';
import Flex from './Flex.vue';
import PagerSliderView from './PagerSliderView.vue';
import PagerStepsView from './PagerStepsView.vue';
import TextAction from './TextAction.vue';
import { PAGER_MODE } from '@/constants/puzzle';
import type { PagerMode } from '@/types/puzzle';

const props = defineProps<{
    page: number
    pageCount: number
    /** 浏览方式（进度条 / 滑动条 / 步骤条）—— 只报数据，怎么画由本组件决定 */
    mode: PagerMode
    /** 步骤条用：每一步的文案（不传就显示下标） */
    stepLabel?: (index: number) => string
    /** 步骤条用：信息行文案（不传 = 历史步数语义） */
    infoText?: string
}>()

const emit = defineEmits<{ change: [page: number] }>()

/** 步骤条只有 1 步也显示（历史记录），分页条要在 2 页以上才出现 */
const visible = computed(() => props.pageCount > (props.mode === PAGER_MODE.Steps ? 0 : 1))

/** 越界 / 原地不动就不发（三种渲染方式的交互都走这里）
 *  页码从 1 开始 → 最大 = pageCount；步骤从 0 开始 → 最大 = pageCount - 1 */
const go = (next: number): void => {
    const steps = props.mode === PAGER_MODE.Steps
    const min = steps ? 0 : 1
    const max = steps ? props.pageCount - 1 : props.pageCount
    if (next < min || next > max || next === props.page) return
    emit('change', next)
}
</script>

<template>
    <Flex v-if="visible" class="pager" :gap="10" justify="center">
        <!-- 滑动条：拖动 · 键盘左右 -->
        <PagerSliderView v-if="mode === PAGER_MODE.Slider" :page="page" :page-count="pageCount" @change="go" />

        <!-- 步骤条：一串可点选的步骤（游戏页历史记录） -->
        <PagerStepsView v-else-if="mode === PAGER_MODE.Steps" :page="page" :page-count="pageCount"
            :step-label="stepLabel" :info-text="infoText" @change="go" />

        <!-- 进度条（默认）：上一页 / 页码 / 下一页 —— 都是可点击文本 -->
        <template v-else>
            <TextAction text="上一页" :on-click="page > 1 ? () => go(page - 1) : undefined" />
            <span class="pager-info">{{ page }} / {{ pageCount }}</span>
            <TextAction text="下一页" :on-click="page < pageCount ? () => go(page + 1) : undefined" />
        </template>
    </Flex>
</template>

<style scoped>
.pager {
    margin-top: 14px;
}

.pager-info {
    font-size: 0.78rem;
    color: #6b7280;
    white-space: nowrap;
}
</style>
