<script setup lang="ts" generic="T">
import { computed } from 'vue';
import { ElButton, ElEmpty, ElPagination, ElResult, ElSkeleton, ElSlider } from 'element-plus';
import Flex from './Flex.vue';
import FormField from './FormField.vue';
import PagerStepsView from './PagerStepsView.vue';
import { PAGER_MODE } from '@/constants/puzzle';
import type { ListBar, ListPager } from '@/types/item';

const props = defineProps<{
    /** 列表数据（每一项交给 #item 插槽自己渲染） */
    items: readonly T[]
    loading: boolean
    error: string
    /** 空态文案（空态里的动作走 #empty 插槽） */
    emptyText: string
    /** 列表项的 key（默认按下标） */
    keyOf?: (item: T, index: number) => string | number

    /** 页头工具条：左「浏览方式」、右「排序」—— 标签/选项都由调用方给，组件不认识业务常量 */
    bar: ListBar
    /** 分页数据（怎么画由 mode 决定：进度条 → el-pagination / 滑动条 → PagerSliderView / 步骤条 → PagerStepsView） */
    pager: ListPager
}>()

const emit = defineEmits<{
    /** 错误态里的「重试」 */
    retry: []
    changeMode: [value: string]
    changeSort: [value: string]
    changePage: [page: number]
}>()

/** 默认按下标做 key（列表整体替换时够用；有稳定 id 的调用方传 keyOf） */
const keyOf = (item: T, index: number): string | number => props.keyOf?.(item, index) ?? index

/** 步骤条只有 1 步也显示（历史记录），分页条要在 2 页以上才出现 */
const pagerVisible = computed<boolean>(() => props.pager.pageCount > (props.pager.mode === PAGER_MODE.Steps ? 0 : 1))

/** 越界 / 原地不动就不发；页码从 1 起、步骤从 0 起 */
const goPage = (next: number): void => {
    const steps = props.pager.mode === PAGER_MODE.Steps
    const min = steps ? 0 : 1
    const max = steps ? props.pager.pageCount - 1 : props.pager.pageCount
    if (next < min || next > max || next === props.pager.page) return
    emit('changePage', next)
}

/** 滑动条：EP 在范围模式下回传数组，这里只认单值 */
const onSlide = (value: number | number[]): void => {
    goPage(Array.isArray(value) ? value[0] : value)
}
</script>

<template>
    <div class="list-section">
        <!-- 页头工具条：两个下拉的标签 / 当前值 / 选项都由 useListQuery 打包好（bar） -->
        <div class="list-bar">
            <FormField type="select" compact :label="bar.mode.label" :options="bar.mode.options"
                :model-value="bar.mode.value" @update:model-value="(v) => emit('changeMode', String(v))" />
            <FormField type="select" compact :label="bar.sort.label" :options="bar.sort.options"
                :model-value="bar.sort.value" @update:model-value="(v) => emit('changeSort', String(v))" />
        </div>

        <!-- 调用方额外的页头内容（如搜索命中的出题人） -->
        <slot name="top" />

        <!-- 三态：加载中 / 错误（可重试）/ 空（可带动作）—— 交给 EP 的骨架屏 / 结果页 / 空态 -->
        <el-skeleton v-if="loading" class="state" :rows="3" animated />
        <el-result v-else-if="error" icon="error" :sub-title="error">
            <template #extra>
                <el-button type="primary" plain @click="emit('retry')">重试</el-button>
            </template>
        </el-result>
        <el-empty v-else-if="!items.length" :description="emptyText">
            <slot name="empty" />
        </el-empty>

        <ul v-else class="list">
            <li v-for="(item, i) in items" :key="keyOf(item, i)">
                <!-- 条目交给调用方选渲染方式：私人列表 → MyPuzzleRow / 公开列表 → PuzzleCard -->
                <slot name="item" :item="item" />
            </li>
        </ul>

        <!-- 分页条：进度条交给 el-pagination；滑动条 / 步骤条仍是两个只画 UI 的小组件 -->
        <Flex v-if="pagerVisible" class="pager" :gap="10" justify="center">
            <el-slider v-if="pager.mode === PAGER_MODE.Slider" class="pager-slider" :model-value="pager.page"
                :min="1" :max="pager.pageCount" :step="1" :show-tooltip="false" @update:model-value="onSlide" />
            <PagerStepsView v-else-if="pager.mode === PAGER_MODE.Steps" :page="pager.page" :page-count="pager.pageCount"
                @change="goPage" />
            <el-pagination v-else class="pager-bar" layout="prev, pager, next" :total="pager.pageCount"
                :page-size="1" :current-page="pager.page" :pager-count="5" prev-text="上一页" next-text="下一页"
                @current-change="goPage" />
        </Flex>
    </div>
</template>

<style scoped>
/* 骨架屏与卡片同宽（上下留白沿用全局 .state）；结果页 / 空态由 EP 自带排版 */
.state {
    margin: 16px 0 0;
}

.pager {
    margin-top: 14px;
}

/* 滑动条：占满剩余宽度（el-slider 自带左右内边距，这里收窄） */
.pager-slider {
    flex: 1;
    margin: 0;
    padding: 0 8px;
}

/* el-pagination 自带外边距，这里收一收跟列表对齐 */
.pager-bar {
    margin: 0;
}

.pager-bar :deep(.btn-prev),
.pager-bar :deep(.btn-next),
.pager-bar :deep(.el-pager li) {
    font-size: 0.78rem;
}
</style>
