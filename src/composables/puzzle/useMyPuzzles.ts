import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TITLE_MAX, VISIBILITY } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { MINE_COPY, PUZZLE_VISIBILITY_COPY } from '@/constants/puzzle'
import { useClipboard } from '@/composables/useClipboard'
import { useListQuery } from '@/composables/useListQuery'
import { parsePuzzle } from '@/core/sudoku/parse'
import { cellCountOf } from '@/core/sudoku/shape'
import { remove as removePuzzle, update as updatePuzzle } from '@/services/api/puzzleApi'
import { useGameStore } from '@/stores/game'
import { usePuzzleStore } from '@/stores/puzzle'
import { usePuzzlePreview } from './usePuzzlePreview'
import type { Action, Actions, ValueIconsProps } from '@/types/item'
import type { MyPuzzle, MyPuzzleDetail, Visibility } from '@/types/puzzle'

/** 我的题目页（FR-7 / FR-13）：列表分页→useListQuery，预览→usePuzzlePreview；
 *  pid/题面串按 rowId 现取，改动后清缓存 + 重拉当前页 */
export const useMyPuzzles = () => {
    const router = useRouter()
    const puzzleStore = usePuzzleStore()
    const gameStore = useGameStore()
    const { copied, copy } = useClipboard()
    const preview = usePuzzlePreview((rowId) => puzzleStore.detailOf(rowId))

    const items = computed<MyPuzzle[]>(() => puzzleStore.mine)
    const loading = computed<boolean>(() => puzzleStore.loading)
    const error = computed<string>(() => puzzleStore.error)
    const pageCount = computed<number>(() => puzzleStore.pageCount)
    const empty = computed<boolean>(() => !loading.value && !error.value && !items.value.length)

    /** PATCH / DELETE 进行中 → 转圈遮罩 */
    const busy = ref(false)
    /** 已明文显示过 pid 的行（默认遮蔽） */
    const revealed = ref<string[]>([])
    /** 重命名 / 删除确认弹层 */
    const renameOpen = ref(false)
    const renameText = ref('')
    const removeOpen = ref(false)
    /** 当前操作的目标行 */
    const target = ref('')

    const list = useListQuery({
        routeName: PAGE.MyPuzzles,
        load: async (q) => { await puzzleStore.loadMine({ sort: q.sort, page: q.page }); return true },
        pageCount: () => puzzleStore.pageCount,
    })

    const detailOf = (rowId: string): Promise<MyPuzzleDetail | null> => puzzleStore.detailOf(rowId)

    /** 改动后：清该行缓存 + 重拉当前页 */
    const afterChange = (rowId: string): void => { puzzleStore.dropDetail(rowId); list.retry() }

    const goCreate = (): void => { void router.push({ name: PAGE.Create }) }

    /** pid 文本：默认遮蔽，点过眼睛才明文 */
    const pidTextOf = (item: MyPuzzle): string => {
        const detail = puzzleStore.details[item.rowId]
        return detail && isRevealed(item.rowId) ? detail.pid : MINE_COPY.pidHidden
    }

    /** 本行 pid 是否已明文（`ValueIcons` 的 👁 睁/闭据此切换） */
    const isRevealed = (rowId: string): boolean => revealed.value.includes(rowId)

    /** 显示 / 隐藏 pid 两态切换（导入时顺带缓存详情） */
    const togglePid = async (rowId: string): Promise<void> => {
        if (isRevealed(rowId)) { revealed.value = revealed.value.filter((id) => id !== rowId); return }
        const detail = await detailOf(rowId)
        if (detail) revealed.value = [...revealed.value, rowId]
    }

    /** 复制 pid：不进界面，直接进剪贴板 */
    const copyPid = async (rowId: string): Promise<void> => {
        const detail = await detailOf(rowId)
        if (detail) await copy(detail.pid)
    }

    /** 统一 PATCH：先取 pid，再改，最后清缓存 + 重拉 */
    const patch = async (
        rowId: string,
        body: { title?: string; visibility?: Visibility; showSolution?: boolean },
    ): Promise<void> => {
        const detail = await detailOf(rowId)
        if (!detail) return
        busy.value = true
        try {
            await updatePuzzle(detail.pid, body)
            afterChange(rowId)
        } catch (err) {
            puzzleStore.error = err instanceof Error ? err.message : '保存失败，请重试'
        } finally {
            busy.value = false
        }
    }

    /** 三态循环：公开 → 受保护 → 私有 → 公开 */
    const cycleVisibility = async (item: MyPuzzle): Promise<void> => {
        const next: Visibility = item.visibility === VISIBILITY.Public ? VISIBILITY.Protected
            : item.visibility === VISIBILITY.Protected ? VISIBILITY.Private
                : VISIBILITY.Public
        await patch(item.rowId, { visibility: next })
    }

    const toggleSolution = async (item: MyPuzzle): Promise<void> => {
        await patch(item.rowId, { showSolution: !item.showSolution })
    }

    /** 题目 / 答案预览（只读遮罩；不写任何游戏状态） */
    const openPreview = (rowId: string, answer: boolean): void => {
        void preview.showPreview(rowId, answer, answer ? MINE_COPY.answerPreview : MINE_COPY.preview)
    }

    /** 挑战自己的题：以自有题面开局（作者不计热度，所以不调 play） */
    const challenge = async (rowId: string): Promise<void> => {
        const detail = await detailOf(rowId)
        if (!detail) return
        const parsed = parsePuzzle(detail.puzzleText)
        if (!parsed) return

        gameStore.startGame(parsed.board, parsePuzzle(detail.solutionText)?.board ?? [], {
            boxSize: parsed.boxSize,
            blankRatio: detail.blankCount / cellCountOf(parsed.boxSize),
        }, { pid: detail.pid, title: detail.title, uname: detail.uname })
        await router.push({ name: PAGE.Game })
    }

    /** 编辑：拿到 pid 后进编辑页（路径参数） */
    const openEdit = async (rowId: string): Promise<void> => {
        const detail = await detailOf(rowId)
        if (detail) await router.push({ name: PAGE.EditPuzzle, params: { pid: detail.pid } })
    }

    const saveRename = async (): Promise<void> => {
        const name = renameText.value.trim()
        if (!name || name.length > TITLE_MAX) return
        await patch(target.value, { title: name })
        renameOpen.value = false
    }

    const confirmRemove = async (): Promise<void> => {
        const detail = await detailOf(target.value)
        if (!detail) return
        busy.value = true
        try {
            await removePuzzle(detail.pid)
            removeOpen.value = false
            afterChange(target.value)
        } finally {
            busy.value = false
        }
    }

    /** 该行 pid 右侧的裸图标组参数（👁 睁/闭 + 📋 复制） */
    const pidIconsOf = (item: MyPuzzle): ValueIconsProps => ({
        revealed: isRevealed(item.rowId),
        eyeLabel: isRevealed(item.rowId) ? MINE_COPY.hidePid : MINE_COPY.showPid,
        copyIcon: copied.value ? '✅' : '📋',
        copyLabel: copied.value ? MINE_COPY.copied : MINE_COPY.copyPid,
        onToggle: () => { void togglePid(item.rowId) },
        onCopy: () => { void copyPid(item.rowId) },
    })

    /** 每行一条按钮条（闭包随行；components 只负责画） */
    const actionsFor = (item: MyPuzzle): Actions => {
        const id = item.rowId
        const actions: Action[] = [
            { key: 'vis', icon: '🔄', message: PUZZLE_VISIBILITY_COPY[item.visibility], onClick: () => { void cycleVisibility(item) } },
            { key: 'sol', icon: '🗝', message: item.showSolution ? MINE_COPY.solutionOn : MINE_COPY.solutionOff, onClick: () => { void toggleSolution(item) } },
            { key: 'preview', icon: '🔍', message: MINE_COPY.preview, onClick: () => openPreview(id, false) },
            { key: 'answer', icon: '📖', message: MINE_COPY.answerPreview, onClick: () => openPreview(id, true) },
            { key: 'challenge', icon: '▶', message: MINE_COPY.challenge, onClick: () => { void challenge(id) } },
            { key: 'edit', icon: '✏️', message: MINE_COPY.edit, onClick: () => { void openEdit(id) } },
            { key: 'rename', icon: '🏷', message: MINE_COPY.rename, onClick: () => { target.value = id; renameText.value = item.title; renameOpen.value = true } },
            { key: 'remove', icon: '🗑', message: MINE_COPY.remove, onClick: () => { target.value = id; removeOpen.value = true } },
        ]
        return actions
    }

    const renameActions = computed<Actions>(() => [
        { key: 'save', icon: '✅', message: MINE_COPY.save, onClick: () => { void saveRename() } },
        { key: 'cancel', icon: '↩', message: MINE_COPY.cancel, onClick: () => { renameOpen.value = false } },
    ])
    const removeActions = computed<Actions>(() => [
        { key: 'remove', icon: '🗑', message: MINE_COPY.remove, onClick: () => { void confirmRemove() } },
        { key: 'cancel', icon: '↩', message: MINE_COPY.cancel, onClick: () => { removeOpen.value = false } },
    ])

    return {
        ...list,
        items, loading, error, empty, pageCount, busy,
        pidTextOf, pidIconsOf, actionsFor, goCreate,
        ...preview,
        renameOpen, renameText, renameActions,
        removeOpen, removeActions,
    }
}
