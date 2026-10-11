<script setup lang="ts">
import { computed } from 'vue'
import BoardView from '@/components/BoardView.vue'
import ListSection from '@/components/ListSection.vue'
import Overlay from '@/components/Overlay.vue'
import PuzzleCard from '@/components/PuzzleCard.vue'
import { PAGER_MODE_OPTIONS, SEARCH_COPY, SORT_OPTIONS } from '@/constants/puzzle'
import { useSearchPuzzle } from '@/composables/puzzle/useSearchPuzzle'
import type { ListBar, ListPager } from '@/types/item'
import type { ListSort } from '@/types/puzzle'

const {
    keyword, sort, page, pageCount, items, loading, error, authorLabel,
    pagerMode, changePagerMode,
    onSearch, changeSort, changePage, retry,
    previewOpen, previewTitle, previewInput, previewActions, previewZoomActions, previewLoading, openPreview, challenge,
} = useSearchPuzzle()

/** 列表工具条 + 分页：组件只认数据，标签/选项由本页给 */
const listBar = computed<ListBar>(() => ({
    modeLabel: SEARCH_COPY.browseLabel, modeOptions: PAGER_MODE_OPTIONS, mode: pagerMode.value,
    sortLabel: SEARCH_COPY.sortLabel, sortOptions: SORT_OPTIONS, sort: sort.value,
}))
const listPager = computed<ListPager>(() => ({ page: page.value, pageCount: pageCount.value, mode: pagerMode.value }))
</script>

<template>
    <div class="page-card wide">
        <!-- 最上面：搜索框（回车即搜） -->
        <form class="search-form" @submit.prevent="onSearch">
            <input class="input" v-model="keyword" :placeholder="SEARCH_COPY.placeholder" spellcheck="false">
            <button class="btn-primary" type="submit">{{ SEARCH_COPY.action }}</button>
        </form>

        <!-- 列表骨架（工具条 + 三态 + 列表 + 分页条）：条目渲染方式由本页选（公开列表 → PuzzleCard） -->
        <ListSection :items="items" :loading="loading" :error="error" :empty-text="SEARCH_COPY.empty"
            :key-of="(item) => item.pid" :bar="listBar" :pager="listPager" @retry="retry"
            @change-mode="changePagerMode" @change-sort="(v) => changeSort(v as ListSort)" @change-page="changePage">
            <!-- 20 位命中 uid：出题人表头 -->
            <template #top>
                <p v-if="authorLabel" class="author">{{ authorLabel }}</p>
            </template>

            <template #item="{ item }">
                <PuzzleCard :item="item" @preview="openPreview" @challenge="challenge" />
            </template>
        </ListSection>

        <!-- 题目预览：同一个遮罩（只读棋盘 + 贴棋盘的缩放圆圈；按钮条由 Overlay 渲染） -->
        <Overlay :show="previewOpen && !previewLoading" :text="previewTitle" :actions="previewActions">
            <BoardView v-bind="previewInput" :zoom-actions="previewZoomActions" />
        </Overlay>

        <Overlay :show="previewLoading" spinning />
    </div>
</template>

<style scoped>
/* .input / .select(.is-sm) / .state / .retry / .list / .list-bar / .sort-box 都在全局 */

.search-form {
    display: flex;
    gap: 8px;
}

/* 布局微调：搜索框吃掉剩余宽度（覆盖全局 .input 的 width:100%） */
.search-form .input {
    flex: 1;
    min-width: 0;
    width: auto;
}

.search-btn {
    height: 36px;
    padding: 0 16px;
    border: none;
    border-radius: 8px;
    background: #6366f1;
    color: #fff;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: 0.15s;
}

.search-btn:hover {
    background: #4f46e5;
}

.author {
    margin: 10px 0 0;
    font-size: 0.78rem;
    color: #4f46e5;
}
</style>
