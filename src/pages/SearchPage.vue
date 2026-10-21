<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElInput } from 'element-plus'
import BoardView from '@/components/BoardView.vue'
import ListSection from '@/components/ListSection.vue'
import Overlay from '@/components/Overlay.vue'
import PuzzleCard from '@/components/PuzzleCard.vue'
import { LOADING_COPY, SEARCH_COPY } from '@/constants/copy'
import { PAGE } from '@/constants/pages'
import { UID_PATTERN } from '@/constants/user'
import { useListQuery } from '@/composables/useListQuery'
import { usePuzzleDetail } from '@/composables/puzzle/usePuzzleDetail'
import { usePuzzlePreview } from '@/composables/puzzle/usePuzzlePreview'
import { getOne } from '@/services/api/puzzleApi'
import { usePuzzleStore } from '@/stores/puzzle'
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
const { keyword, bar, pager, changePagerMode, onSearch, changeSort, changePage, retry } = list

/** 题目预览：只读遮罩（数据走详情接口） */
const openPreview = (pid: string): void => {
    void preview.showPreview(pid, false, SEARCH_COPY.preview)
}

/** 列表项「挑战」：取详情 → 开局（**耗时，全程全屏加载**，避免看起来像卡住） */
const challenging = ref(false)
const challenge = async (pid: string): Promise<void> => {
    if (challenging.value) return
    challenging.value = true
    try {
        await detail.load(pid)
        if (!detail.error.value) await detail.challenge()
    } finally {
        challenging.value = false
    }
}

const {
    previewOpen, previewTitle, previewInput, previewActions, previewLoading,
} = preview

/** 全屏加载：预览取数 与 挑战开局 共用（文案按动作区分） */
const opening = computed<boolean>(() => previewLoading.value || challenging.value)
const loadingText = computed<string>(() => (challenging.value ? LOADING_COPY.game : LOADING_COPY.puzzle))
</script>

<template>
    <div class="page-card wide" v-loading.fullscreen.lock="opening" :element-loading-text="loadingText">
        <!-- 最上面：搜索框（回车即搜） -->
        <form class="search-form" @submit.prevent="onSearch">
            <el-input v-model="keyword" class="search-input" :placeholder="SEARCH_COPY.placeholder" />
            <el-button type="primary" native-type="submit">{{ SEARCH_COPY.action }}</el-button>
        </form>

        <!-- 列表骨架（工具条 + 三态 + 列表 + 分页条）：条目渲染方式由本页选（公开列表 → PuzzleCard） -->
        <ListSection :items="items" :loading="loading" :error="error" :empty-text="SEARCH_COPY.empty"
            :key-of="(item) => item.pid" :bar="bar" :pager="pager" @retry="retry"
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
            <BoardView v-bind="previewInput" />
        </Overlay>

        <!-- 预览取数中：页面级加载（v-loading 挂在根节点） -->
    </div>
</template>

<style scoped>
/* .state / .retry / .list / .list-bar / .sort-box 都在全局；输入框与按钮由 Element Plus 提供 */

.search-form {
    display: flex;
    gap: 8px;
}

/* 布局微调：搜索框吃掉剩余宽度（按钮用 el-button，自带 36px 高） */
.search-input {
    flex: 1;
    min-width: 0;
}

.author {
    margin: 10px 0 0;
    font-size: 0.78rem;
    color: #4f46e5;
}
</style>
