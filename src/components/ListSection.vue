<script setup lang="ts" generic="T">
import FormField from './FormField.vue';
import PagerBar from './PagerBar.vue';
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
    /** 分页数据（怎么画由 PagerBar 按渲染表决定） */
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
</script>

<template>
    <div class="list-section">
        <!-- 页头工具条：两个下拉都用通用 FormField(type='select') -->
        <div class="list-bar">
            <FormField type="select" compact :label="bar.modeLabel" :options="bar.modeOptions"
                :model-value="bar.mode" @update:model-value="(v) => emit('changeMode', String(v))" />
            <FormField type="select" compact :label="bar.sortLabel" :options="bar.sortOptions"
                :model-value="bar.sort" @update:model-value="(v) => emit('changeSort', String(v))" />
        </div>

        <!-- 调用方额外的页头内容（如搜索命中的出题人） -->
        <slot name="top" />

        <!-- 三态：加载中 / 错误（可重试）/ 空（可带动作） -->
        <p v-if="loading" class="state">加载中…</p>
        <p v-else-if="error" class="state is-error">
            {{ error }}
            <button class="retry" type="button" @click="emit('retry')">重试</button>
        </p>
        <p v-else-if="!items.length" class="state">
            {{ emptyText }}
            <slot name="empty" />
        </p>

        <ul v-else class="list">
            <li v-for="(item, i) in items" :key="keyOf(item, i)">
                <!-- 条目交给调用方选渲染方式：私人列表 → MyPuzzleRow / 公开列表 → PuzzleCard -->
                <slot name="item" :item="item" />
            </li>
        </ul>

        <PagerBar :page="pager.page" :page-count="pager.pageCount" :mode="pager.mode"
            @change="emit('changePage', $event)" />
    </div>
</template>
