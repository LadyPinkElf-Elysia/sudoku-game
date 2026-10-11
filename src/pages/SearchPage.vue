<script setup lang="ts">
import BoardOverlay from '@/components/BoardOverlay.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import PagerBar from '@/components/PagerBar.vue'
import PuzzleCard from '@/components/PuzzleCard.vue'
import { PAGER_MODE_OPTIONS, SEARCH_COPY, SORT_OPTIONS } from '@/constants/puzzle'
import { useSearchPuzzle } from '@/composables/puzzle/useSearchPuzzle'
import type { ListSort } from '@/types/puzzle'

const {
    keyword, sort, page, pageCount, items, loading, error, empty, authorLabel,
    pagerMode, changePagerMode,
    onSearch, changeSort, changePage, retry,
    previewOpen, previewInput, previewLoading, openPreview, closePreview, challenge,
} = useSearchPuzzle()
</script>

<template>
    <div class="page-card wide">
        <!-- 最上面：搜索框（回车即搜） -->
        <form class="search-form" @submit.prevent="onSearch">
            <input class="input" v-model="keyword" :placeholder="SEARCH_COPY.placeholder" spellcheck="false">
            <button class="search-btn" type="submit">{{ SEARCH_COPY.action }}</button>
        </form>

        <!-- 主内容：左上「浏览方式」 / 右上「排序」 -->
        <div class="list-bar">
            <label class="sort-box">
                {{ SEARCH_COPY.browseLabel }}
                <select class="select is-sm" :value="pagerMode"
                    @change="changePagerMode(($event.target as HTMLSelectElement).value)">
                    <option v-for="opt in PAGER_MODE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
            </label>
            <label class="sort-box">
                {{ SEARCH_COPY.sortLabel }}
                <select class="select is-sm" :value="sort"
                    @change="changeSort(($event.target as HTMLSelectElement).value as ListSort)">
                    <option v-for="opt in SORT_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
            </label>
        </div>

        <!-- 20 位命中 uid：出题人表头 -->
        <p v-if="authorLabel" class="author">{{ authorLabel }}</p>

        <!-- 三态：加载中 / 错误（可重试）/ 空结果 -->
        <p v-if="loading" class="state">{{ SEARCH_COPY.loading }}</p>
        <p v-else-if="error" class="state is-error">
            {{ error }}
            <button class="retry" type="button" @click="retry">{{ SEARCH_COPY.retry }}</button>
        </p>
        <p v-else-if="empty" class="state">{{ SEARCH_COPY.empty }}</p>

        <ul v-else class="list">
            <li v-for="item in items" :key="item.pid">
                <PuzzleCard :item="item" @preview="openPreview" @challenge="challenge" />
            </li>
        </ul>

        <PagerBar :page="page" :page-count="pageCount" :mode="pagerMode" @change="changePage" />

        <!-- 题目预览：只读棋盘遮罩（组件自持缩放，不写任何状态） -->
        <BoardOverlay :show="previewOpen && !previewLoading" :input="previewInput" title="题目预览" close-text="返回"
            @close="closePreview" />

        <LoadingOverlay :show="previewLoading" />
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
