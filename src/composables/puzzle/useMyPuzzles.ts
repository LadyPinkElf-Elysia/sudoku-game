import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ACTION, actionOf } from '@/constants/actions'
import { TITLE_MAX } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { MINE_COPY } from '@/constants/puzzle'
import { useListQuery } from '@/composables/useListQuery'
import { errorTextOf } from '@/core/message'
import { remove as removePuzzle, update as updatePuzzle } from '@/services/api/puzzleApi'
import { usePuzzleStore } from '@/stores/puzzle'
import { useStartFromTexts } from '@/composables/game/useStartFromTexts'
import { usePuzzlePreview } from './usePuzzlePreview'
import type { Actions, MyPuzzleRowControls } from '@/types/item'
import type { MyPuzzle, MyPuzzleDetail, PuzzlePatch, Visibility } from '@/types/puzzle'

/** 我的题目页（FR-7 / FR-13）：列表分页→useListQuery，预览→usePuzzlePreview；
 *  pid/题面串按 rowId 现取，改动后清缓存 + 重拉当前页 */
export const useMyPuzzles = () => {
    const router = useRouter()
    const puzzleStore = usePuzzleStore()
    /** 「挑战」开局：题面 / 答案串 → 棋局真源 */
    const startFromTexts = useStartFromTexts()
    const preview = usePuzzlePreview((rowId) => puzzleStore.detailOf(rowId))

    const items = computed<MyPuzzle[]>(() => puzzleStore.mine)
    const loading = computed<boolean>(() => puzzleStore.loading)
    const error = computed<string>(() => puzzleStore.error)
    const pageCount = computed<number>(() => puzzleStore.pageCount)
    const empty = computed<boolean>(() => !loading.value && !error.value && !items.value.length)

    /** PATCH / DELETE 进行中 → 转圈遮罩 */
    const busy = ref(false)
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

    /** pid 的「遮蔽/明文 + 👁📋」整块收在 SecretValue 组件里：这里只给「怎么取真值」 */
    const loadPid = async (rowId: string): Promise<string | null> => (await detailOf(rowId))?.pid ?? null

    /**
     * 行内改动统一入口：取详情拿 pid → 转圈调后端 → 清缓存 + 重拉当前页
     * （失败只提示，不动本地数据；failText 让删除与保存有各自的文案）
     */
    const withDetail = async (
        rowId: string,
        run: (pid: string) => Promise<void>,
        failText = '保存失败，请重试',
    ): Promise<void> => {
        const pid = await loadPid(rowId)
        if (!pid) return
        busy.value = true
        try {
            await run(pid)
            afterChange(rowId)
        } catch (err) {
            puzzleStore.error = errorTextOf(err, failText)
        } finally {
            busy.value = false
        }
    }

    /** 统一 PATCH：重命名 / 可见性 / 显示答案都走它 */
    const patch = (rowId: string, body: PuzzlePatch): Promise<void> =>
        withDetail(rowId, async (pid) => { await updatePuzzle(pid, body) })

    /** 可见性下拉：值真的变了才 PATCH */
    const setVisibility = async (item: MyPuzzle, value: Visibility): Promise<void> => {
        if (value === item.visibility) return
        await patch(item.rowId, { visibility: value })
    }

    /** 显示答案下拉（开 / 关） */
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
        const ok = startFromTexts(
            detail.puzzleText, detail.solutionText, detail.blankCount,
            { pid: detail.pid, title: detail.title, uname: detail.uname },
        )
        if (!ok) return
        await router.push({ name: PAGE.Game })
    }

    /** 编辑：拿到 pid 后进编辑页（路径参数） */
    const openEdit = async (rowId: string): Promise<void> => {
        const pid = await loadPid(rowId)
        if (pid) await router.push({ name: PAGE.EditPuzzle, params: { pid } })
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
        await withDetail(target.value, async (pid) => {
            await removePuzzle(pid)
            removeOpen.value = false
        }, '删除失败，请重试')
    }

    /** 每行一套行内控件（闭包随行；components 只负责画） */
    const controlsFor = (item: MyPuzzle): MyPuzzleRowControls => {
        const id = item.rowId
        return {
            renaming: renaming.value === id,
            renameText: renameText.value,
            loadPid: () => loadPid(id),
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
        actionOf(ACTION.remove, () => { void confirmRemove() }),
        actionOf(ACTION.cancel, () => { removeOpen.value = false }),
    ])

    return {
        ...list,
        items, loading, error, empty, pageCount, busy,
        controlsFor, goCreate,
        ...preview,
        removeOpen, removeActions,
    }
}
