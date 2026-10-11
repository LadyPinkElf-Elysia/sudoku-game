import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PAGER_MODE, PREF_KEY_PAGER_MODE, SORT } from '@/constants/puzzle'
import { clampPage } from '@/core/page'
import { readPref, writePref } from '@/services/prefs'
import type { Page } from '@/types/page'
import type { ListSort, PagerMode } from '@/types/puzzle'

interface ListQueryOptions {
    /** 本页路由名（用于 router.replace 留在本页） */
    routeName: Page
    /**
     * 取数：关键词/排序/页码已就绪时调用，由各页决定用 store 还是 API
     * 返回 true = 数据已就绪（可继续做页码收敛）；false = 已跳走或无需收敛
     */
    load: (q: { keyword: string; sort: ListSort; page: number }) => Promise<boolean>
    /** 当前总页数（通常来自 store 的 computed） */
    pageCount: () => number
}

/**
 * 列表页公共查询状态：URL(?q&sort&page) ↔ 本地条件、越界收敛、浏览偏好
 * 搜索页与我的题目页共用；页面只管渲染，取数逻辑由 load 注入（R15）
 */
export const useListQuery = (opts: ListQueryOptions) => {
    const route = useRoute()
    const router = useRouter()

    /** 条件（由 URL 驱动） */
    const keyword = ref('')
    const sort = ref<ListSort>(SORT.Time)
    const page = ref(1)

    /** 分页形态：纯 UI 偏好，存本地（不进 URL）；由「浏览方式」下拉选择 */
    const pagerMode = ref<PagerMode>(
        readPref(PREF_KEY_PAGER_MODE) === PAGER_MODE.Slider ? PAGER_MODE.Slider : PAGER_MODE.Bar)

    const changePagerMode = (value: string): void => {
        pagerMode.value = value === PAGER_MODE.Slider ? PAGER_MODE.Slider : PAGER_MODE.Bar
        writePref(PREF_KEY_PAGER_MODE, pagerMode.value)
    }

    /** 只改 URL；真正的请求交给下面的 watch 统一发出（深链接、浏览器后退同一条路） */
    const applyQuery = (nextPage: number, nextSort?: ListSort): void => {
        const query: Record<string, string | number> = { sort: nextSort ?? sort.value, page: nextPage }
        if (keyword.value) query.q = keyword.value
        void router.replace({ name: opts.routeName, query })
    }

    const onSearch = (): void => applyQuery(1)
    const changeSort = (value: string): void => applyQuery(1, value === SORT.Hot ? SORT.Hot : SORT.Time)
    const changePage = (next: number): void => applyQuery(next)

    /** 取数 + 越界收敛（页数由各页给出；跳走时不做收敛） */
    const loadAndClamp = async (): Promise<void> => {
        const ready = await opts.load({ keyword: keyword.value, sort: sort.value, page: page.value })
        if (!ready) return
        const bounded = clampPage(page.value, opts.pageCount())
        if (bounded !== page.value) applyQuery(bounded)
    }

    /** URL 是唯一真源：变化（含首次进入）就重新取数 */
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

    const retry = (): void => { void loadAndClamp() }

    return {
        keyword, sort, page,
        pagerMode, changePagerMode,
        onSearch, changeSort, changePage, retry,
    }
}
