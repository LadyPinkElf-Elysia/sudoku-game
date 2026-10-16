# 数独 · 需求与功能文档 v1.5

> 关联：`ARCHITECTURE.md`（架构硬约束，含 §八 后端约定）· `scripts/check-arch.mjs`（守卫）· `PROJECT.md`（项目全景导读：框架 / 设计 / 为什么 / 实现 / 数据流）· `CODE-GUIDE.md`（各层代码导读：pages / components / composables / stores / core）
> 标记：✅ 已实现 · 🟡 部分 · ⛔ 未实现 · 🔸 默认取值（未否决即按此执行）

## 0. 术语表

| 词 | 含义 | 备注 |
|---|---|---|
| **B / boxSize** | 宫边长 | 2 ~ 10（下拉 `BOX_SIZE_OPTIONS`：4×4 ~ 100×100） |
| **S / sideS** | 盘面边长 = B² | 4 / 9 / 16 / 25 / 36 / 49 / 64 / 81 / 100 |
| **题面串 puzzleText** | 空格/逗号/换行分隔、行优先、`0` = 空格 | 个数必须是 16 / 81 / 256 / 625 / 1296 / 2401 / 4096 / 6561 / 10000 |
| **答案串 solutionText** | 同上，全非 0 | 必须是合法终盘 |
| **uid** | 用户标识 = **登录凭据** | 20 位 base62；**敏感，不对外展示** |
| **pid** | 题目标识 / 分享用 | 20 位 base62；搜索列表会返回；我的题目列表不返回 |
| **rowId** | 我的题目**列表行标识** | 8 位 base62，不敏感 |
| **可见性** | 公开 / 受保护 / 私有 | 见 FR-13 |
| **预览 / 答案预览 / 答案** | 三种只读遮罩 | 见 FR-8 |
| **挑战** | 以某道题的题面直接开局 | `useStartFromTexts`（原 `gameStore.startFromTexts`）（内部 `parsePuzzle` → `startGame`） |
| **重开** | 用同一题面/答案把棋局恢复到初始状态 | `gameStore.jump(0)` |

## 1. 角色与权限

| 能力 | 游客 | 注册用户 |
|---|---|---|
| 顶栏 / 主页浏览 | ✅ | ✅ |
| 系统生成开局 · 自定义开局（临时挑战） | ✅ | ✅ |
| 搜索 / 落地页 `/p/:pid` / 预览 / 挑战 / 答案 | ✅ | ✅ |
| 出题（新建） | ⛔ 入口灰 + 点击提示 | ✅ |
| 我的题目（预览 / 答案预览 / 挑战 / 重命名 / 可见性下拉 / 编辑 / 删除） | ⛔ 需登录（游客点顶栏「👤 登录」→ 登录页） | ✅ |
| 注册 / 登录 | ✅ | 退出登录 |

- **灰显规则**：入口用 `Menu.disabled` 标记（如主页「出题模式」在游客态），点击由页面 `go()` 把
  `AUTH_COPY.needLogin`（「该功能需要登录才可以使用」）写进**本页提示条**（`.tip`），**不导航**；
  路由变化后提示条自动消失。入口本身是可点击文本（`TextAction`），不复用 HTML `disabled`。
- **全站顶栏**（`AppLayout`，外壳带整页外框）：任意页面可见**左侧常驻「主页」**（标题左边，登录页也在）
  与「数独（**居中**，纯标题、不可点）」；右侧账号位——游客「👤 登录」（→ `/login`）、登录后「👤 用户名」
  （→ `/my-puzzles`：账号区 + 我的题目）；**不设「我的题目」入口**（已并入头像）；登录页隐藏右侧那组
- **兜底守卫**：直入 `/create`、`/my-puzzles`、`/puzzle/:pid/edit` → 跳 `/login?redirect=…`，登录后回跳
- **`redirect` 安全**：只接受站内路径（`startsWith('/')` 且不以 `//` 开头），否则忽略
- 游客**没有 uid**

## 2. 页面地图与路由

    AppLayout（父路由 '/'：顶栏 + 提示条 + <main><RouterView/></main>）
     ├─ HomePage
     ├─ DifficultyPage（壳：子导航 + <RouterView/>）
     │    ├─ difficulty/SystemPage
     │    └─ difficulty/CustomPage
     ├─ GamePage · CreatePage · EditPuzzlePage · PuzzleViewPage · SearchPage · MyPuzzlesPage · LoginPage · SolvePage
     └─ 兜底 * → /home

| name | path | 页面 | 权限 / 参数 | 状态 |
|---|---|---|---|---|
| `PAGE.Home` | `/home` | HomePage | — | ✅ |
| `PAGE.Difficulty` | `/difficulty` | DifficultyPage（壳） | 守卫补默认 Tab → system | ✅ |
| `PAGE.DifficultySystem` | `/difficulty/system` | difficulty/SystemPage | — | ✅ |
| `PAGE.DifficultyCustom` | `/difficulty/custom` | difficulty/CustomPage | — | ✅ |
| `PAGE.Game` | `/game` | GamePage | — | ✅ |
| `PAGE.Create` | `/create` | CreatePage | requiresAuth | ✅ |
| `PAGE.EditPuzzle` | `/puzzle/:pid/edit` | EditPuzzlePage | requiresAuth + `:pid` | ✅ |
| `PAGE.PuzzleView` | `/p/:pid` | PuzzleViewPage | `:pid`（分享落地） | ✅ |
| `PAGE.Search` | `/search` | SearchPage | `?q=&sort=time\|hot&page=` | ✅ |
| `PAGE.MyPuzzles` | `/my-puzzles` | MyPuzzlesPage（**我的**：账号区 + 我的题目） | requiresAuth + `?sort=time\|hot&page=` | ✅ |
| `PAGE.Login` | `/login` | LoginPage | `?mode=sign-in\|sign-up&redirect=` | ✅ |
| `PAGE.Solve` | `/solve` | SolvePage（题目求解） | —（游客可用） | ✅ |

**约定（R15）**：位置放路由、过程放 state、影响数据请求的放 query、纯 UI 偏好的放本地偏好；
`{ name: PAGE.Difficulty }` 由**守卫补默认 Tab** 落到**系统生成**（决策 44：按 name 跳父路由不触发子路由 redirect）；
换排序/关键词 → `page` 重置 1；`page` 越界 → 收敛最后一页；`pageCount ≤ 1` → 隐藏分页条；
**返回来源靠历史**（`router.back()`，无历史兜底 `/difficulty`）。

## 3. 功能需求

> 15 条全部实现（FR-1~FR-15）；🔸 为默认取值约定。

### FR-1 全站顶栏（AppLayout）✅
- **左侧常驻「主页」**（标题左边的按钮）→ 任何页面（含登录页）一键回主页；**「数独」是纯标题、不可点**。
- **居中**「数独」= 纯标题、不可点；右侧账号位：游客「👤 登录」（→ `/login`）、登录后「👤 用户名」（→「我的」页；**退出已移到那里**）。
- **顶栏不设「我的题目」入口**：游客点头像即去登录页；需要登录的功能各自在页内提示（如主页「出题」灰显）。
- 点「👤 用户名」（登录后）→ 进入「我的」页（页首账号区显示 uid，默认遮蔽；值右侧裸图标 👁 睁/闭 + 📋 复制）；
  tooltip：我的（账号 ID + 我的题目）。
- 退出登录：在「我的」页账号区（显示名右边那一组的最右）→ 🔸 主动跳 `/home`；**顶栏不再放退出**；登录页隐藏右侧那组。

### FR-2 主页 ✅
- 五入口（同一列；**图标列固定宽 1.6em + 标签列** → 各条标签起点对齐 —— emoji 字宽不一，拼成一个字符串会参差）：
  关于我的（→ `/my-puzzles`）、开始游戏（→ `/difficulty`）、出题（游客灰 + 本页提示条，→ `/create`）、
  搜索题目（→ `/search`）、题目求解（→ `/solve`）。
- 卡片内**不放**「数独」标题（顶栏已有品牌名）。

### FR-3 难度页 · 系统生成 ✅
- 参数：B（2~10 → 盘面 4×4 ~ 100×100）、挖空比例 0.4~0.65（`BLANK_RATIO`）；显示「共 N 格，挖空 M 格」。
  （百分比由 composable 用 core 的 `percentOf` 算好暴露给页面 —— 页面禁 `Math.`）
- Worker 生成（15s 超时：`DEFAULT_TIMEOUT = 15000`）+ loading 遮罩；失败中文错误、可重试、`loading` 必须复位。
- 成功：`startGame(puzzle, solution, { boxSize, blankRatio })` → `/game`。答案按钮：有（本地答案）。

### FR-4 难度页 · 自定义 ✅
- 两个 `textarea`（题面串 / 答案串）+ 格式提示 + 字符计数；**必须都填**。
- 校验顺序（失败不跳页）：`parsePuzzle(题面)` → `parsePuzzle(答案)` → `boxSize` 相同 →
  `!isBlankBoard(题面)` → **`!hasEmptyGroup(题面)`（任意整行 / 整列 / 整宫不得全空）** →
  `validatePuzzle(题面, 答案)` → 通过；**纯游玩不校验挖空比例**。
- 「**提交到我的题目**」：**可选项，默认不勾**；**勾选后展开补充项**（必填：**标题小输入框** 1~40）；
  提交时额外校验 **40%~65%** → `POST /api/puzzles`（🔸 默认 `visibility=private`）→ 再开局；
  **成功后提示「已保存到我的题目」**（游戏页顶部轻提示）。可见性 / 答案开关等详情到「我的题目」改。
- 失败文案：格式不对 / 盘面大小必须一致 / 题面不能全空 / 题面不能有整行 / 整列 / 整宫全空 /
  题面与答案不一致或答案非法 / 挖空比例需在 40%~65% 之间（当前 xx%）。
- 不检查唯一解。
- 两个 textarea 的上限 **`CUSTOM_TEXT_MAX = 20000`**（按最大盘面 B=10 → 10000 格 + 分隔符算；原值 4000 只够 B=6 → 大棋盘串会被截断）

### FR-5 搜索页 ✅
布局：**最上面搜索框** → 主内容（列表）；主内容**左上**「浏览方式」、**右上**「排序」（两者都是**下拉，同在一个框里**）；底部 `PagerBar`。

- 搜索框分流：

| 输入 | 行为 |
|---|---|
| 空 | 全部**公开**题，`sort=time` |
| `^[A-Za-z0-9]{20}$` | 先按 **pid** → 命中则跳转 `/p/:pid`；未命中再按 **uid** → 该出题人的公开题（列表上方显示「出题人：uname 的公开题」） |
| 其它 | 模糊匹配 **标题** + **uname**（只返回公开题） |

- 列表接口回 `pid · title · sideS · blankCount · playCount · createdAt · uname` + **`total`**（**不带题面串**）；
  列表项**不显示出题人**，`uname` 只用于「出题人」表头。
- 「题目预览」与「挑战」都走详情接口 `GET /api/puzzles/:pid`。
- 排序：**时间优先 / 热度优先**（并列按 `createdAt DESC`）；分页 **10/页**（页数由 `total` 算出）；
  浏览形态（进度条 / 滑动条，**下拉选择**）存**本地偏好**（`sudoku.pagerMode`），默认「进度条」。
- 列表项：`标题 · 盘面大小 S×S · 挖空 N 格 · 创建时间 YYYY/M/D HH:mm · 热度 N · 题目预览 · 挑战`（**不显示出题人、状态、pid、答案**）；
  `createdAt` 缺失（旧数据 / 旧后端未返回）→ 显示**当前日期 + 时间**；时间格式 `YYYY/M/D HH:mm`（本地时区、**24 小时制**）；`playCount` 缺失 → **0**。
- 三态：加载中 / 空结果（「没有找到题目」）/ 错误（可重试）。
- 挑战：进入游戏页时对**已登录**用户调 `POST /api/puzzles/:pid/play`（热度）；游客不调用。

### FR-6 落地页 `/p/:pid`（分享入口）✅
- 显示：标题 · S×S · 挖空数 · 创建时间 · **出题人 uname** + **只读棋盘**（带缩放）+「挑战」+「← 返回」。
- 数据走 `GET /api/puzzles/:pid`（含题面串；**不展示答案**）。
- 可见性：`public` / `protected` 任何人可看；`private` 仅作者（否则「题目不存在或不可访问」）。

### FR-7 我的题目（需登录）✅
页首「**账号区**」：显示名 + uid（**默认遮蔽** `uid ▮▮▮▮…`；值右侧裸图标组 👁 睁/闭 + 📋 复制，与 pid 同规则；**明文时保留 `uid ` 前缀** → `uid <值>`）。
账号区一行：**「👤 显示名」·「重命名」·「退出」**（退出在最右）（点了名字就地变输入框，回车 / 失焦提交、Esc 取消，2~16 位复校）→ `PATCH /api/me`。
页头：左上「浏览方式」、右上「排序」（下拉标签 = `SORT_OPTIONS` 的「时间优先」/「热度优先」）——**都是下拉，两项同在一个框里**；底部 `PagerBar`（10/页）。

    [ 标题 · 重命名 ]                                          [ 删除 · 编辑 ]
      └ 点「重命名」→ 标题就地变成输入框（回车 / 失焦提交，Esc 取消）；右上角纯文字，左删除右编辑
    [ 盘面大小 S×S · 挖空 N 格 · 创建时间 YYYY/M/D HH:mm · 热度 N ]
    [ pid ▮▮▮▮… 👁 📋 ]  └ 👁 / 📋 由 `SecretValue` 自己画（传 label + 取值方式，点它就地响应；**不挂悬停提示**）
    [ 可见性 ▾ 🌐公开 | 🔗受保护 | 🔒私有 ]                      [ 显示答案 ▾ 开 | 关 ]   ← 分居两侧；两个下拉等宽（7rem）
    [ 题目预览 ]  [ 答案预览 ]                                [ ▶ 挑战 ]   ← 同一行：挑战在最右边

- **列表接口**只回元信息：`rowId · title · sideS · blankCount · visibility · showSolution · playCount · createdAt`
  （**不带 pid、不带题面串/答案串**）+ `total`。
- **「显示 pid / 复制 pid / 题目预览 / 答案预览 / 编辑 / 挑战」统一走 `GET /api/puzzles/mine/:rowId`**
  （一次拿全 pid + 题面 + 答案；前端按 rowId 缓存）；**复制 pid 不显示在界面**，直接进剪贴板。
- 重命名**行内**（点标题旁「重命名」→ 标题变输入框）→ `PATCH { title }`；可见性 / 答案**下拉** → `PATCH { visibility }` / `{ showSolution }`；
  删除 → 二次确认 → `DELETE`（连带清理 `puzzle_play`）。
- **改动后**：清该 `rowId` 的缓存 + 重拉当前页列表。
- 挑战自己的题**不计热度**；作者不受可见性限制。空态：`MINE_COPY.empty`「你还没有出过题」+ `MINE_COPY.goCreate`「去出题 →」。

### FR-8 遮罩 `Overlay`（全站唯一一个遮罩）✅
- props：`show` · `text?`（主文案）· `desc?` · `shade?`（要不要背景遮蔽）· `spinning?`（要不要转圈）· `actions?`（按钮条 = 一排**可点击文本** `TextAction`）· `wide?`（**宽盒子**：题面串 / 答案串这类长文本用；不传 = 原宽度）；默认插槽放还要显示的东西（只读棋盘）。
- 三种用途从此**同一个组件**：转圈加载（`spinning`）/ 文案 + 按钮条（成功 · 失败 · 删除确认 · 通关）/ 只读棋盘预览（插槽 = `BoardView`）。
- 预览的只读棋盘：`interactive=false` → `BoardView` 只画 canvas、不接任何动作；缩放数据与按钮条由 `usePuzzlePreview` 一并给出（`previewInput` / `previewZoomActions` / `previewActions`）。
- **副作用为零**（不跳路由、不写 store）→ 挑战中关闭后**已填内容原样保留**。

| 用途 | text | actions | 插槽 |
|---|---|---|---|
| 加载中 | 正在生成题目 … | —— | `spinning` |
| 题目 / 答案预览 | 题目预览 / 答案预览 | ➖ ➕ 返回 | `<BoardView>` |
| 答案（挑战中） | 答案 | ➖ ➕ 回到挑战 | `<BoardView>` |
| 通关 / 出题完成 / 删除确认 | 文案来自数据 | 由调用方给 | —— |

> 遮罩内**不加**「挑战」按钮。

### FR-9 出题页 `/create` ✅
- 顶部区块：**标题输入框**（必填，🔸 1~40，默认 `我的题目 9×9`）+ **盘面大小选择器**；**不给**可见性/答案开关。
- 阶段① 题面：`!isBlankBoard` + **无空行/列/宫** + 无冲突 + **挖空比例 40%~65%**（整数比较）→ 锁定；
  这几条校验都在 `core/message.ts` 的 `puzzleSubmitErrorOf` 里（与编辑页共用一份）。
- 阶段② 答案 → `validatePuzzle`。
- 提交 → **转圈遮罩（校验 + 上传）** → 「🎉 出题完成」+「去我的题目」（🔸 只此一个；回主页只保留顶栏那一个入口，遮罩必须有出口）。
- 入库：`POST /api/puzzles`（服务端生成 pid + rowId、算 blankCount），🔸 默认 `public` / `show_solution=0` / `play_count=0`。

### FR-10 编辑页 `/puzzle/:pid/edit` ✅
- **无**大小选择器；进入即预填**自己上传的题面**（未锁定，可增量改）；不预填旧答案。
- 「提交题目」→ 校验（全空 / 空行空列空宫 / 冲突 / 40%~65%）→ 锁定 → 阶段② **重新填答案** → 提交 → 转圈（校验 + `PATCH`）→ 回「我的题目」。
- **不更新 `created_at`**；不含标题 / 可见性 / 答案开关（在列表里改）。

### FR-11 游戏页 `/game` ✅
- 进入守卫：`mode !== Game` 或盘面为空 → 回难度页（系统生成）。**刷新不恢复棋局**（已知限制）。
- 操作条：**「返回」+「重开」+ 缩放 + 提示**（DEV 另有作弊）
  - **返回** = `router.back()`；无历史兜底 `/difficulty`
  - **重开** = `gameStore.jump(0)`（同一题面/答案回到初始状态，历史重置）
- 选格 / 填数 / 冲突标红 / 提示 / 撤回与跳步 / 胜利遮罩
- 胜利遮罩按钮：「重开」（回主页只走顶栏）
- 题目信息行（按钮条上方）：挑战或自有题显示「标题 · 出题人 uname」；系统生成显示「系统生成 S×S」。
- **答案按钮**：`solution` 存在时显示（系统生成 / 自定义 / 自有题 / 对方 `show_solution=1`）。
- 操作条 ＋「📋 导出题目」（**只在系统生成开局时出现** —— 自定义的串本就在你手上、挑战有 pid / 落地页可分享）：
  宽遮罩里给出**当前这一盘**的**题面串**（= 锁定格；玩家已填的数不进串；**不含答案** → 不剧透），可一键复制；
  串与 `parsePuzzle` 完全对称，别人拿到就能在「题目求解」/「自定义」里用。

### FR-12 账号（CF Functions + D1）✅
- **注册**：填「显示名 uname」+「密码(+确认)」→ `POST /api/register` → 服务端生成**唯一 uid** →
  返回 `{ token, user }` → **展示「账号 ID」卡片（uid + 📋 复制 + 「我已保存，开始使用」）** →
  本地保存 `token` + `lastUid` → 回跳 redirect。
- **登录**：填「账号 ID」(自动预填 lastUid) + 密码 → `POST /api/login { uid, password }` → 回跳。
- 规则：uname 2~16 位（可中文可英文，**可重名**，仅显示名；**可改** → `PATCH /api/me`）；**密码 ≥8 位**；
  `UID_PATTERN = /^[A-Za-z0-9]{20}$/`（**大小写敏感**）；uid 输入框绑 `@paste`：粘贴自动去掉空白，不做大小写转换。
- **登录限流（只按 uid）**：同一 uid 连续失败 **5 次锁定 10 分钟**；失败文案统一「账号 ID 或密码错误」。
- 密码 `PBKDF2-SHA256` + 每用户随机盐，**迭代 10000**（Workers CPU 限额）；会话 token 存 D1，**7 天**，
  `Authorization: Bearer`。
- 刷新静默恢复（`GET /api/me`）；**401 由 store / composable 处理**（`services/api/client.ts` 只抛错，不碰 router）。
- **uid 敏感**：只在注册卡片与「我的」页账号区出现（默认遮蔽，右侧 👁/📋 裸图标才用）；**uid 丢失且无本地保存 = 无法登录**（v1 不找回）。

### FR-13 可见性与分享 ✅

| 值 | 名称 | 搜索列表 | 凭 pid 直达 / `/p/:pid` | 他人可挑战 | 仅作者可见 |
|---|---|---|---|---|---|
| `public` | 公开 | ✅ | ✅ | ✅ | — |
| `protected` | 受保护 | ❌ | ✅ | ✅ | — |
| `private` | 私有 | ❌ | ❌（**404**） | ❌ | ✅ |

- 出题保存 → 🔸 默认 `public`；自定义提交 → 🔸 默认 `private`。
- **分享方式 = 分享 pid**（我的题目里默认遮蔽 `pid ▮▮▮▮…`，点显示/复制才申请；搜索列表照常返回 pid）。
- **uid 与 pid 同规则**（20 位 base62、唯一、服务端生成）；**uid 是登录凭据 → 不对外展示**。

### FR-14 缩放（所有棋盘）✅
- 凡渲染棋盘处必须有放大 / 缩小（游戏页、出题/编辑页、三种遮罩、`/p/:pid`）。
- **形态固定**：一对小圆圈按钮（`TextAction` + 类 `.zoom-btn`，文字就是 `➖` / `➕`）**固定在棋盘上方、水平居中**，**放在滚动框外面 → 棋盘放大到出现滚动条时也不跟着滚走**（缩放在任何缩放/滚动位置都看得见），**左缩小、右放大**；**不进任何操作条**（操作条只放页面动作）。
- 由 **R14** 守卫保证；按钮数据统一来自缩放 composable 的 `zoomActions`（页面用 `useBoardZoom(…).zoomActions`，预览遮罩用 `usePuzzlePreview` 的 `previewZoomActions`）。
- **默认缩放按盘面大小取**（`BOARD_ZOOM.default` 字典：9×9 → 1.25 · 16×16 → 1.5 · 36×36 → 2.5），且**跟着盘面大小走**：
  切盘面 / 载入大盘面 / 落地页打开大盘都会自动复位（`useBoardZoom`；没有登记时兜底 1）。

### FR-15 题目求解 `/solve` ✅
- 入口：主页「🧩 题目求解」（**游客可用**）；纯本地工具页：不写库、不记账、不碰热度。
- 输入两种方式（同页切换，**界面各自独立**：字符串模式不显示棋盘）：
  - **题目字符串**：只有多行输入框（+ 字符数）；「🧮 求解」先解析回填棋盘再求解；「⬇ 填入棋盘」= 解析成功后填进棋盘并切到棋盘模式
    （空串提示「题面不能全空」，格式错只报错，都不动现有盘面）；
  - **棋盘填入**：盘面大小下拉 + 可玩棋盘（点格选格 → 下方数字键填数，X 清格）；棋盘只在这个模式里出现。
  - **动作行是一行两件**：字符串模式 =「⬇ 填入棋盘」+「🧮 求解」；棋盘模式 =「🧹 清空棋盘」+「🧮 求解」——
    题面工具固定在同一行「🧮 求解」的**左边**。
- 「至多解数」下拉：1 / 2 / 3 / 5 / 10（默认 3）。
- 本地先拦三种不值得求解的输入（都不调 Worker）：**全空** / **宫边长 > 6** / **题面有冲突**。
- 「🧮 求解」→ 转圈遮罩 → **Worker 多解**（`solvePuzzleMulti`）；无解回「这盘无解」，超时 30s（`SOLVE_TIMEOUT`）。
- 结果：**一块只读棋盘** + 步骤条逐解切换（复用 `PagerBar(mode=steps)`：步骤文案「解 1 / 解 2 …」，
  信息行「第 k / 共 n 个解」）；输入盘与结果盘**各有自己的缩放**（FR-14）。
- 结果行：`共找到 n 个解`；到达上限时补「（已达上限 n）」提示还有更多解。
- 换盘面大小 / 清空 / 重新填入 → **立即作废旧结果**（不留过期解）。

## 4. 游戏流程（全部 ✅）

    A 系统生成（✅）  顶栏/主页→/difficulty/system→选B·比例→开始游戏→generateInWorker→startGame→/game
    B 自定义（✅）    /difficulty/custom→两串→parsePuzzle×2→同B→!blank→validatePuzzle
                      →（可选勾选提交：就地展开标题输入框、查 40%~65%、POST、提示已保存）→startGame→/game
    C 搜索·预览（✅） /search?q=&sort=&page=→列表（无题面串）→预览→GET /api/puzzles/:pid→Overlay(只读棋盘)→返回
    D 搜索·挑战（✅） 列表→挑战→GET /api/puzzles/:pid→parsePuzzle→（登录）play→startGame→/game
                      └─答案（对方开启）→Overlay(只读棋盘 +「回到挑战」)→关闭保留进度
                      └─返回→router.back()；重开→jump(0)
    E 分享落地（✅）  分享 pid → /p/:pid → 信息 + 只读棋盘 + 挑战 → /game
    F 我的题目（✅）  /my-puzzles?sort=&page=→列表(rowId)
                      ├─显示/复制 pid / 题目预览 / 答案预览 / 编辑 / 挑战 → GET /api/puzzles/mine/:rowId
                      ├─重命名 → PATCH{title} · 三态 → PATCH{visibility} · 开关 → PATCH{showSolution}
                      └─删除 → 二次确认 → DELETE（清理 puzzle_play）；改动后清缓存 + 重拉当前页
    G 出题（✅）      /create→标题+大小+阶段①(40~65%)→阶段②→转圈(校验+POST)→出题完成→去我的题目
    H 编辑（✅）      /puzzle/:pid/edit→预填题面→提交→重填答案→转圈(PATCH)→回我的题目（创建时间不变）
    I 账号（✅）      注册→展示 uid+复制→本地存 lastUid；登录→uid+密码（uid 限流）；刷新 GET /api/me 恢复
    J 求解（✅）      /solve→①粘题面串（「🧮 求解」先解析回填）/②棋盘手填→本地校验（全空·B>6·冲突）
                      →solveMultiInWorker→只读棋盘 + 步骤条逐解切换（第 k / 共 n 个解）
    K 导出（✅）      系统生成开局→/game→「📋 导出题目」→givenBoard(只留已知格)+boardToStr→宽遮罩只读题面串→复制→粘到 J / 自定义

## 5. 分层归属

| 步骤 | 层 | 文件 |
|---|---|---|
| 字符串↔盘面 / S↔B / 挖空数与比例 | 纯函数 | `core/sudoku/{parse,shape}.ts` · `core/board/ops.ts` |
| 题面/答案校验（含同尺寸） | 纯函数 | `core/sudoku/rules.ts` |
| 错误文案 / 40~65% 与提交校验 | 纯函数 | `core/message.ts`（`errorTextOf` · `blankRatioErrorOf` · `puzzleSubmitErrorOf`） |
| 网格工具（建表 / 映射 / 洗牌 / 分块） | 纯函数 | `core/array.ts` |
| 终盘生成 / 挖空 / 求解 / 多解（MRV 回溯；**单解与多解共用一份引擎**） | 纯函数 | `core/sudoku/{generator,digger,solver,multiSolver,tracker}.ts` |
| 导出题面（只留已知格 → 串） | 纯函数 | `core/board/ops.ts` 的 `givenBoard` · `core/sudoku/parse.ts` 的 `boardToStr` |
| 盘面构造 / 缩放换算 / 百分比 / 分页页数 / 宫坐标 | 纯函数 | `core/board/{model,ops,metrics,zoom}.ts` · `core/game/derive.ts` · `core/page.ts` |
| HTTP / token / 本地偏好 | 服务适配器 | `services/api/*` · `services/prefs.ts` |
| 登录态 / 题目列表与缓存 / 棋局来源 | 数据层 | `stores/{user,puzzle}.ts` · `stores/game.ts`（含 `meta`） |
| 流程编排（router / loading / 错误 / 401） | 组合式层 | `composables/{useListQuery,useClipboard,usePuzzleExport}.ts` · `composables/{auth,puzzle,game,solve}/*` |
| 顶栏 / 遮罩 / 列表骨架与列表项 / 分页条 / 表单字段 / 敏感值 | 页面布局与展示 | `pages/AppLayout.vue` · `components/{TextAction,Flex,FormField,Overlay,SecretValue,ListSection,PagerBar,PagerSliderView,PagerStepsView,BoardView,RenameText,EyeGlyph,NumberPad,MyPuzzleRow,PuzzleCard}.vue` · 元信息行 `composables/puzzle/metaText.ts` · 缩放走 `BoardView` 的 `zoomActions`（数据 `useBoardZoom(…).zoomActions` / `useZoom().zoomActions` / `usePuzzlePreview().previewZoomActions`） |
| 跨页视觉规格 | 全局样式 | `styles/{card,form,overlay}.css` |
| 只接线 | 页面 | `pages/**` |
| 服务端校验 / 会话 / 限流 / id | 后端 | `functions/**`（复用 `core`） |

## 6. 数据模型（D1）

```sql
CREATE TABLE user (
  uid TEXT PRIMARY KEY,             -- 20 位 base62，登录凭据（敏感）
  uname TEXT NOT NULL,              -- 显示名，可重名；2~16 位中英文数字下划线
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE session (
  token TEXT PRIMARY KEY, uid TEXT NOT NULL,
  created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE login_attempt (        -- 只按 uid 限流
  uid TEXT PRIMARY KEY, fails INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0, last_at INTEGER NOT NULL
);
CREATE TABLE puzzle (
  pid TEXT PRIMARY KEY,             -- 20 位 base62（分享用）
  row_id TEXT NOT NULL UNIQUE,      -- 8 位 base62（我的题目列表行标识）
  uid TEXT NOT NULL,
  title TEXT NOT NULL,              -- 1~40
  puzzle TEXT NOT NULL, solution TEXT NOT NULL,
  side_s INTEGER NOT NULL,
  blank_count INTEGER NOT NULL,     -- 入库时算好
  visibility TEXT NOT NULL DEFAULT 'public',
  show_solution INTEGER NOT NULL DEFAULT 0,
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_puzzle_public ON puzzle(visibility, created_at DESC);
CREATE INDEX idx_puzzle_hot    ON puzzle(visibility, play_count DESC, created_at DESC);
CREATE INDEX idx_puzzle_uid    ON puzzle(uid, created_at DESC);
CREATE TABLE puzzle_play (
  pid TEXT NOT NULL, uid TEXT NOT NULL, played_at INTEGER NOT NULL,
  PRIMARY KEY (pid, uid)            -- 热度去重：同一人 1 小时 1 次
);
```

> `schema.sql` 用 `CREATE TABLE / INDEX IF NOT EXISTS`（幂等，可重复执行）；本地库与云端库**各导一次**。

## 7. 接口清单

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/register` | 公开 | `{uname, password}` → `{token, user}`（uid 生成+查重；密码≥8） |
| POST | `/api/login` | 公开 | `{uid, password}` → `{token, user}`；**uid 限流**（连败 5 次锁 10 分钟）；错误统一「账号 ID 或密码错误」 |
| POST | `/api/logout` | Bearer | 删 session |
| GET | `/api/me` | Bearer | 恢复登录态 |
| PATCH | `/api/me` | Bearer | **改显示名**（`{uname}`，2~16 位复校；uname 仅显示名、**可重名** → 不做唯一性校验） |
| GET | `/api/puzzles` | 公开 | `?keyword=&uid=&sort=time\|hot&limit=10（上限 50）&offset=` → **搜索列表**：只回公开题，`{ items: pid · title · sideS · blankCount · playCount · createdAt · uname, total }`<br>`?mine=1`（Bearer）→ **我的题目列表**：`{ items: rowId · title · sideS · blankCount · visibility · showSolution · playCount · createdAt, total }` |
| GET | `/api/puzzles/:pid` | 公开 | 三态判定（private 非作者 404）；返回 `pid · title · uname · sideS · blankCount · createdAt · puzzleText · solutionText?`（答案仅当 `show_solution=1` 或我是作者） |
| GET | `/api/puzzles/mine/:rowId` | Bearer·作者 | **作者态详情**：`pid · rowId · title · uname · sideS · blankCount · visibility · showSolution · playCount · createdAt · puzzleText · solutionText` |
| POST | `/api/puzzles` | Bearer | 新建（生成 pid + rowId、算 blankCount、复校非空 / 无空行空列空宫 / 40~65%）；`visibility?` 走三态白名单，🔸 缺省 `public` |
| PATCH | `/api/puzzles/:pid` | Bearer·作者 | `title / puzzle / solution / visibility / showSolution`；改题面或答案时复校非空 / 无空行空列空宫 / 40~65% 并**重算 blank_count**；**不改 created_at** |
| DELETE | `/api/puzzles/:pid` | Bearer·作者 | 硬删 + 清理 `puzzle_play` |
| POST | `/api/puzzles/:pid/play` | Bearer | 热度 +1（1 人 1 小时 1 次；**作者本人不计**；游客不调用） |

## 8. 错误与边界

| 场景 | 期望 |
|---|---|
| 题面/答案为空或个数不对 | 中文格式提示，不跳页 |
| 尺寸不一致 | 「盘面大小必须一致」 |
| 题面全空 / 有冲突 / 与答案不符 | 分别给明确文案 |
| 题面有整行 / 整列 / 整宫全空（自定义 · 出题 · 编辑提交） | 「题面不能有整行 / 整列 / 整宫全空」，不入库；**系统生成不校验**（概率极小） |
| 入库挖空比例不在 40%~65% | 「挖空比例需在 40%~65% 之间（当前 xx%）」 |
| 大盘（B 越大越慢，最大 B=10 → 100×100）生成慢 | Worker + loading；玩家用缩放按钮放大 |
| 搜索无结果 / 接口失败 | 「没有找到题目」（`SEARCH_COPY.empty`）/ 错误文案（各 flow 的 `errorTextOf` 兜底，如「题目加载失败」）+ `ListSection` 的「重试」按钮 |
| `page` 越界 / `pageCount ≤ 1` | 收敛到最后一页 / 隐藏分页条 |
| `private` 被非作者访问 | 「题目不存在或不可访问」 |
| 挑战他人题且未开答案 | 无该按钮；胜利判定走规则 |
| 连续登录失败 5 次 | 锁定 10 分钟；文案统一「账号 ID 或密码错误」 |
| token 过期 / 未登录 | 401 → 清 token；灰显入口提示；直入受保护页跳登录并回跳 |
| `?redirect=` 是外站地址 | 忽略，回主页 |
| uid 丢失 | 无法登录（登录页提示 `AUTH_COPY.uidHint`：「登录需要它，请保存到安全的地方（只存在你本地）」） |
| 手输地址无棋局进 `/game` | 回 `/difficulty`（系统生成） |
| 挑战中刷新 | 棋局丢失回难度页（v1 已知限制） |
| 重名作者 | 无法区分（v1 已知限制，不做作者主页） |

| 求解：题面全空 / 宫边长 > 6 / 题面有冲突 | 本地直接给文案，**不调 Worker**（省一次长回溯） |
| 求解：这盘无解 | 「这盘无解」；解数不足上限时结果行按实际数量显示（「共找到 n 个解」） |
| 求解：超时 | 「求解超时，请减少解数或换小一点的盘面」（`SOLVE_TIMEOUT` = 30s） |
| 求解：字符串模式空串 / 格式错 | 「题面不能全空」/「题面格式不对…」；都不动现有盘面 |
| 导出：自定义 / 挑战开局 | 游戏页**不显示**该按钮（自定义的串本就在手上；挑战有 pid / 落地页） |
| 导出：玩家已填数 / 无随题答案 | 题面串只含**锁定格**，玩家填的不进串；**不导出答案**（不剧透） |
| 导出：大盘面（最多 10000 位） | 只读框可横向滚动 / 全选；一键复制成败写进遮罩说明行 |
## 9. 验收用例

| # | 操作 | 期望 | 现状 |
|---|---|---|---|
| 1 | 任意页面看顶栏 | 都有「主页」+「数独」+ 右侧账号位（游客「👤 登录」/ 登录后「👤 用户名」，**顶栏没有退出**） | ✅ |
| 2 | 游客点「我的题目」 | 提示「该功能需要登录才可以使用」，不跳转；路由变化后消失 | ✅ |
| 3 | 注册 | 看到「账号 ID」卡片，复制成功；本地保存 lastUid | ✅ |
| 4 | 重进登录页 | 账号 ID 已预填；只输密码即可登录 | ✅ |
| 5 | 换设备粘贴 uid 登录 | 成功（粘贴自动去空白）；「我的」页账号区可显示/复制自己的 uid | ✅ |
| 6 | 搜索结果 | 看不到任何 uid；列表项只有 标题/盘面大小/挖空/创建时间/热度/预览/挑战 | ✅ |
| 7 | 出题（标题 + 两阶段 + 挖空 45%） | 转圈后「出题完成」；`/my-puzzles` 立即可见（默认公开） | ✅ |
| 8 | 出题时挖空 10% | 提示「挖空比例需在 40%~65% 之间」，不入库 | ✅ |
| 9 | 自定义勾选「提交到我的题目」 | 展开标题输入框（必填）；提交后我的题目可见（默认私有）并提示「已保存」 | ✅ |
| 10 | 我的题目点「显示/复制/答案预览/编辑/挑战」 | 都只调一次 `mine/:rowId`（缓存）；**复制 pid 不显示在界面** | ✅ |
| 11 | 我的题目：重命名 / 三态 / 答案开关 / 排序 / 浏览方式 | 全部生效；排序与页码进 URL，浏览方式下次仍保留 | ✅ |
| 12 | 我的题目：编辑（改题面 → 重填答案） | 校验失败有提示；成功后列表与预览同步；创建时间不变 | ✅ |
| 13 | 我的题目：删除 | 二次确认后消失（`puzzle_play` 一并清理）；列表刷新 | ✅ |
| 14 | 挑战中点答案（对方开启） | 遮罩只读答案；「回到挑战」关闭；**已填内容不变** | ✅ |
| 15 | 游戏页点「重开」/「返回」 | 回到初始题面 / 回到来源页（无历史则回难度页） | ✅ |
| 16 | 搜索：空 / 关键词 / 20 位 pid / 20 位 uid | 四种分流正确；pid 命中跳 `/p/:pid` | ✅ |
| 17 | 分享 `/p/:pid` 给未登录的人 | 能看到信息与只读棋盘；可挑战 | ✅ |
| 18 | 热度：同账号 1 小时内挑战两次 / 作者挑战自己的题 / 游客挑战 | 分别：只 +1 / 不计 / 不计 | ✅ |
| 19 | 连续输错密码 5 次 | 第 6 次被锁定 10 分钟 | ✅ |
| 20 | 切换排序/关键词 / 输 `?page=999` | page 自动回 1 / 收敛到最后一页 | ✅ |
| 21 | `/difficulty/custom` 直达 / 后退 | 正常；`{ name: PAGE.Difficulty }` 落系统生成 | ✅ |
| 22 | 任意棋盘（如 B=6） | 缩放可用、到界变灰；**默认缩放按盘面大小取**（B=6 → 2.5） | ✅ |
| 23 | 在 `/create` 退出登录 | 跳 `/home`；再点「出题」被守卫送登录 | ✅ |
| 24 | `pnpm guard && pnpm typecheck && pnpm typecheck:functions` | 全绿 | ✅ |
| 25 | 手选题面故意留**一整行 / 一整列 / 一整宫全空**（出题 · 编辑 · 自定义提交） | 提示「题面不能有整行 / 整列 / 整宫全空」，不入库；系统生成不受影响 | ✅ |
| 26 | 主页点「🧩 题目求解」 | 进 `/solve`（游客可用）；两种输入方式**界面各自独立**（字符串模式不显示棋盘） | ✅ |
| 27 | 求解页：粘题面串 →「🧮 求解」 | 自动解析回填并出结果：只读棋盘 + 步骤条「解 1 / 解 2 …」+ 信息行「第 k / 共 n 个解」 | ✅ |
| 28 | 求解页：棋盘填入 → 手填 → 求解 | 同款结果；换盘面大小 / 清空 → 旧结果立即作废 | ✅ |
| 29 | 求解页反例：全空 / 有冲突 / 宫边长 7 | 立即给文案，不转圈（不调 Worker） | ✅ |
| 30 | 求解页：解数上限改成 1 | 最多 1 个解；到上限时结果行补「已达上限 1」 | ✅ |
| 31 | 系统生成的盘：游戏页点「📋 导出题目」 | 遮罩给出**当前这一盘**的题面串（锁定格；玩家填的不进串、**无答案**）；复制后提示「题面串已复制」 | ✅ |
| 32 | 把导出的串粘回求解页 / 自定义 | 能正常解析：求解出解 / 提交入库 | ✅ |
| 33 | 主页五入口 | 图标列固定宽 → 各条标签起点对齐；游客点「出题模式」出本页提示 | ✅ |
| 34 | 自定义 / 挑战进游戏页看操作条 | **没有**「📋 导出题目」（只有系统生成的盘才有） | ✅ |
| 35 | 出题页切盘面大小（B=3 → B=6） | 棋盘缩放跟着新尺寸复位（1.25 → 2.5），不停在旧值 | ✅ |
| 36 | 落地页打开一道 36×36 分享题 | 初始缩放 = 2.5（不是 1×） | ✅ |
| 37 | 求解页两个输入方式 | 与难度页「系统生成 / 自定义」同一套 Tab 外观（灰底胶囊 + 选中白底） | ✅ |

## 10. 非目标（v1）

计时 / 排行 / 难度评级 / 多解检测 / 收藏 / 评论 / 离线缓存 / **uid 找回** / 改密码 /
作者主页 / 单点登录与踢下线 / 账号自助解锁 / **IP 维度限流** / 用户注销 / `/game` 刷新恢复 /
i18n / 深色模式 / 完整 a11y。

## 11. 决策记录

| # | 决策 |
|---|---|
| 1 | 游客 = 游玩 + 搜索挑战 + 自定义 + 答案；注册 = + 出题 + 我的题目管理 |
| 2 | 受限入口**灰显 + 点击提示**；顶栏**全站可见**（`AppLayout` 父路由） |
| 3 | 后端 CF Functions + D1；PBKDF2；token 7 天；**uid 与 pid 同规则**（20 位 base62 / 唯一 / 服务端生成） |
| 4 | **登录 = uid + 密码**；uname 仅显示名、**可重名**；注册成功必须展示并复制 uid；本地保存 lastUid |
| 5 | **uid 敏感**：不出现在搜索结果、题目列表与出题人信息里（前端题目类型不含 uid） |
| 6 | 可见性三态：`public`（默认，出题）/ `protected`（pid 可达）/ `private`（仅作者，404） |
| 7 | 自定义提交默认 `private`；答案 `show_solution` 默认关 |
| 8 | **入库必须 40%~65% 挖空**（`BLANK_RATIO.max` = 0.65）（出题/编辑/自定义提交）；纯自定义游玩不校验；整数比较 |
| 9 | 热度：同一人 1 小时 1 次；**游客与作者本人不计**；并列按创建时间倒序；分页 **10/页** |
| 10 | 排序放 query（搜索与我的题目都有）；**浏览形态存本地偏好**（`sudoku.pagerMode`） |
| 11 | 搜索分流：空 → 公开列表；20 位串 → 先 pid（跳 `/p/:pid`）后 uid；其它 → 标题/uname 模糊 |
| 12 | **pid 按需申请**：我的题目列表只给 `rowId`，显示/复制/预览/答案预览/编辑/挑战都走 `mine/:rowId` |
| 13 | 编辑：不能改大小；预填题面；**答案必须重填**；编辑页无多余项；标题在列表里**重命名**；**不改创建时间** |
| 14 | 出题/编辑：提交 → 转圈遮罩（校验 + 上传）→ 完成遮罩 |
| 15 | 预览遮罩**无**挑战按钮；答案预览只在我的题目；遮罩**绝不写 store** |
| 16 | 所有棋盘必须有缩放（R14）；**默认缩放按盘面大小取**（`BOARD_ZOOM.default` 字典，随尺寸自动复位） |
| 17 | 难度页用**子路由**；`/difficulty` 落系统生成（不记忆） |
| 18 | 路由/状态归位（R15）：位置放路由、过程放 state、影响数据请求放 query、UI 偏好放本地偏好、布局用父路由 |
| 19 | 删除题目 = 硬删 + 清理 `puzzle_play`；标题必填（🔸1~40） |
| 20 | 🔸 系统生成 / 自定义也有答案按钮；出题完成 →「去我的题目」（与编辑完成一致），编辑完成回「我的题目」；退出登录跳 `/home` |
| 21 | **只做 uid 限流**（连败 5 次锁 10 分钟）；**密码 ≥8**；PBKDF2 迭代 **10000** |
| 22 | 列表行标识 `rowId`（8 位 base62，落库）；pid 按需申请合并为 `GET /api/puzzles/mine/:rowId` |
| 23 | **列表接口不带题面串**；预览/挑战/答案预览/编辑统一走详情接口 |
| 24 | **挖空数入库时算好**（`blank_count`），列表直接返回 |
| 25 | 自定义「提交到我的题目」可选项（默认否），勾选后展开补充项（标题必填），其余详情到「我的题目」改 |
| 26 | `/game` 刷新不恢复棋局（v1 已知限制） |
| 27 | 401 由 store / composable 处理（`services` 层不碰 router） |
| 28 | 换排序/关键词时 `page` 重置 1；`page` 越界 clamp；`pageCount ≤ 1` 隐藏分页条 |
| 29 | 游戏页操作条 =「返回」（`router.back()` 兜底 `/difficulty`）+「重开」（`jump(0)`）；胜利遮罩 =「重开」（回主页只走顶栏） |
| 30 | 勾选提交保存成功后提示「已保存到我的题目」 |
| 31 | 我的题目改动（PATCH/DELETE）后：清 `rowId` 缓存 + 重拉当前页列表 |
| 32 | `?redirect=` 必须是站内路径（`/` 开头且非 `//`） |
| 33 | localStorage 键名统一 `sudoku.` 前缀；移除未使用的 `axios` |
| 34 | 后端类型检查用**同一个** `functions/tsconfig.json`（esbuild + tsc 双用）；**R11 = core 必须可测（不强制测试）** —— 见决策 73 |
| 35 | 灰显入口**不渲染 RouterLink**：灰态用 `<button aria-disabled>` + `@click` 冒泡 `blocked`（`@click.prevent` 拦不住 RouterLink 自身导航，见 FR-1 原因） —— **已被取代**：v1.9.13 起入口改为可点击文本 `TextAction` + `Menu.disabled` + `go()` 写本页提示条，见 FR-1 / §1；本行仅存档 |
| 36 | 顶栏「数独」**居中**（三栏 grid）；`AppLayout` 外壳带整页外框（`App.vue` 保持纯 `<RouterView>`） |
| 37 | 列表接口统一回 `{ items, total }`；`SearchResult` 增 `uname`（仅供「出题人」表头，列表不显示） |
| 38 | 棋盘一律用 `BoardRenderInput` 对象传参；容器宽度由 `ResizeObserver` 单点测量后按参数传入渲染器 |
| 39 | **跨页公共流程抽公共组合式**：`useListQuery`（URL↔条件 / 分页 / 越界收敛 / 浏览偏好）、`usePuzzlePreview`（预览遮罩，取数由调用方注入）、`useClipboard`（复制 + 已复制态） |
| 40 | game store 持 `meta`（pid/title/uname），由 `startGame(..., source?)` 统一写入 → 游戏页信息行无残留 |
| 41 | 顶栏账号位 = **头像**：游客「👤 登录」→ 登录页，登录后「👤 用户名」→「我的」页（**不再用弹层**，也**不设「我的题目」入口**）；页首账号区 uid **与 pid 同规则**（默认遮蔽，右侧裸图标 👁 睁/闭 + 📋 复制，复制不显示在界面） |
| 46 | uid / pid 的 👁 / 📋 = **值右侧的裸图标组**（`ValueIcons`：inline、无按钮框、无文字，`message` 转 title/aria）；👁 是**睁/闭两态切换**（已明文 → 闭眼 = 点它隐藏），**不用 🙈 猴子**；遮蔽与明文都带同一前缀（`uid ▮▮▮▮…` ↔ `uid <值>`）；眼睛图形抽出 `EyeGlyph`，登录页密码框共用（全站一套），**全站无 🙈** |
| 47 | 「浏览方式」与「排序」统一成**下拉**（不再用切换按钮）：`PAGER_MODE_OPTIONS` 与 `SORT_OPTIONS` 同形；`useListQuery` 的 `togglePagerMode` → `changePagerMode(值)`；全局 `.mode-btn` 样式删除 |
| 48 | 搜索列表**补回 `playCount` / `createdAt`**（排序有「时间 / 热度」却看不见值）：后端公开搜索 SQL 加 `p.play_count` / `p.created_at`，`SearchResult` 加两字段，卡片行显示「盘面大小 · 挖空 · 创建时间 · 热度」（与「我的题目」行同标签） |
| 49 | 时间/热度**兜底**（新前端 + 旧后端也不会出现 `Invalid Date · 热度 undefined`）：`createdAt` 缺失 → 显示当前时间（`createdAt || Date.now()`），有记录就按记录；格式 `YYYY/M/D HH:mm`（24 小时制）；`playCount` 缺失 → `0`；搜索卡片与「我的题目」行**同一规则**（标签：`盘面大小` / `挖空` / `创建时间` / `热度`） |
| 50 | 「我的题目」行内**不再堆图标按钮**：标题旁「重命名」（点了标题就地变输入框，回车/失焦提交、Esc 取消）；右上角纯文字「删除 · 编辑」（左删除右编辑）；**可见性与答案改下拉**（`PUZZLE_VISIBILITY_OPTIONS` / `SOLUTION_OPTIONS`，与决策 47 同形）；题目预览 / 答案预览改**纯文字**；只保留「挑战」按钮；行内控件闭包由 composable 提供（R5：组件不碰 store / 路由）；**可见性与答案同一行、两个下拉等宽**（拆到 `MyPuzzleFields`，满足 R9 单文件 ≤200 行） | ✅ |
| 51 | `VISIBILITY` 常量**归位**：`constants/game.ts` → `constants/puzzle.ts`（可见性是题目属性，与其文案、下拉项同文件），同时满足 R2「constants 之间不得互相 import」 | ✅ |
| 52 | **退出登录移到「我的」页账号区（显示名右侧一组的最右），顶栏不再放退出**；显示名右边「重命名」= **改显示名**（就地变输入框）→ 新增 **`PATCH /api/me`**（`{uname}` 走 `UNAME_PATTERN` 复校；uname 仅显示名、可重名 → 不做唯一性）、`uname` 从「非目标」移出；前端 `stores/user.rename` + `useAccountPanel`（R6：页面只接线） | ✅ |
| 53 | **列表项卡片按「可复用组件」拆开**（不靠全局类、各自 scoped）：`PuzzleCardShell`（外框 + #title/#corner 插槽）· `PuzzleMeta`（元信息行 + 时间格式化，原先卡片与行各抄一份）· `RenameText`（文字+「重命名」→ 就地输入框，行标题与显示名共用）· `SecretValue`（等宽值 + 👁📋，pid/uid 共用）· `TextButtons`（一组纯文字操作：删除·编辑 / 预览 / 退出）· `PuzzleSettings`（原名 `MyPuzzleFields`，去「My」）；遮蔽/明文 + 复制逻辑抽成 `useSecretValue`（**uid 与 pid 同规则只写一次**）；`MyPuzzleRow` 164 → 79 行 | ✅ |
| 54 | **下拉统一成通用组件 `SelectField`**（纠正 53 把「可见性 + 答案」捆成专用 `PuzzleSettings` 的做法）：props = `label / options / value / compact / vertical / width`，值按选项原样回报（**支持数字**，如盘面大小 B）；全站 **8 处 `<select>` 全部收敛到它**（可见性 · 答案 · 浏览方式 · 排序 ×2 页 · 盘面大小 ×2 页），删 `PuzzleSettings` 与全局 `.sort-box`；配套 `BOX_SIZE_SELECT_OPTIONS` 常量 + `SelectOption` 类型 | ✅ |
| 42 | 路由守卫改 **async**：受保护页冷启动/直接开 URL 时先 `await userStore.restore()`（store 内 memo 化，无 token 立即返回）再判登录态 → 已登录用户刷新/收藏 `#/my-puzzles` 不再被弹回登录页；其余页面仍即时渲染（不等待）|
| 43 | 顶栏左侧常驻「主页」（三栏 grid 第 1 列原本空着）；「数独」保持纯标题（回主页只留这一个入口） |
| 44 | 难度壳的默认 Tab 用**守卫**补（`to.name === PAGE.Difficulty` → `{ name: PAGE.DifficultySystem }`）：原先靠子路由 `{ path: '', redirect }`，**按 name 跳父路由时不触发** → 点「开始游戏」会停在 `/difficulty`（两个 Tab 都不高亮、内容空） |
| 45 | **回主页只保留顶栏那一个入口**：删掉难度页「🏠 主页」、自定义「🏠 主页」、出题页「🏠 主页」、通关遮罩「回主页」；出题完成遮罩原来只有「主页」→ 改为「去我的题目」（与编辑完成一致，且遮罩必须有出口） |
| 55 | **一个通用件吃掉一族（组件数 31 → 18）**：`Overlay` 吸收 `BoardOverlay` + `LoadingOverlay` + `SpinnerIcon`（传文本 / 遮蔽 / 转圈 / 按钮条，棋盘走插槽）；`SecretValue` 吸收 `ValueIcons` + `useSecretValue`（传 label + 取值方式，遮蔽↔明文 + 📋 复制在组件里响应）；`Menu` 吸收 `MenuItem(s)`；`Buttons` 吸收 `ActionItem(s)/TextButtons/GlyphButton`；`FormField` 吸收 `TextField/TextAreaField/SecretField/SelectField/SliderField`。判据：**传数据 + 传渲染方式，组件按渲染表决定画什么**；避免「上帝组件（一大堆参数）」，也避免碎片化。 | ✅ |
| 56 | **列表只有两种，不再分四层**：删 `PuzzleCardShell` / `MetaList`（列表项外壳与信息行进**全局样式** `.item-card` / `.meta-line`，两种列表项各自自成一体）；`MyPuzzleRow`（私人，选项多）· `PuzzleCard`（公开，选项少）只接数据（`item` + 控件闭包），条目渲染方式由页面用插槽选；`ListSection` 的工具条与分页收成两个数据对象（`bar` / `pager`）→ 12 props → 6 props | ✅ |
| 57 | **进度条 / 滑动条 / 步骤条 = 同一个 `PagerBar` 的三种渲染方式**（`PagerBarView` / `PagerSliderView` / `PagerStepsView` 各自是「接数据就画」的小组件）：游戏页历史记录并入 `mode='steps'`，删 `HistoryBar`；R14 同步放宽为「`useZoom(` 或接预览的 `previewActions`」；棋盘组件明确「只读 = 纯 canvas，不接动作；可玩才接 `cell-click`」 | ✅ |
| 58 | **缩放圆圈贴棋盘**：放大 / 缩小做成**小圆圈按钮**（`Buttons` 新增第四种渲染方式 `variant='circle'`，只显示图形、文案转 title/aria），放在 `BoardView` 的 **`#zoom` 插槽**里——**和棋盘同一个框、紧贴棋盘正上方、左缩小右放大**，**退出所有操作条**（游戏页/出题页/编辑页/落地页的按钮条只剩页面动作）；`.board-fit` 随棋盘收缩 → 圆点正好左对齐棋盘左边界；量宽度的元素改为外层滚动框（显式 ref，避免量到随棋盘收缩的直接父级形成反馈）；预览遮罩的缩放由 `usePuzzlePreview.previewZoomActions` 给、答案遮罩由 `useGameFlow.answerZoomActions` 给，遮罩按钮条只留「返回 / 回到挑战」 | ✅ |
| 59 | **再收口（组件 18 → 15）**：`PagerBarView`（进度条三行按钮）内联进 `PagerBar`（一分支一形态：进度条内联 / 滑动条 / 步骤条）；`HistoryStep`（只此一用）并入 `PagerStepsView`；`PuzzleMeta` 删除——元信息行文本改由 **`composables/puzzle/metaText.ts` 的 `metaTextOf()`** 拼好（标签进 `PUZZLE_META_COPY`，时间格式仍是**全站唯一**一处），组件只渲染 `<p class="meta-line">{{ metaText }}</p>`。**顺带修掉一个真 bug**：`PagerBar.go()` 的上界原先写成 `next >= pageCount`（按步骤条的 0 基写的），导致**分页条「下一页」到末页、滑条拖到末端都被吃掉**；现按形态区分（页 1..pageCount / 步 0..pageCount-1） | ✅ |
| 60 | **按钮全部变成可点击文本 + 两个通用件**：删 `Buttons`（4 种渲染 / 6 个参数）与 `Menu`。新增 **`TextAction`**（`text` + `onClick`；**不传 `onClick` 就是纯文本**，禁用态不再需要 `disabled` 字段）与 **`Flex`**（`direction/gap/align/justify/wrap` —— 布局只此一件，各组件里的 `display:flex; gap` 一律改用它）。`Action` 数据从 `{icon,message,disabled,onClick}` 瘦成 **`{key,text,onClick?}`**（图形并进 text，如 `▶ 挑战`）；缩放圆圈改由 `BoardView` 按 `zoomActions` 自己画（`#zoom` 插槽删掉，6 处调用点省掉插槽写法）；顶栏入口 / 首页三入口 / 分页上一页下一页 / 遮罩按钮条全部走 TextAction；`.tip`、`.op-bar` 进全局样式 | ✅ |
| 61 | **修正 60**：① `TextAction` 的样式**直接用全站既有的 `.text-btn`**（不再自造一套颜色/字号），所以「退出」和「重命名」这类文本操作长得完全一致；② **不自行发明悬停提示**——`title` / `aria-label` 一律不加（`Action` 也随之去掉 `title` 字段），没给就不提示；③ 缩放圆圈改成**在棋盘正上方居中**（缩放行撑满棋盘宽后居中），不是贴左边界；④ 列表行的间距与对齐**退回 60 之前**（操作行 `gap 6` + `margin 10px 0`；公开列表项那两行居中）| ✅ |
| 62 | **文本操作不变蓝、不加下划线**：全局 `.text-btn`（`TextAction` / 重命名 / 去出题 / 登录页切换）与顶栏 `.nav-item` 都改成 `color: inherit` + 去掉 hover 下划线、去掉我给图标加的 hover 浅蓝底 —— **可点击文本就是普通文字**，只靠 `cursor: pointer` 表示可点。**同时修正 FormField 的朝向**：全局 `.field` 是 `flex-direction: column`，而横向版只覆盖了 `display`、漏了 `flex-direction` → 清单里的设置项实际被排成上下 ❌；现在横向版显式 `flex-direction: row`（标签在左、控件在右，**左右排**），表单页（自定义 · 登录）显式传 `vertical`（标签在上、输入框等宽等高——**题面 / 答案两个文本域从此一样大**）| ✅ |
| 63 | **缩放圆圈固定不滚**：缩放行从 `.board-fit`（滚动内容）里移出去，改放在滚动框**外面**（`BoardView` 根节点变成 `.board-box` = 缩放行 + `.board-scroll-container`）→ **棋盘放大到出滚动条、横向滚到任何位置，一对 `➖ ➕` 都稳稳在棋盘上方视图中间**；量宽度的 `boxEl` 仍是滚动框（不受影响）| ✅ |
| 64 | **文案与排布微调**：顶栏左侧「🏠 回到主页」→**「主页」**；界面里的**「参考答案」一律叫「答案」**（`MINE_COPY.solutionLabel` · 游戏页按钮 `📖 答案` · 结算遮罩标题 `答案`）；列表工具条的**「浏览方式」+「排序」收进同一个框**（`.list-bar` 加边框 / 圆角 / 浅底 / 内边距）；**我的题目行里「▶ 挑战」挪到「题目预览 / 答案预览」同一行的最右边**（一个 `justify="between"` 的行）| ✅ |
| 65 | **我的题目行：可见性与答案分居两侧**（`justify="between"`，左可见性 / 右答案，两个下拉仍等宽 7rem）| ✅ |
| 66 | **题面禁「整行 / 整列 / 整宫全空」**——只对**手选题面的提交**生效（出题 · 编辑 · 自定义），**系统生成不校验**（概率极小，按需求不加）。规则本体是 `core/sudoku/rules.ts` 的 **`Sudoku.hasEmptyGroup(grid)`**（复用已有的 `allGroups()` 行/列/宫定义，不另写一套循环）；出题/编辑经 `core/message.ts` 的 `puzzleSubmitErrorOf`、自定义在 `useCustomFlow.validate` 里查；**后端 `functions/utils/puzzle.ts` 同规则复校**（POST 新建 / PATCH 改题面答案都走它），文案共用 `EMPTY_GROUP_COPY.bad` / `CUSTOM_COPY.emptyGroup`。答案侧不用查（`validatePuzzle → isSolved ⇒ 已填满`）| ✅ |
| 67 | **函数去重（P1）：core 新增 `message.ts`**（3 个导出）——`errorTextOf(err, fallback)` 吃掉全站 **11 处** `err instanceof Error ? … : '…'`；`blankRatioErrorOf(blanks, boxSize)` 收口 3 处逐字重复的 40%~70% 文案；`puzzleSubmitErrorOf(numBoard, boxSize, sudoku)` 让出题 / 编辑那两段**逐字相同**的提交校验从 15 行压到 4 行。顺带改正 `useCustomFlow.validate` 里误用 `gameStore.sudoku`（它是**上一局**的 B，可能不等于输入盘面的 B）→ 改成 `getSudoku(p.boxSize)`：尺寸不一致时老写法会在 `grid[r][c]` 上抛异常 | ✅ |
| 68 | **「显示答案」+ 函数去重（P2/P3）**：① 我的题目行里那个下拉标签「答案」→**「显示答案」**（`MINE_COPY.solutionLabel`，游戏页按钮仍是「📖 答案」）。② `useMyPuzzles` 抽 `withDetail(rowId, run, failText)`：重命名 / 可见性 / 显示答案 / 删除共用「取详情拿 pid → 转圈 → 清缓存重拉」，删除失败也走统一文案（原先无 catch，会抛未处理的 rejection）；`openEdit` 改用 `loadPid`。③ 新增 store 动作 **`startFromTexts(puzzleText, solutionText, blankCount, source?)`**：我的题目「挑战」与落地页「挑战」共用一份开局（题面/答案串 → 解析 → `startGame`），两处各删 8 行。④ `stores/puzzle` 的两个列表取数收成内部 `loadPage(run, empty)`。⑤ 归一化收进 core：`page.ts` 新增 **`sortOf` / `pagerModeOf`**（原先在 `useListQuery` 里各写两遍）。⑥ `types/puzzle.ts` 新增 **`PuzzlePatch`**：`puzzleApi.update` 与 `useMyPuzzles.patch` 共用一份可提交字段。⑦ `core/sudoku/tracker.ts` 的 `place()` 抽内部 `drop(i,j)`（三段同构「删候选 + 记账」→ 一处调用，撤销闭包不变）；`render/board.ts` 去掉多余尾逗号 / 双空行，`drawLines` 直接用 `side`（不再重算 `boardSide`）| ✅ |
| 69 | **出题 / 编辑抽公共组合式 `usePuzzleStage`**（§六「跨页共用的流程 → 公共组合式」）：`phase` / `puzzleSnapshot` / `errorMsg` / `showFail` + `resetStage` / `submitPuzzle`（校验全在 core）/ `checkSolution`（成对校验 + 亮失败遮罩）/ `backToEdit` 收成一份 → 两个流程只留各自不同的部分（标题 · 缩放 · `POST` / `PATCH` · 跳转），各省 ≈20 行；`useEditFlow.load` 改用 `resetStage()` 回到「填题面」阶段。**顺带清掉 `CreatePage` / `EditPuzzlePage` 里两个早已废弃的 `title` 字段**（决策 61 已把 `title` 从 `Action` 删掉，`TextAction` 也只吃 `text` + `onClick` → 这两行是死数据）| ✅ |
| 70 | **拆 `core/sudoku/generate.ts`（407 行 → 违反 R9）为四件**：`generator`（模式盘 + 随机变换 + 补全：`generateSolution` / `generatePuzzle`）· `digger`（三阶段挖空 `digPuzzle`，比例取自 `BLANK_RATIO`）· `solver`（**一份回溯引擎** `solveGrid` + 单解 `solvePuzzle`）· `multiSolver`（`solveLimitOf` + `solvePuzzleMulti`，同一引擎只换停止策略）；多解器直接回 `NumBoard[]`；删掉语义冗余的 `generatePuzzle(board, rng)` 单解重载（唯一调用方 Worker 改用 `generator` 的入口）；另外给 `solvePuzzle` / `solvePuzzleMulti` 补「题面自带冲突 → null」的入口守卫（原先「填满即算解」，自带冲突的满盘会被当成解返回） | ✅ |
| 71 | **新增题目求解页 `/solve`**：`GAME_MODE ＋Solve`（与出题共用一套「手填盘面」：内部 `startInput` + `startCreate` / `startSolve` 两个薄入口（**2026-10 归位**：这两个薄入口已删除，改由调用方传 `GAME_MODE.Create` / `GAME_MODE.Solve` 给 `startInput`）），顺带修掉 4 个页面越层 import `@/core/board/zoom` 的 R2 违规（改用 `constants/board` 的 `BOARD_ZOOM_BY_BOX`）；Worker 协议改**判别式**（`kind` = generate / solve）并抽出 `runInWorker`（生成 / 多解共用通道）；`PagerBar` / `PagerStepsView` ＋可选 `infoText`（不传 = 原历史步数语义，游戏页零影响）；＋`constants/solve`、`composables/solve/useSolveFlow` | ✅ |
| 72 | **游戏页 ＋「📋 导出题目」**（玩到有意思的盘可以带走；**只在系统生成开局显示** —— 自定义的串本就在手上、挑战有 pid / 落地页可分享；**系统出题页也不放导出** —— 那里导出的是另生成的一盘，容易与「正在玩的盘」混淆）：core ＋`givenBoard`（只留 `lock` 的已知格 → 玩家填的数不进题面串）+ `boardToStr` 出串；**只导题面、不给答案**（避免剧透）；导出状态 / 复制 / 说明行收在 `composables/usePuzzleExport`，只读框直接写在游戏页（组件数不变，仍 15 个） | ✅ |
| 73 | **R11 恢复，但只恢复「可测」这一半**：core 必须可测（纯函数 · rng 注入 · **无模块级可变状态**，rules.ts 缓存登记 E1），但**不强制**配 .test.ts、**不强制**跑测试 —— 「可以测」与「必须测」是两件事；守卫只机器查 CORE_STATE 这一条，v1.7 的 --strict 与黄提醒不回来，仓库不预置 vitest | ✅ |
| 74 | **棋盘默认缩放跟着盘面大小走（修 bug）**：＋useBoardZoom(boxSize)（useZoom(defaultZoomOf(b)) + watch 尺寸变化复位），出题 / 编辑 / 游戏 / 落地页 4 页改用它 —— 原先 resetZoom() 复位的是 setup 那次捕获的默认值（切到 B=6 仍是 1.25；落地页 setup 时 boxSize=0 → 全程 1×）；useCreateFlow / useEditFlow 不再注入 resetZoom，预览遮罩复位也改按解析尺寸。顺带：难度页 .sub-nav / .sub-tab 提为全局样式，**题目求解页的输入方式改用同一套 Tab 视觉**；守卫 ZOOM_ENTRY ＋useBoardZoom | ✅ |
| 75 | **求解页动作行收成一行两件**：题面工具（字符串模式「⬇ 填入棋盘」/ 棋盘模式「🧹 清空棋盘」）移到「🧮 求解」**左边同一行**，删掉原先单独那一行；按钮名从「✏️ 在棋盘里修改」改回「⬇ 填入棋盘」（v1.9.1 曾改过一次，以这个名字为准） | ✅ |
| 76 | **缩放默认值收成一个字典**：`BOARD_ZOOM.default` 由标量 `1` 改成**按宫边长 B 的字典**（并入原 `BOARD_ZOOM_BY_BOX`，全站只留一个入口），`defaultZoomOf(boxSize)` 缺省兜底 `BOARD_ZOOM.min`；`useZoom()` 缺省参数与 `BoardView` 的 `zoom` 默认值都改指 `BOARD_ZOOM.min`（数值仍为 1，语义更清楚） | ✅ |
| 77 | **文档按文件事实对齐（内容级扫描）**：正文里的陈旧数值全部改成代码现值 —— 盘面大小 B **2~10**（原写 3/4/5/6）· 挖空比例 **40%~65%**（原写 40%~70%；`BLANK_RATIO.max` 早在那次「优化生成器」就改成 0.65，用户可见文案 `RATIO_COPY.bad` 同步改成 65%）· Worker 生成超时 **15s**（原写 20s）· `pnpm build` **不含 guard**；另补 §5 漏掉的 `core/message.ts` / `core/array.ts`、§7 的 `limit ≤ 50`、§12 第 14 批 | ✅ |
| 78 | **注释与硬编码文案扫一遍（按现状更新）**：① 修 `tracker.ts` 里早已不存在的 `fill.ts`（→ `generator.ts / solver.ts`）；② **修两个真 bug** —— `CUSTOM_TEXT_MAX` 由 4000 提到 **20000**（原值只够 B=6=1296 格，但盘面支持到 B=10 = 10000 格 → 自定义 / 求解页粘大棋盘串会被截断），数字个数提示由 `16/81/256/625/1296` 补全到 **…/2401/4096/6561/10000**（`CUSTOM_COPY` · `SOLVE_COPY` · 后端 `fail` 文案三处同源）| ✅ |
| 79 | **需求文档整篇对文件（第二轮）**：§0 术语表 B `3/4/5/6` → **2~10**、S `9/16/25/36` → **4~100**、挑战动作改 `startFromTexts`；§1 「灰显规则」整段重写（`aria-disabled` / `.is-disabled` / `blocked` 在 src 里**已无**，现状 = `Menu.disabled` + `go()` 写本页提示条）；§2 默认 Tab 由「子路由 redirect」改为「**守卫补**」（与决策 44 一致）；§3 「14 条」→ **15 条**；§4 自定义「弹标题小框」→ **就地展开**、`40~70%` → `40~65%`；§12 · §13 的 `40~70%` 与「functions 的 paths」一并改正 | ✅ |
| 80 | **三处归位 + 一处性能重排（渲染无状态 · 类型归位 · store 只留真源）**：① `render/` 拆成 `geometry.ts`（几何纯计算 `boardGeometryOf`）· `paint.ts`（单格 / 字重 / 线层贴图）· `layer.ts`（线层纯工厂）· `dirty.ts`（脏格 + 重绘决策，全纯函数）· `board.ts`（`prepareCanvas` / `paintBoard` / `paintDirtyCells` / `getClickPos`），**模块级状态清零**（一帧快照 / 线层 / 上次边长改由 `useBoardCanvas` 持有）→ 支持**整盘 / 局量双路径重绘**；② **类型归位**：`BoardGeometry` / `CellFonts` / `FrameState` / `RedrawMode` → `types/render.ts`，`GroupTable` / `GroupScanner` → `types/sudoku.ts`（R10）；③ **`stores/game` 收成「真源 + 规则派生 + 基本操作 + 规则查询」**：删 `startCreate` / `startSolve`（改由调用方传 `GAME_MODE.*` 给 `startInput`）、`startFromTexts` 移出为 `composables/game/useStartFromTexts.ts`（我的题目页与落地页共用一份）、`cheat` 更名 `fillSolution`（"作弊"只留作按钮文案）→ 169 → 146 行；④ core ＋ **`core/sudoku/groups.ts`**（3S 组单元表 + 计数缓冲，`findConflicts` / `hasConflict` / `hasEmptyGroup` 三扫描共用 → B=10 实测 ≈5.8×），`rules.ts` 178 → 95 行；⑤ 新增 `docs/11-从规则到实现：数独拆解全流程.md`（八步拆解法）并补齐 `docs/` 全系列 | ✅ |


## 12. 分批路线

| 批 | 内容 | 状态 |
|---|---|---|
| 6A | core：`sameShape` · `parsePuzzle` · `boxSizeOf` · `countBlanks` · `isBlankRatioOk` · `percentOf` · 拆 `board/{model,ops}` · `useZoom.zoomActions` | ✅ |
| 6B-1~6 | 后端打通：`functions/tsconfig.json` · `schema.sql`+`wrangler.toml`+本地 D1 · `utils/*` · auth 四接口 · puzzle 四组接口 | ✅ |
| 6C | 前端数据层：types/constants 定稿 · `services/{prefs.ts,api/*}` · `stores/{user,puzzle}` · `AppLayout` + 路由重排 · 守卫 + `/login` · `SecretField` · `useAuth` · `LoginPage` · 主页瘦身 | ✅ |
| 7 | 题目页面：`BoardOverlay` · `PuzzleCard` · `PagerBar` · `SearchPage` · `PuzzleViewPage` · `MyPuzzlesPage` · `MyPuzzleRow` · `useMyPuzzles` | ✅ |
| 8 | 难度页：壳 + `difficulty/{SystemPage,CustomPage}` + `useCustomFlow` | ✅ |
| 9 | 管理闭环：出题保存（标题 + 40~65% + `POST`）· `EditPuzzlePage` + `useEditFlow` · 重命名 · 三态 · 答案开关 · 删除 · 游戏页题目信息行 | ✅ |
| 10 | 清理与收口：`styles/{form,overlay}` 收编 · `LoadingOverlay` · `useClipboard` · `useListQuery` · `usePuzzlePreview` · 拆 `core/sudoku/{fill,tracker}` · 渲染宽度单点测量 · 去测试工具链 | ✅ |
| 11 | 文档与脚本对齐：`ARCHITECTURE v1.8.x` · `REQUIREMENTS v1.5` · 新版守卫（无 `--strict`/黄提醒 + 行数口径修正）· `README.md` · `worker-configuration.d.ts` · `public/favicon.svg` | ✅ |
| 12 | 组件收口（决策 55~57）：通用件「传数据 + 传渲染方式」· 遮罩/敏感值/菜单/列表骨架各留一个 · 游戏页历史记录并入 `PagerBar(mode='steps')` · 组件 31 → 18，`MyPuzzleRow` 收身约 80 行 · 守卫 R14 同步 | ✅ |
| 13 | 求解与导出：拆 `core/sudoku/generate.ts` → `{generator,digger,solver,multiSolver}`（单解 / 多解共用一份引擎）· `solvePuzzle` / `solvePuzzleMulti` 补「题面自带冲突 → null」入口守卫 · `PAGE.Solve` + `useSolveFlow` + `SolvePage`（两种输入 + 多解 + 步骤条）· Worker 判别式协议 + `runInWorker` · `GAME_MODE ＋Solve`（与出题共用 `startInput`）· 游戏页「📋 导出题目」（`givenBoard` + `usePuzzleExport`）· 主页入口图标列对齐 · 守卫 ＋R8 文件名检查 · 文档 / 需求 / 约束三处同步 | ✅ |
| 14 | 求解 / 导出之后的收尾：默认缩放改成**一个字典**（`BOARD_ZOOM.default` 并入 `BOARD_ZOOM_BY_BOX`）· 缩放复位跟着盘面大小（`useBoardZoom`）· 求解页 Tab 与难度页统一（`.sub-nav` 提全局）· 动作行一行两件 · 守卫 ＋R8 文件名 / R11 可测性 / `ZOOM_ENTRY` 认 `useBoardZoom(` · 文档按文件事实对齐（B 2~10 · 挖空 40~65% · 超时 15s · build 不含 guard） | ✅ |

## 13. 工程注记

    · 后端类型检查：同一个 functions/tsconfig.json（**无 paths** —— 后端 import core 一律相对路径；tsc -p 检查）
      → "typecheck:functions": "tsc --noEmit -p functions/tsconfig.json"，并串进 build        ✅
    · 移除未使用的 axios（dependencies）                                                    ✅
    · 测试工具链仍不预置（无 vitest / 无 test 脚本）：R11 只要求 core「可测」，**不强制写测试、不强制跑**      ✅
    · 本地开发：pnpm add -D wrangler；.gitignore 追加 .wrangler/                            ✅
    · vite.config.ts 加 server.proxy['/api'] = 'http://127.0.0.1:8788'                      ✅
    · 云端建表（部署前必做）：npx wrangler d1 execute sudoku-db --remote --file=schema.sql
      —— 本地库与云端库各导一次；wrangler.toml 的 database_id 必须是真实 UUID（占位串会 8000022）✅
    · 限流：login_attempt 只按 uid（连败 5 次锁 10 分钟），成功登录清零                          ✅
    · rowId：8 位 base62 + UNIQUE 查重；pid：20 位 base62 同理                               ✅
    · blankCount：入库 / PATCH 时用 core 的 countBlanks 算好写列                              ✅
    · 前端缓存：mine/:rowId 详情按 rowId 缓存在 stores/puzzle.ts；PATCH/DELETE 后清缓存 + 重拉当前页  ✅
    · localStorage 键：sudoku.token / sudoku.lastUid / sudoku.pagerMode                     ✅
    · 守卫行数口径：按「不含结尾换行」计（修正 off-by-one，正好 200 行的文件合法）               ✅
    · 守卫 R8 新增：composables/** 的 .ts 文件名必须 use*（纯函数模块登记例外：puzzle/metaText.ts）          ✅
    · 静态资源：public/favicon.svg（index.html 已引用，Vite 原样拷进 dist/）                   ✅
    · README.md（极简版）· worker-configuration.d.ts（wrangler types 生成并提交）            ✅
    · RESERVED_TYPES：白名单已清空（Page / User / SearchResult 均有真实使用点）                ✅
    · 守卫现况：pnpm guard 红 0（无 --strict / 无黄提醒）




