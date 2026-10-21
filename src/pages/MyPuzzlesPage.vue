<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElMessageBox } from 'element-plus'
import AccountSection from '@/components/AccountSection.vue'
import BoardView from '@/components/BoardView.vue'
import ListSection from '@/components/ListSection.vue'
import MyPuzzleRow from '@/components/MyPuzzleRow.vue'
import Overlay from '@/components/Overlay.vue'
import { ACTION } from '@/constants/actions'
import { AUTH_COPY, LOADING_COPY, MINE_COPY } from '@/constants/copy'
import { TITLE_MAX } from '@/constants/game'
import { PAGE } from '@/constants/pages'
import { UNAME_PATTERN } from '@/constants/user'
import { errorTextOf } from '@/core/message'
import { useListQuery } from '@/composables/useListQuery'
import { useStartFromTexts } from '@/composables/game/useStartFromTexts'
import { usePuzzlePreview } from '@/composables/puzzle/usePuzzlePreview'
import { remove as removePuzzle, update as updatePuzzle } from '@/services/api/puzzleApi'
import { usePuzzleStore } from '@/stores/puzzle'
import { useUserStore } from '@/stores/user'
import type { MyPuzzleRowControls } from '@/types/item'
import type { ListSort, MyPuzzle, MyPuzzleDetail, PuzzlePatch, Visibility } from '@/types/puzzle'

/**
 * 列表 + 行内改动（**只有这一页用 → 就地写**）：分页交给 useListQuery，预览交给 usePuzzlePreview
 * · pid/题面串按 rowId 现取，改动后清缓存 + 重拉当前页
 */
const puzzleStore = usePuzzleStore()
const startFromTexts = useStartFromTexts()
const preview = usePuzzlePreview((rowId) => puzzleStore.detailOf(rowId))

const items = computed<MyPuzzle[]>(() => puzzleStore.mine)
const loading = computed<boolean>(() => puzzleStore.loading)
const error = computed<string>(() => puzzleStore.error)

/** PATCH / DELETE 进行中 → 页面级加载 */
const busy = ref(false)
/** 正在内联重命名的 rowId（'' = 无）；删除走 ElMessageBox 二次确认 */
const rowRenaming = ref('')
const rowRenameText = ref('')

const list = useListQuery({
    routeName: PAGE.MyPuzzles,
    load: async (q) => { await puzzleStore.loadMine({ sort: q.sort, page: q.page }); return true },
    pageCount: () => puzzleStore.pageCount,
})
const { bar, pager, changePagerMode, changeSort, changePage, retry } = list

const detailOf = (rowId: string): Promise<MyPuzzleDetail | null> => puzzleStore.detailOf(rowId)

/** 改动后：清该行缓存 + 重拉当前页 */
const afterChange = (rowId: string): void => { puzzleStore.dropDetail(rowId); list.retry() }

const goCreate = (): void => { void router.push({ name: PAGE.Create }) }

/** pid 的「遮蔽/明文 + 👁📋」整块收在 SecretValue 组件里：这里只给「怎么取真值」 */
const loadPid = async (rowId: string): Promise<string | null> => (await detailOf(rowId))?.pid ?? null

/** 行内改动统一入口：取详情拿 pid → 转圈调后端 → 清缓存 + 重拉当前页 */
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
const openRowPreview = (rowId: string, answer: boolean): void => {
    void preview.showPreview(rowId, answer, answer ? MINE_COPY.answerPreview : MINE_COPY.preview)
}

/** 挑战自己的题：以自有题面开局（作者不计热度，所以不调 play）—— 要取详情，**全程遮罩** */
const challengeRow = async (rowId: string): Promise<void> => {
    if (busy.value) return
    busy.value = true
    try {
        const detail = await detailOf(rowId)
        if (!detail) return
        const ok = startFromTexts(
            detail.puzzleText, detail.solutionText, detail.blankCount,
            { pid: detail.pid, title: detail.title, uname: detail.uname },
        )
        if (!ok) return
        await router.push({ name: PAGE.Game })
    } finally {
        busy.value = false
    }
}

/** 编辑：拿到 pid 后进编辑页（路径参数）—— 同样要取详情 */
const openEdit = async (rowId: string): Promise<void> => {
    if (busy.value) return
    busy.value = true
    try {
        const pid = await loadPid(rowId)
        if (pid) await router.push({ name: PAGE.EditPuzzle, params: { pid } })
    } finally {
        busy.value = false
    }
}

/** 内联重命名：点标题旁「重命名」→ 标题变输入框；回车 / 失焦提交，Esc 取消 */
const startRowRename = (item: MyPuzzle): void => { rowRenaming.value = item.rowId; rowRenameText.value = item.title }
const cancelRowRename = (): void => { rowRenaming.value = '' }
const commitRowRename = async (): Promise<void> => {
    const rowId = rowRenaming.value
    const name = rowRenameText.value.trim()
    rowRenaming.value = ''
    if (!rowId || !name || name.length > TITLE_MAX) return
    await patch(rowId, { title: name })
}

/** 删除：EP 的确认框（按钮文案仍来自 constants/actions）→ 拿 pid → DELETE → 清缓存 + 重拉 */
const confirmRemove = async (rowId: string): Promise<void> => {
    try {
        await ElMessageBox.confirm(MINE_COPY.removeConfirm, MINE_COPY.removeTitle, {
            type: 'warning',
            confirmButtonText: ACTION.remove.text,
            cancelButtonText: ACTION.cancel.text,
        })
    } catch {
        return                                   // 取消 / 关闭 → 什么都不做
    }
    await withDetail(rowId, async (pid) => { await removePuzzle(pid) }, '删除失败，请重试')
}

/** 每行一套行内控件（闭包随行；components 只负责画） */
const controlsFor = (item: MyPuzzle): MyPuzzleRowControls => {
    const id = item.rowId
    return {
        renaming: rowRenaming.value === id,
        renameText: rowRenameText.value,
        loadPid: () => loadPid(id),
        onRenameStart: () => startRowRename(item),
        onRenameInput: (text) => { rowRenameText.value = text },
        onRenameCommit: () => { void commitRowRename() },
        onRenameCancel: cancelRowRename,
        onVisibility: (value) => { void setVisibility(item, value) },
        onSolution: (on) => { void setSolution(item, on) },
        onPreview: (answer) => openRowPreview(id, answer),
        onChallenge: () => { void challengeRow(id) },
        onEdit: () => { void openEdit(id) },
        onRemove: () => { void confirmRemove(id) },
    }
}

/** 预览遮罩的数据（由 usePuzzlePreview 提供；列表页与搜索页共用那一个组合式） */
const {
    previewOpen, previewTitle, previewInput, previewActions, previewLoading,
} = preview

/**
 * 账号区（FR-1 / FR-12）—— **只有这一页用 → 就地写**
 * · 显示名就地重命名 → `PATCH /api/me`；退出在名字左边
 * · uid 默认遮蔽，点 👁 显示 / 📋 复制（整套在 SecretValue 组件里，这里只给"怎么取真值"）
 */
const userStore = useUserStore()
const router = useRouter()

const uname = computed<string>(() => userStore.uname)

/** uid 的取值（uid 是登录凭据，默认不给出去） */
const loadUid = async (): Promise<string | null> => userStore.uid

const renaming = ref(false)
const renameText = ref('')
const renameError = ref('')

const startRename = (): void => { renaming.value = true; renameText.value = userStore.uname; renameError.value = '' }
const cancelRename = (): void => { renaming.value = false; renameError.value = '' }
const onRenameInput = (text: string): void => { renameText.value = text; renameError.value = '' }

/** 提交改名：非法（2~16 位）→ 留在输入框并提示；没改 → 直接收起 */
const commitRename = async (): Promise<void> => {
    if (!renaming.value) return
    const name = renameText.value.trim()
    if (!UNAME_PATTERN.test(name)) { renameError.value = AUTH_COPY.unameInvalid; return }
    renaming.value = false
    if (name !== userStore.uname) await userStore.rename(name)
}

/** 退出：先删后端 session，再回主页（受保护页不会自己退出） */
const logout = async (): Promise<void> => {
    await userStore.logout()
    await router.replace({ name: PAGE.Home })
}

</script>

<template>
    <div class="page-card wide" v-loading.fullscreen.lock="previewLoading || busy"
        :element-loading-text="LOADING_COPY.puzzle">
        <!-- 账号区（FR-1 / FR-12）：显示名（就地重命名）+ 退出 + uid 遮蔽/复制 —— 展示在组件里，数据与回调由本页给 -->
        <AccountSection :uname="uname" :renaming="renaming" :rename-text="renameText" :rename-error="renameError"
            :load-uid="loadUid" @rename-start="startRename" @rename-input="onRenameInput"
            @rename-commit="commitRename" @rename-cancel="cancelRename" @logout="logout" />

        <!-- 列表骨架（工具条 + 三态 + 列表 + 分页条）：条目渲染方式由本页选（私人列表 → MyPuzzleRow） -->
        <ListSection :items="items" :loading="loading" :error="error" :empty-text="MINE_COPY.empty"
            :key-of="(item) => item.rowId" :bar="bar" :pager="pager" @retry="retry"
            @change-mode="changePagerMode" @change-sort="(v) => changeSort(v as ListSort)" @change-page="changePage">
            <template #empty>
                <el-button link type="primary" @click="goCreate">{{ MINE_COPY.goCreate }}</el-button>
            </template>

            <template #item="{ item }">
                <MyPuzzleRow :item="item" :controls="controlsFor(item)" />
            </template>
        </ListSection>

        <!-- 题目预览 / 答案预览：同一个遮罩（只读棋盘 + 贴棋盘的缩放圆圈；按钮条由 Overlay 渲染） -->
        <Overlay :show="previewOpen" :text="previewTitle" :actions="previewActions">
            <BoardView v-bind="previewInput" />
        </Overlay>

        <!-- 删除：走 ElMessageBox 二次确认（见 confirmRemove），不再自绘遮罩 -->

        <!-- PATCH / DELETE 进行中：页面级加载（v-loading 挂在根节点） -->
    </div>
</template>

<style scoped>
/* .list-bar / .sort-box / .list 都在全局；三态、表单控件、按钮由 Element Plus 提供 */
</style>
