import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { LIST_PAGE_SIZE } from '@/constants/puzzle'
import { pageCountOf } from '@/core/page'
import { search as apiSearch } from '@/services/api/puzzleApi'
import type { ListSort, SearchResult } from '@/types/puzzle'

export const usePuzzleStore = defineStore('puzzleStore', () => {
    /** 搜索结果（公开题） */
    const items = ref<SearchResult[]>([])
    /** 命中总数（算页数 / 收敛越界页码） */
    const total = ref(0)
    /** uid 档搜索回传的出题人显示名（表头用） */
    const authorUname = ref('')
    const loading = ref(false)
    const error = ref('')

    const pageCount = computed<number>(() => pageCountOf(total.value, LIST_PAGE_SIZE))
    /** 空结果：不在加载中、无错误、且没有数据 */
    const empty = computed<boolean>(() => !loading.value && !error.value && !items.value.length)

    /** 搜公开题：keyword 模糊（标题 / 出题人）、uid 精确（某人的公开题），二者互斥 */
    const search = async (q: { keyword?: string; uid?: string; sort: ListSort; page: number }): Promise<void> => {
        loading.value = true
        error.value = ''
        try {
            const res = await apiSearch({
                keyword: q.keyword, uid: q.uid, sort: q.sort, page: q.page, size: LIST_PAGE_SIZE,
            })
            items.value = res.items
            total.value = res.total
            authorUname.value = q.uid ? res.items[0]?.uname ?? '' : ''
        } catch (err) {
            items.value = []
            total.value = 0
            authorUname.value = ''
            error.value = err instanceof Error ? err.message : '加载失败，请重试'
        } finally {
            loading.value = false
        }
    }

    return { items, total, authorUname, loading, error, pageCount, empty, search }
})
