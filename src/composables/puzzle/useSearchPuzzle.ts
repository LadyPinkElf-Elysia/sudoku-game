import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { SEARCH_COPY } from '@/constants/puzzle'
import { UID_PATTERN } from '@/constants/user'
import { useListQuery } from '@/composables/useListQuery'
import { getOne } from '@/services/api/puzzleApi'
import { usePuzzleStore } from '@/stores/puzzle'
import { usePuzzleDetail } from './usePuzzleDetail'
import { usePuzzlePreview } from './usePuzzlePreview'
import type { ListSort, SearchResult } from '@/types/puzzle'

/**
 * 搜索页流程：条件/分页/浏览偏好交给 useListQuery，
 * 预览交给 usePuzzlePreview，本文件只负责「搜索框分流 + 挑战」
 */
export const useSearchPuzzle = () => {
    const router = useRouter()
    const puzzleStore = usePuzzleStore()
    const detail = usePuzzleDetail()
    /** 预览：搜索列表只给 pid，现取详情即可（无缓存需求） */
    const preview = usePuzzlePreview((pid) => getOne(pid).catch(() => null))

    /** 20 位命中 uid 时的表头（「出题人：X 的公开题」） */
    const authorLabel = ref('')

    /** store 取值包一层 computed，页面解构后仍是响应式 */
    const items = computed<SearchResult[]>(() => puzzleStore.items)
    const total = computed<number>(() => puzzleStore.total)
    const pageCount = computed<number>(() => puzzleStore.pageCount)
    const loading = computed<boolean>(() => puzzleStore.loading)
    const error = computed<string>(() => puzzleStore.error)
    const empty = computed<boolean>(() => puzzleStore.empty)

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

    /** 题目预览：只读遮罩（数据走详情接口） */
    const openPreview = (pid: string): void => {
        void preview.showPreview(pid, false, SEARCH_COPY.preview)
    }

    /** 列表项「挑战」：拉到详情后直接开局，不走遮罩 */
    const challenge = async (pid: string): Promise<void> => {
        await detail.load(pid)
        if (!detail.error.value) await detail.challenge()
    }

    return {
        // 条件 / 分页 / 浏览偏好（useListQuery）
        ...list,
        // 列表三态
        items, total, pageCount, loading, error, empty, authorLabel,
        // 预览遮罩（usePuzzlePreview）+ 挑战
        ...preview,
        openPreview,
        challenge,
    }
}
