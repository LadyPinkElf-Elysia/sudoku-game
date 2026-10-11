import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TITLE_MAX } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { MINE_COPY } from '@/constants/puzzle'
import { useClipboard } from '@/composables/useClipboard'
import { useListQuery } from '@/composables/useListQuery'
import { parsePuzzle } from '@/core/sudoku/parse'
import { cellCountOf } from '@/core/sudoku/shape'
import { remove as removePuzzle, update as updatePuzzle } from '@/services/api/puzzleApi'
import { useGameStore } from '@/stores/game'
import { usePuzzleStore } from '@/stores/puzzle'
import { usePuzzlePreview } from './usePuzzlePreview'
import type { Actions, MyPuzzleRowControls, ValueIconsProps } from '@/types/item'
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
    /** 正在内联重命名的 rowId（'' = 无）；删除仍走二次确认弹层 */
    const renaming = ref('')
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

    /** pid 文本：默认遮蔽；明文时保留 `pid ` 前缀（与遮蔽态一致） */
    const pidTextOf = (item: MyPuzzle): string => {
        const detail = puzzleStore.details[item.rowId]
        return detail && isRevealed(item.rowId) ? `${MINE_COPY.pidTag} ${detail.pid}` : MINE_COPY.pidHidden
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

    /** 可见性下拉：值真的变了才 PATCH */
    const setVisibility = async (item: MyPuzzle, value: Visibility): Promise<void> => {
        if (value === item.visibility) return
        await patch(item.rowId, { visibility: value })
    }

    /** 参考答案下拉（开 / 关） */
    const setSolution = async (item: MyPuzzle, on: boolean): Promise<void> => {
        if (on === item.showSolution) return
        await patch(item.rowId, { showSolution: on })
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

    /** 内联重命名：点标题旁「重命名」→ 标题变输入框；回车 / 失焦提交，Esc 取消 */
    const startRename = (item: MyPuzzle): void => { renaming.value = item.rowId; renameText.value = item.title }
    const cancelRename = (): void => { renaming.value = '' }
    const commitRename = async (): Promise<void> => {
        const rowId = renaming.value
        const name = renameText.value.trim()
        renaming.value = ''
        if (!rowId || !name || name.length > TITLE_MAX) return
        await patch(rowId, { title: name })
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

    /** 每行一套行内控件（闭包随行；components 只负责画） */
    const controlsFor = (item: MyPuzzle): MyPuzzleRowControls => {
        const id = item.rowId
        return {
            renaming: renaming.value === id,
            renameText: renameText.value,
            onRenameStart: () => startRename(item),
            onRenameInput: (text) => { renameText.value = text },
            onRenameCommit: () => { void commitRename() },
            onRenameCancel: cancelRename,
            onVisibility: (value) => { void setVisibility(item, value) },
            onSolution: (on) => { void setSolution(item, on) },
            onPreview: (answer) => openPreview(id, answer),
            onChallenge: () => { void challenge(id) },
            onEdit: () => { void openEdit(id) },
            onRemove: () => { target.value = id; removeOpen.value = true },
        }
    }
    const removeActions = computed<Actions>(() => [
        { key: 'remove', icon: '🗑', message: MINE_COPY.remove, onClick: () => { void confirmRemove() } },
        { key: 'cancel', icon: '↩', message: MINE_COPY.cancel, onClick: () => { removeOpen.value = false } },
    ])

    return {
        ...list,
        items, loading, error, empty, pageCount, busy,
        pidTextOf, pidIconsOf, controlsFor, goCreate,
        ...preview,
        removeOpen, removeActions,
    }
}
