import type { Action } from '@/types/item'

/**
 * 全站按钮条文案表 —— **按钮条的文案就写在按钮条这里**
 * · 页面 / composable 只挑按钮 + 给点击函数（拼装在 core/action.ts），不再自己写 `key` / 文案
 * · 文案是**字面量**：不指向别的 COPY、也不拼字符串 —— 改一处就是改这一行
 *   （行内控件 / 列表项 / 遮罩标题那些"不是按钮条"的文案，仍各在各的 COPY 里）
 * · `key` 只要求在**同一条按钮条内**唯一（back / close 在不同条里重复是正常的）
 * · 图形也算文案（R5：图标当文本，不另设图标字段）
 */
export const ACTION = {
    // —— 导航 / 关闭 ——
    back: { key: 'back', text: '◀ 返回' },
    backToMine: { key: 'back', text: '← 我的题目' },
    close: { key: 'close', text: '↩ 返回' },
    closeAnswer: { key: 'close', text: '↩ 回到挑战' },
    continueEdit: { key: 'back', text: '↩ 继续修改' },

    // —— 游戏页 ——
    restart: { key: 'restart', text: '↺ 重开' },
    hint: { key: 'hint', text: '💡 提示' },
    answer: { key: 'answer', text: '📖 答案' },
    cheat: { key: 'cheat', text: '⚡ 作弊' },
    exportPuzzle: { key: 'export', text: '📋 导出题目' },
    saveGame: { key: 'save', text: '💾 存档' },

    // —— 继续游戏（每行一个存档条：两个纯文字按钮）——
    resumeSave: { key: 'resume', text: '继续' },
    removeSave: { key: 'remove', text: '删除' },

    // —— 缩放（贴棋盘的那一对圆圈）——
    zoomOut: { key: 'zoomOut', text: '➖' },
    zoomIn: { key: 'zoomIn', text: '➕' },

    // —— 出题 / 编辑（提交按钮随阶段变，见 submitSpecOf）——
    submitPuzzle: { key: 'submit', text: '📤 提交题目' },
    submitSolution: { key: 'submit', text: '📤 提交答案' },
    goMine: { key: 'goMine', text: '📋 去我的题目' },
    startGame: { key: 'start', text: '▶ 开始游戏' },

    // —— 题目列表 / 预览 / 导出 ——
    challenge: { key: 'challenge', text: '▶ 挑战' },
    copyPuzzle: { key: 'puzzle', text: '📋 复制题面' },
    remove: { key: 'remove', text: '🗑 删除' },
    cancel: { key: 'cancel', text: '↩ 取消' },

    // —— 求解页 ——
    fillBoard: { key: 'fill', text: '⬇ 填入棋盘' },
    clearBoard: { key: 'clear', text: '🧹 清空棋盘' },
    solve: { key: 'solve', text: '🧮 求解' },

    // —— 账号 ——
    logout: { key: 'logout', text: '退出' },
    copyUid: { key: 'copy', text: '📋 复制' },
    copiedUid: { key: 'copy', text: '📋 已复制' },
    savedUid: { key: 'done', text: '➡️ 我已保存，开始使用' },
} as const satisfies Record<string, Action>

/**
 * 把「静态按钮（key + 文案）+ 点击函数」拼成一个 Action —— **和按钮表放一起**（都是"按钮条"的事）
 * · 不给 `onClick` → 组件渲染成纯文本（禁用态就这么表达，全站惯例、不另设 disabled）
 * · 没有点击函数时**不带这个键**（不写 `onClick: undefined`）
 */
export const ACTION_OF = (spec: Action, onClick?: () => void): Action =>
    onClick ? { ...spec, onClick } : { ...spec }
