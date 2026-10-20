<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BoardView from '@/components/BoardView.vue'
import ListSection from '@/components/ListSection.vue'
import Overlay from '@/components/Overlay.vue'
import PuzzleCard from '@/components/PuzzleCard.vue'
import { SEARCH_COPY } from '@/constants/copy'
import { PAGE } from '@/constants/pages'
import { PAGER_MODE_OPTIONS, SORT_OPTIONS } from '@/constants/puzzle'
import { UID_PATTERN } from '@/constants/user'
import { useListQuery } from '@/composables/useListQuery'
import { usePuzzleDetail } from '@/composables/puzzle/usePuzzleDetail'
import { usePuzzlePreview } from '@/composables/puzzle/usePuzzlePreview'
import { getOne } from '@/services/api/puzzleApi'
import { usePuzzleStore } from '@/stores/puzzle'
import type { ListBar, ListPager } from '@/types/item'
import type { ListSort, SearchResult } from '@/types/puzzle'

/**
 * 搜索页流程（**只有这一页用 → 就地写**）：
 * 条件/分页/浏览偏好交给 useListQuery，预览交给 usePuzzlePreview，
 * 这里只负责「搜索框分流（pid/uid/关键词）+ 挑战」
 */
const router = useRouter()
const puzzleStore = usePuzzleStore()
const detail = usePuzzleDetail()
/** 预览：搜索列表只给 pid，现取详情即可（无缓存需求） */
const preview = usePuzzlePreview((pid) => getOne(pid).catch(() => null))

/** 20 位命中 uid 时的表头（「出题人：X 的公开题」） */
const authorLabel = ref('')

/** store 取值包一层 computed，页面解构后仍是响应式 */
const items = computed<SearchResult[]>(() => puzzleStore.items)
const pageCount = computed<number>(() => puzzleStore.pageCount)
const loading = computed<boolean>(() => puzzleStore.loading)
const error = computed<string>(() => puzzleStore.error)

/** 取数：20 位 → 先当 pid，再当 uid；其它 → 标题/uname 模糊 */
const load = async (q: { keyword: string; sort: ListSort; page: number }): Promise<boolean> => {
    const text = q.keyword.trim()
    authorLabel.value = ''

    if (UID_PATTERN.test(text)) {
        const hit = await getOne(text).catch(() => null)
        if (hit) {
            await router.push({ name: PAGE.PuzzleView, params: { pid: text } })
            return false                      // 已跳落地页 → 不做页码收敛
        }
        await puzzleStore.search({ uid: text, sort: q.sort, page: q.page })
        if (puzzleStore.authorUname)
            authorLabel.value = `${SEARCH_COPY.authorPrefix}${puzzleStore.authorUname} ${SEARCH_COPY.authorSuffix}`
        return true
    }

    await puzzleStore.search({ keyword: text, sort: q.sort, page: q.page })
    return true
}

const list = useListQuery({ routeName: PAGE.Search, load, pageCount: () => puzzleStore.pageCount })
const { keyword, sort, page, pagerMode, changePagerMode, onSearch, changeSort, changePage, retry } = list

/** 题目预览：只读遮罩（数据走详情接口） */
const openPreview = (pid: string): void => {
    void preview.showPreview(pid, false, SEARCH_COPY.preview)
}

/** 列表项「挑战」：拉到详情后直接开局，不走遮罩 */
const challenge = async (pid: string): Promise<void> => {
    await detail.load(pid)
    if (!detail.error.value) await detail.challenge()
}

const {
    previewOpen, previewTitle, previewInput, previewActions, previewZoomActions, previewLoading,
} = preview

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
