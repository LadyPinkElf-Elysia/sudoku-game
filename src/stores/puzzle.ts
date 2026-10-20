import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { LIST_PAGE_SIZE } from '@/constants/puzzle'
import { errorTextOf } from '@/core/message'
import { getMine, listMine, search as apiSearch } from '@/services/api/puzzleApi'
import type { ListSort, MyPuzzle, MyPuzzleDetail, SearchResult } from '@/types/puzzle'

export const usePuzzleStore = defineStore('puzzleStore', () => {
    /** 搜索结果（公开题） */
    const items = ref<SearchResult[]>([])
    /** 我的题目列表（只含元信息，不含 pid / 题面串） */
    const mine = ref<MyPuzzle[]>([])
    /** mine/:rowId 详情缓存：显示/复制 pid、预览、答案预览、编辑、挑战统一走它 */
    const details = ref<Record<string, MyPuzzleDetail>>({})
    /** 命中总数（算页数 / 收敛越界页码） */
    const total = ref(0)
    /** uid 档搜索回传的出题人显示名（表头用） */
    const authorUname = ref('')
    const loading = ref(false)
    const error = ref('')

    /** 跨页一次性轻提示（如「已保存到我的题目」）：写入方给文案，读取方取走即清 */
    const savedTip = ref('')

    /**
     * 总条数 → 总页数（无数据也算 1 页，避免页码出现 0）
     * 数据层禁 `Math.`（R4）→ 用整数写法等价 `Math.ceil(total / size)`：`(total + size - 1) / size` 再 `| 0` 取整
     */
    const pageCount = computed<number>(() =>
        total.value <= 0 ? 1 : ((total.value + LIST_PAGE_SIZE - 1) / LIST_PAGE_SIZE) | 0)
    /** 搜索空结果：不在加载中、无错误、且没有数据 */
    const empty = computed<boolean>(() => !loading.value && !error.value && !items.value.length)

    /**
     * 列表取数统一收口：转圈 → 成功由 run 写回 → 失败由 empty 清空 + 统一文案
     * （搜索与我的题目只有「打哪个接口 / 写哪些 ref」不同）
     */
    const loadPage = async (run: () => Promise<void>, empty: () => void): Promise<void> => {
        loading.value = true
        error.value = ''
        try {
            await run()
        } catch (err) {
            empty()
            error.value = errorTextOf(err, '加载失败，请重试')
        } finally {
            loading.value = false
        }
    }

    /** 搜公开题：keyword 模糊（标题 / 出题人）、uid 精确（某人的公开题），二者互斥 */
    const search = (q: { keyword?: string; uid?: string; sort: ListSort; page: number }): Promise<void> =>
        loadPage(async () => {
            const res = await apiSearch({
                keyword: q.keyword, uid: q.uid, sort: q.sort, page: q.page, size: LIST_PAGE_SIZE,
            })
            items.value = res.items
            total.value = res.total
            authorUname.value = q.uid ? res.items[0]?.uname ?? '' : ''
        }, () => {
            items.value = []
            total.value = 0
            authorUname.value = ''
        })

    /** 我的题目列表（需登录；只回元信息） */
    const loadMine = (q: { sort: ListSort; page: number }): Promise<void> =>
        loadPage(async () => {
            const res = await listMine({ sort: q.sort, page: q.page, size: LIST_PAGE_SIZE })
            mine.value = res.items
            total.value = res.total
        }, () => {
            mine.value = []
            total.value = 0
        })

    /** 取 mine/:rowId 详情：命中缓存直接返回，否则请求后写入缓存 */
    const detailOf = async (rowId: string): Promise<MyPuzzleDetail | null> => {
        const cached = details.value[rowId]
        if (cached) return cached
        error.value = ''
        try {
            const detail = await getMine(rowId)
            details.value[rowId] = detail
            return detail
        } catch (err) {
            error.value = errorTextOf(err, '题目加载失败')
            return null
        }
    }

    /** 改动后清该行缓存（列表由页面重拉） */
    const dropDetail = (rowId: string): void => { delete details.value[rowId] }

    const flashSaved = (text: string): void => { savedTip.value = text }
    /** 取走提示（取完即清，保证只提示一次） */
    const takeSavedTip = (): string => {
        const text = savedTip.value
        savedTip.value = ''
        return text
    }

    return {
        items, mine, details, total, authorUname, loading, error, pageCount, empty,
        search, loadMine, detailOf, dropDetail,
        savedTip, flashSaved, takeSavedTip,
    }
})
