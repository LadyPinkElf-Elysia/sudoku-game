import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { PAGER_MODE, PAGER_MODE_COPY, PREF_KEY_PAGER_MODE, SEARCH_COPY, SORT } from '@/constants/puzzle'
import { UID_PATTERN } from '@/constants/user'
import { clampPage } from '@/core/page'
import { getOne } from '@/services/api/puzzleApi'
import { readPref, writePref } from '@/services/prefs'
import { usePuzzleStore } from '@/stores/puzzle'
import { usePuzzleDetail } from './usePuzzleDetail'
import type { PagerMode, SearchResult } from '@/types/puzzle'
import type { ListSort } from '@/types/puzzle'

/**
 * 搜索页流程：URL(query) ↔ 条件、搜索框分流、预览遮罩、挑战；每页一份
 * R15：影响数据请求的 q/sort/page 进 URL；纯 UI 偏好 pagerMode 进本地偏好
 */
export const useSearchPuzzle = () => {
    const route = useRoute()
    const router = useRouter()
    const puzzleStore = usePuzzleStore()
    const detail = usePuzzleDetail()

    /** 当前条件（由 URL 驱动） */
    const keyword = ref('')
    const sort = ref<ListSort>(SORT.Time)
    const page = ref(1)

    /** 20 位命中 uid 时的表头 */
    const authorLabel = ref('')

    /** 分页形态：本地偏好 */
    const pagerMode = ref<PagerMode>(
        readPref(PREF_KEY_PAGER_MODE) === PAGER_MODE.Slider ? PAGER_MODE.Slider : PAGER_MODE.Bar)
    const pagerModeLabel = computed<string>(() => PAGER_MODE_COPY[pagerMode.value])

    const previewOpen = ref(false)

    /** store 取值包一层 computed，页面解构后仍是响应式 */
    const items = computed<SearchResult[]>(() => puzzleStore.items)
    const total = computed<number>(() => puzzleStore.total)
    const pageCount = computed<number>(() => puzzleStore.pageCount)
    const loading = computed<boolean>(() => puzzleStore.loading)
    const error = computed<string>(() => puzzleStore.error)
    const empty = computed<boolean>(() => puzzleStore.empty)

    /** 搜索框分流：20 位 → 先当 pid，再当 uid；其它 → 标题 / 出题人模糊 */
    const load = async (): Promise<void> => {
        const q = keyword.value.trim()
        authorLabel.value = ''

        if (UID_PATTERN.test(q)) {
            const hit = await getOne(q).catch(() => null)
            if (hit) {
                await router.push({ name: PAGE.PuzzleView, params: { pid: q } })
                return
            }
            await puzzleStore.search({ uid: q, sort: sort.value, page: page.value })
            if (puzzleStore.authorUname)
                authorLabel.value = `${SEARCH_COPY.authorPrefix}${puzzleStore.authorUname} ${SEARCH_COPY.authorSuffix}`
            return
        }

        await puzzleStore.search({ keyword: q, sort: sort.value, page: page.value })
    }

    /** 只改 URL；真正的请求由下面的 watch 统一发出（深链接、后退同样走这条路） */
    const applyQuery = (nextPage: number, nextSort?: ListSort): void => {
        void router.replace({
            name: PAGE.Search,
            query: { q: keyword.value, sort: nextSort ?? sort.value, page: nextPage },
        })
    }

    const onSearch = (): void => applyQuery(1)
    const changeSort = (value: string): void => applyQuery(1, value === SORT.Hot ? SORT.Hot : SORT.Time)
    const changePage = (next: number): void => applyQuery(next)
    const retry = (): void => { void load() }

    const togglePagerMode = (): void => {
        pagerMode.value = pagerMode.value === PAGER_MODE.Bar ? PAGER_MODE.Slider : PAGER_MODE.Bar
        writePref(PREF_KEY_PAGER_MODE, pagerMode.value)
    }

    /** 题目预览：只读遮罩（数据走详情接口） */
    const openPreview = async (pid: string): Promise<void> => {
        previewOpen.value = true
        await detail.load(pid)
    }
    const closePreview = (): void => { previewOpen.value = false }

    /** 列表项「挑战」：拉到详情后直接开局，不走遮罩 */
    const challenge = async (pid: string): Promise<void> => {
        await detail.load(pid)
        if (!detail.error.value) await detail.challenge()
    }

    /** 请求 + 越界收敛（页数来自接口 total） */
    const loadAndClamp = async (): Promise<void> => {
        await load()
        if (UID_PATTERN.test(keyword.value.trim())) return
        const bounded = clampPage(page.value, pageCount.value)
        if (bounded !== page.value) applyQuery(bounded)
    }

    /** 查询串是唯一真源：变化（含首次进入）就重新取数 */
    watch(
        () => [route.query.q, route.query.sort, route.query.page],
        () => {
            keyword.value = String(route.query.q ?? '')
            sort.value = String(route.query.sort ?? '') === SORT.Hot ? SORT.Hot : SORT.Time
            page.value = Number(route.query.page ?? 1) || 1
            void loadAndClamp()
        },
        { immediate: true },
    )

    return {
        keyword, sort, page, items, total, pageCount, loading, error, empty, authorLabel,
        pagerMode, pagerModeLabel, togglePagerMode,
        onSearch, changeSort, changePage, retry,
        previewOpen, previewInput: detail.boardInput, previewLoading: detail.loading,
        openPreview, closePreview, challenge,
    }
}
