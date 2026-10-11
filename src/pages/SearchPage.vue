<script setup lang="ts">
import BoardOverlay from '@/components/BoardOverlay.vue'
import Overlay from '@/components/Overlay.vue'
import PagerBar from '@/components/PagerBar.vue'
import PuzzleCard from '@/components/PuzzleCard.vue'
import SpinnerIcon from '@/components/SpinnerIcon.vue'
import { SEARCH_COPY, SORT_OPTIONS } from '@/constants/puzzle'
import { useSearchPuzzle } from '@/composables/puzzle/useSearchPuzzle'
import type { ListSort } from '@/types/puzzle'

const {
    keyword, sort, page, pageCount, items, loading, error, empty, authorLabel,
    pagerMode, pagerModeLabel, togglePagerMode,
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
            <button class="mode-btn" type="button" @click="togglePagerMode">
                {{ SEARCH_COPY.browseLabel }}：{{ pagerModeLabel }}
            </button>
            <label class="sort-box">
                {{ SEARCH_COPY.sortLabel }}
                <select class="select" :value="sort"
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
        <BoardOverlay :show="previewOpen && !previewLoading" :input="previewInput"
            title="题目预览" close-text="返回" @close="closePreview" />

        <Overlay :show="previewLoading">
            <SpinnerIcon />
        </Overlay>
    </div>
</template>

<style scoped>
.search-form {
    display: flex;
    gap: 8px;
}

.input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    height: 36px;
    padding: 0 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #111827;
    outline: none;
    transition: 0.15s;
}

.input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px #eef2ff;
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

.list-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 12px;
}

.mode-btn {
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    color: #374151;
    font-size: 0.78rem;
    font-family: inherit;
    padding: 4px 10px;
    cursor: pointer;
    transition: 0.15s;
}

.mode-btn:hover {
    background: #eef2ff;
    border-color: #6366f1;
}

.sort-box {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    color: #6b7280;
}

.select {
    height: 28px;
    padding: 0 6px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    color: #374151;
    font-size: 0.78rem;
    cursor: pointer;
}

.author {
    margin: 10px 0 0;
    font-size: 0.78rem;
    color: #4f46e5;
}

.state {
    margin: 16px 0 0;
    font-size: 0.85rem;
    color: #6b7280;
    text-align: center;
}

.state.is-error {
    color: #b91c1c;
}

.retry {
    margin-left: 6px;
    border: 1px solid #fecaca;
    border-radius: 6px;
    background: #fee2e2;
    color: #b91c1c;
    font-size: 0.78rem;
    font-family: inherit;
    padding: 2px 8px;
    cursor: pointer;
}

.list {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>
