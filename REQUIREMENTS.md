# 数独 · 需求与功能文档 v1.4

> 关联：`ARCHITECTURE.md`（架构硬约束，含 §八 后端约定）· `scripts/check-arch.mjs`（守卫）
> 标记：✅ 已实现 · 🟡 部分 · ⛔ 未实现 · 🔸 默认取值（未否决即按此执行）

## 0. 术语表

| 词 | 含义 | 备注 |
|---|---|---|
| **B / boxSize** | 宫边长 | 3 / 4 / 5 / 6 |
| **S / sideS** | 盘面边长 = B² | 9 / 16 / 25 / 36 |
| **题面串 puzzleText** | 空格/逗号/换行分隔、行优先、`0` = 空格 | 个数必须是 16 / 81 / 256 / 625 / 1296 |
| **答案串 solutionText** | 同上，全非 0 | 必须是合法终盘 |
| **uid** | 用户标识 = **登录凭据** | 20 位 base62；**敏感，不对外展示** |
| **pid** | 题目标识 / 分享用 | 20 位 base62；搜索列表会返回；我的题目列表不返回 |
| **rowId** | 我的题目**列表行标识** | 8 位 base62，不敏感 |
| **可见性** | 公开 / 受保护 / 私有 | 见 FR-13 |
| **预览 / 答案预览 / 参考答案** | 三种只读遮罩 | 见 FR-8 |
| **挑战** | 以某道题的题面直接开局 | `parsePuzzle` → `startGame` |
| **重开** | 用同一题面/答案把棋局恢复到初始状态 | `gameStore.jump(0)` |

## 1. 角色与权限

| 能力 | 游客 | 注册用户 |
|---|---|---|
| 顶栏 / 主页浏览 | ✅ | ✅ |
| 系统生成开局 · 自定义开局（临时挑战） | ✅ | ✅ |
| 搜索 / 落地页 `/p/:pid` / 预览 / 挑战 / 参考答案 | ✅ | ✅ |
| 出题（新建） | ⛔ 入口灰 + 点击提示 | ✅ |
| 我的题目（预览 / 答案预览 / 挑战 / 重命名 / 三态 / 编辑 / 删除） | ⛔ 入口灰 + 点击提示 | ✅ |
| 注册 / 登录 | ✅ | 退出登录 |

- **灰显规则**：不用 HTML `disabled` → `aria-disabled` + `.is-disabled` + `@click.prevent` → 显示
  「该功能需要登录才可以使用」，**不导航**
- **全站顶栏**（`AppLayout`）：任意页面可见「数独（回主页）」「我的题目」「登录 / 👤 用户名 · 退出」；
  登录页隐藏右侧那组；点「👤 用户名」弹层可查看/复制**自己的 uid**
- **兜底守卫**：直入 `/create`、`/my-puzzles`、`/puzzle/:pid/edit` → 跳 `/login?redirect=…`，登录后回跳
- **`redirect` 安全**：只接受站内路径（`startsWith('/')` 且不以 `//` 开头），否则忽略
- 游客**没有 uid**

## 2. 页面地图与路由

    AppLayout（父路由 '/'：顶栏 + 提示条 + <main><RouterView/></main>）
     ├─ HomePage
     ├─ DifficultyPage（壳：子导航 + <RouterView/>）
     │    ├─ difficulty/SystemPage
     │    └─ difficulty/CustomPage
     ├─ GamePage · CreatePage · EditPuzzlePage · PuzzleViewPage · SearchPage · MyPuzzlesPage · LoginPage
     └─ 兜底 * → /home

| name | path | 页面 | 权限 / 参数 |
|---|---|---|---|
| `PAGE.Home` | `/home` | HomePage | — |
| `PAGE.Difficulty` | `/difficulty` | DifficultyPage（壳） | 落地 redirect → system |
| `PAGE.DifficultySystem` | `/difficulty/system` | difficulty/SystemPage | — |
| `PAGE.DifficultyCustom` | `/difficulty/custom` | difficulty/CustomPage | — |
| `PAGE.Game` | `/game` | GamePage | — |
| `PAGE.Create` | `/create` | CreatePage | requiresAuth |
| `PAGE.EditPuzzle` | `/puzzle/:pid/edit` | EditPuzzlePage | requiresAuth + `:pid` |
| `PAGE.PuzzleView` | `/p/:pid` | PuzzleViewPage | `:pid`（分享落地） |
| `PAGE.Search` | `/search` | SearchPage | `?q=&sort=time\|hot&page=` |
| `PAGE.MyPuzzles` | `/my-puzzles` | MyPuzzlesPage | requiresAuth + `?sort=time\|hot&page=` |
| `PAGE.Login` | `/login` | LoginPage | `?mode=sign-in\|sign-up&redirect=` |

**约定（R15）**：位置放路由、过程放 state、影响数据请求的放 query、纯 UI 偏好的放本地偏好；
`{ name: PAGE.Difficulty }` 经 `''` 子路由 redirect 落到**系统生成**；
换排序/关键词 → `page` 重置 1；`page` 越界 → 收敛最后一页；`pageCount ≤ 1` → 隐藏分页条；
**返回来源靠历史**（`router.back()`，无历史兜底 `/difficulty`）。

## 3. 功能需求

### FR-1 全站顶栏（AppLayout）⛔
- 左「数独」→ 回主页；右「我的题目」+「登录」/「👤 用户名 · 退出」。
- 游客点「我的题目」→ 不跳转，顶栏下方提示条出现「该功能需要登录才可以使用」；路由一变提示消失。
- 点「👤 用户名」→ 弹层显示**自己的 uid** + 复制。
- 退出登录 → 🔸 主动跳 `/home`；登录页隐藏右侧那组。

### FR-2 主页 ✅🟡
- 三入口：开始游戏（→ `/difficulty`）、出题（游客灰 + 本页提示条）、搜索题目（→ `/search`）。

### FR-3 难度页 · 系统生成 ✅
- 参数：B（3/4/5/6）、挖空比例 0.4~0.7；显示「共 N 格，挖空 M 格」。
  （百分比**由 composable 用 core 的 `percentOf` 算好**暴露给页面 —— 页面禁 `Math.`）
- Worker 生成（20s 超时）+ loading 遮罩；失败中文错误、可重试、`loading` 必须复位。
- 成功：`startGame(puzzle, solution, { boxSize, blankRatio })` → `/game`。参考答案按钮：有（本地答案）。

### FR-4 难度页 · 自定义 ⛔
- 两个 `textarea`（题面串 / 答案串）+ 格式提示 + 字符计数；**必须都填**。
- 校验顺序（失败不跳页）：`parsePuzzle(题面)` → `parsePuzzle(答案)` → `boxSize` 相同 →
  `!isBlankBoard(题面)` → `validatePuzzle(题面, 答案)` → 通过；**纯游玩不校验挖空比例**。
- 「**提交到我的题目**」：**可选项，默认不勾**；**勾选后展开补充项**（必填：**标题小输入框** 1~40）；
  提交时额外校验 **40%~70%** → `POST /api/puzzles`（默认 `visibility=private`）→ 再开局；
  **成功后提示「已保存到我的题目」**（游戏页顶部轻提示）。可见性 / 参考答案开关等详情到「我的题目」改。
- 失败文案：格式不对 / 盘面大小必须一致 / 题面不能全空 / 题面与答案不一致或答案非法 /
  挖空比例需在 40%~70% 之间（当前 xx%）。
- 不检查唯一解。

### FR-5 搜索页 ⛔
布局：**最上面搜索框** → 主内容（列表）；主内容**左上**「浏览方式」、**右上**「排序」；底部 `PagerBar`。

- 搜索框分流：

| 输入 | 行为 |
|---|---|
| 空 | 全部**公开**题，`sort=time` |
| `^[A-Za-z0-9]{20}$` | 先按 **pid** → 命中则跳转 `/p/:pid`；未命中再按 **uid** → 该出题人的公开题（列表上方显示「出题人：uname 的公开题」） |
| 其它 | 模糊匹配 **标题** + **uname**（只返回公开题） |

- 列表接口只回 `pid · title · sideS · blankCount`（**不带题面串**）。
- 「题目预览」与「挑战」都走详情接口 `GET /api/puzzles/:pid`。
- 排序：**时间优先 / 热度优先**（并列按 `createdAt DESC`）；分页 **10/页**；
  浏览形态（进度条 / 滑动条）存**本地偏好**（`services/prefs.ts`）。
- 列表项：`标题 · S×S · 挖空 N 格 · 题目预览 · 挑战`（**不显示出题人、状态、pid、答案**）。
- 三态：加载中 / 空结果（「没有找到题目」）/ 错误（可重试）。
- 挑战：进入游戏页时对**已登录**用户调 `POST /api/puzzles/:pid/play`（热度）；游客不调用。

### FR-6 落地页 `/p/:pid`（分享入口）⛔
- 显示：标题 · S×S · 挖空数 · 创建时间 · **出题人 uname** + **只读棋盘**（带缩放）+「挑战」+「← 返回」。
- 数据走 `GET /api/puzzles/:pid`（含题面串；**不展示答案**）。
- 可见性：`public` / `protected` 任何人可看；`private` 仅作者（否则「题目不存在或不可访问」）。

### FR-7 我的题目（需登录）⛔
页头：左上「浏览方式」、右上「排序（时间 / 热度）」；底部 `PagerBar`（10/页）。

    [ 标题 ✏️重命名 ] [ S×S ] [ 🌐公开 | 🔗受保护 | 🔒私有（可切换）] [ 创建时间 ] [ 挖空 N 格 ]
    [ pid ▮▮▮▮… 👁 📋 ] [ 题目预览 ] [ 答案预览 ] [ 参考答案 开关 ] [ 编辑 ] [ 删除 ]

- **列表接口**只回元信息：`rowId · title · sideS · blankCount · visibility · showSolution · playCount · createdAt`
  （**不带 pid、不带题面串/答案串**）。
- **「显示 pid / 复制 pid / 题目预览 / 答案预览 / 编辑 / 挑战」统一走 `GET /api/puzzles/mine/:rowId`**
  （一次拿全 pid + 题面 + 答案；前端按 rowId 缓存）；**复制 pid 不显示在界面**，直接进剪贴板。
- 重命名（小弹层）→ `PATCH { title }`；三态 → `PATCH { visibility }`；开关 → `PATCH { showSolution }`；
  删除 → 二次确认 → `DELETE`（连带清理 `puzzle_play`）。
- **改动后**：清该 `rowId` 的缓存 + 重拉当前页列表。
- 挑战自己的题**不计热度**；作者不受可见性限制。空态：「你还没有出过题，去出题 →」。

### FR-8 遮罩 BoardOverlay ⛔
- props：`show` · `board` · `boxSize` · `title` · `desc?` · `closeText?`；emit `close`。
- 只读棋盘 + 信息行 + **只有三按钮：缩小 / 放大 / 关闭**；组件自持 `useZoom()`（0.5~3，到界禁用，不设默认缩放）。
- **副作用为零**（不跳路由、不写 store）→ 挑战中关闭后**已填内容原样保留**。

| 用途 | board | title | closeText |
|---|---|---|---|
| 题目预览 | `fromPuzzle(题面, true)` | 题目预览 | 返回 |
| 答案预览（我的题目） | `fromPuzzle(答案, true)` | 答案预览 | 返回 |
| 参考答案（挑战中） | `fromPuzzle(答案, true)` | 参考答案 | 回到挑战 |

> 遮罩内**不加**「挑战」按钮。

### FR-9 出题页 `/create` ✅🟡
- 顶部区块：**标题输入框**（必填，🔸 1~40，默认 `我的题目 9×9`）+ **盘面大小选择器**；**不给**可见性/参考答案开关。
- 阶段① 题面：`!isBlankBoard` + 无冲突 + **挖空比例 40%~70%**（整数比较）→ 锁定。
- 阶段② 答案 → `validatePuzzle`。
- 提交 → **转圈遮罩（校验 + 上传）** → 「🎉 出题完成」+「回到主页」（🔸 只此一个）。
- 入库：`POST /api/puzzles`（服务端生成 pid + rowId、算 blankCount），默认 `public` / `show_solution=0` / `play_count=0`。

### FR-10 编辑页 `/puzzle/:pid/edit` ⛔
- **无**大小选择器；进入即预填**自己上传的题面**（未锁定，可增量改）；不预填旧答案。
- 「提交题目」→ 校验（含 40%~70%）→ 锁定 → 阶段② **重新填答案** → 提交 → 转圈（校验 + `PATCH`）→ 回「我的题目」。
- **不更新 `created_at`**；不含标题 / 可见性 / 参考答案开关（在列表里改）。

### FR-11 游戏页 `/game` ✅🟡
- 进入守卫：`mode !== Game` 或盘面为空 → 回难度页（系统生成）。**刷新不恢复棋局**（已知限制）。
- 操作条：**「返回」+「重开」+ 缩放 + 提示**（DEV 另有作弊）
  - **返回** = `router.back()`；无历史兜底 `/difficulty`
  - **重开** = `gameStore.jump(0)`（同一题面/答案回到初始状态，历史重置）
- 选格 / 填数 / 冲突标红 / 提示 / 撤回与跳步 / 胜利遮罩
- 胜利遮罩按钮：「回主页」+「重开」
- 题目信息行（按钮条上方）：挑战或自有题显示「标题 · 出题人 uname」；系统生成显示「系统生成 9×9」。
- **参考答案按钮**：`solution` 存在时显示（系统生成 / 自定义 / 自有题 / 对方 `show_solution=1`）。

### FR-12 账号（CF Functions + D1）⛔
- **注册**：填「显示名 uname」+「密码(+确认)」→ `POST /api/register` → 服务端生成**唯一 uid** →
  返回 `{ token, user }` → **展示「账号 ID」卡片（uid + 📋 复制 + 「我已保存，开始使用」）** →
  本地保存 `token` + `lastUid` → 回跳 redirect。
- **登录**：填「账号 ID」(自动预填 lastUid) + 密码 → `POST /api/login { uid, password }` → 回跳。
- 规则：uname 2~16 位（可中文可英文，**可重名**，仅显示名）；**密码 ≥8 位**；
  `UID_PATTERN = /^[A-Za-z0-9]{20}$/`（**大小写敏感**）；粘贴用输入框的 `@paste` 事件。
- **登录限流（只按 uid）**：同一 uid 连续失败 **5 次锁定 10 分钟**；失败文案统一「账号 ID 或密码错误」。
- 密码 `PBKDF2-SHA256` + 每用户随机盐，**迭代 10000**（Workers CPU 限额）；会话 token 存 D1，**7 天**，
  `Authorization: Bearer`。
- 刷新静默恢复（`GET /api/me`）；**401 由 store / composable 处理**（`services/api/client.ts` 只抛错，不碰 router）。
- **uid 敏感**：只在注册卡片与「我的账号」弹层出现；**uid 丢失且无本地保存 = 无法登录**（v1 不找回）。

### FR-13 可见性与分享 ⛔

| 值 | 名称 | 搜索列表 | 凭 pid 直达 / `/p/:pid` | 他人可挑战 | 仅作者可见 |
|---|---|---|---|---|---|
| `public` | 公开 | ✅ | ✅ | ✅ | — |
| `protected` | 受保护 | ❌ | ✅ | ✅ | — |
| `private` | 私有 | ❌ | ❌（**404**） | ❌ | ✅ |

- 出题保存 → 🔸 默认 `public`；自定义提交 → 🔸 默认 `private`。
- **分享方式 = 分享 pid**（我的题目里默认遮蔽，点显示/复制才申请；搜索列表照常返回 pid）。
- **uid 与 pid 同规则**（20 位 base62、唯一、服务端生成）；**uid 是登录凭据 → 不对外展示**。

### FR-14 缩放（所有棋盘）✅🟡
- 凡渲染棋盘处必须有放大 / 缩小（游戏页、出题/编辑页、三种遮罩、`/p/:pid`）。
- 由 **R14** 守卫保证；按钮统一来自 `useZoom().zoomActions`；🔸 不设默认缩放。

## 4. 游戏流程

    A 系统生成（✅）  顶栏/主页→/difficulty/system→选B·比例→开始游戏→generateInWorker→startGame→/game
    B 自定义（⛔）    /difficulty/custom→两串→parsePuzzle×2→同B→!blank→validatePuzzle
                      →（可选勾选提交：弹标题小框、查 40%~70%、POST、提示已保存）→startGame→/game
    C 搜索·预览（⛔） /search?q=&sort=&page=→列表（无题面串）→预览→GET /api/puzzles/:pid→BoardOverlay→返回
    D 搜索·挑战（⛔） 列表→挑战→GET /api/puzzles/:pid→parsePuzzle→（登录）play→startGame→/game
                      └─参考答案（对方开启）→BoardOverlay(答案,"回到挑战")→关闭保留进度
                      └─返回→router.back()；重开→jump(0)
    E 分享落地（⛔）  分享 pid → /p/:pid → 信息 + 只读棋盘 + 挑战 → /game
    F 我的题目（⛔）  /my-puzzles?sort=&page=→列表(rowId)
                      ├─显示/复制 pid / 题目预览 / 答案预览 / 编辑 / 挑战 → GET /api/puzzles/mine/:rowId
                      ├─重命名 → PATCH{title} · 三态 → PATCH{visibility} · 开关 → PATCH{showSolution}
                      └─删除 → 二次确认 → DELETE（清理 puzzle_play）；改动后清缓存 + 重拉当前页
    G 出题（🟡）      /create→标题+大小+阶段①(40~70%)→阶段②→转圈(校验+POST)→出题完成→回主页
    H 编辑（⛔）      /puzzle/:pid/edit→预填题面→提交→重填答案→转圈(PATCH)→回我的题目（创建时间不变）
    I 账号（⛔）      注册→展示 uid+复制→本地存 lastUid；登录→uid+密码（uid 限流）；刷新 GET /api/me 恢复

## 5. 分层归属

| 步骤 | 层 | 文件 |
|---|---|---|
| 字符串↔盘面 / S↔B / 挖空数与比例 | 纯函数 | `core/sudoku/{parse,shape}.ts` · `core/board/ops.ts` |
| 题面/答案校验（含同尺寸） | 纯函数 | `core/sudoku/rules.ts` |
| 盘面构造 / 缩放换算 / 百分比 | 纯函数 | `core/board/{model,ops,zoom}.ts` · `core/game/derive.ts` |
| HTTP / token / 本地偏好 | 服务适配器 | `services/api/*` · `services/prefs.ts` |
| 登录态 / 题目列表 | 数据层 | `stores/{user,puzzle}.ts` |
| 流程编排（router / loading / 错误 / 401） | 组合式层 | `composables/{auth,puzzle,game}/*` |
| 顶栏 / 遮罩 / 列表项 / 分页条 / 缩放按钮 | 页面布局与展示 | `pages/AppLayout.vue` · `components/{BoardOverlay,PuzzleCard,SecretField,PagerBar}.vue` · `useZoom().zoomActions` |
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

## 7. 接口清单

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/register` | 公开 | `{uname, password}` → `{token, user}`（uid 生成+查重；密码≥8） |
| POST | `/api/login` | 公开 | `{uid, password}` → `{token, user}`；**uid 限流**（连败 5 次锁 10 分钟）；错误统一「账号 ID 或密码错误」 |
| POST | `/api/logout` | Bearer | 删 session |
| GET | `/api/me` | Bearer | 恢复登录态 |
| GET | `/api/puzzles` | 公开 | `?keyword=&uid=&sort=time\|hot&limit=10&offset=` → **搜索列表**：只回公开题，字段 `pid · title · sideS · blankCount`<br>`?mine=1`（Bearer）→ **我的题目列表**：`rowId · title · sideS · blankCount · visibility · showSolution · playCount · createdAt` |
| GET | `/api/puzzles/:pid` | 公开 | 三态判定（private 非作者 404）；返回 `pid · title · uname · sideS · blankCount · createdAt · puzzleText · solutionText?`（答案仅当 `show_solution=1` 或我是作者） |
| GET | `/api/puzzles/mine/:rowId` | Bearer·作者 | **作者态详情**：`pid · rowId · title · sideS · blankCount · visibility · showSolution · playCount · createdAt · puzzleText · solutionText` |
| POST | `/api/puzzles` | Bearer | 新建（生成 pid + rowId、算 blankCount、复校 40~70%） |
| PATCH | `/api/puzzles/:pid` | Bearer·作者 | `title / puzzle / solution / visibility / showSolution`；改题面或答案时复校 40~70% 并**重算 blank_count**；**不改 created_at** |
| DELETE | `/api/puzzles/:pid` | Bearer·作者 | 硬删 + 清理 `puzzle_play` |
| POST | `/api/puzzles/:pid/play` | Bearer | 热度 +1（1 人 1 小时 1 次；**作者本人不计**；游客不调用） |

## 8. 错误与边界

| 场景 | 期望 |
|---|---|
| 题面/答案为空或个数不对 | 中文格式提示，不跳页 |
| 尺寸不一致 | 「盘面大小必须一致」（需先补 `sameShape`） |
| 题面全空 / 有冲突 / 与答案不符 | 分别给明确文案 |
| 入库挖空比例不在 40%~70% | 「挖空比例需在 40%~70% 之间（当前 xx%）」 |
| 大盘（B=6）生成慢 | Worker + loading；玩家用缩放按钮放大 |
| 搜索无结果 / 接口失败 | 「没有找到题目」/「加载失败，点击重试」 |
| `page` 越界 / `pageCount ≤ 1` | 收敛到最后一页 / 隐藏分页条 |
| `private` 被非作者访问 | 「题目不存在或不可访问」 |
| 挑战他人题且未开参考答案 | 无该按钮；胜利判定走规则 |
| 连续登录失败 5 次 | 锁定 10 分钟；文案统一「账号 ID 或密码错误」 |
| token 过期 / 未登录 | 401 → 清 token；灰显入口提示；直入受保护页跳登录并回跳 |
| `?redirect=` 是外站地址 | 忽略，回主页 |
| uid 丢失 | 无法登录（登录页提示「只存在你本地，请妥善保管」） |
| 手输地址无棋局进 `/game` | 回 `/difficulty`（系统生成） |
| 挑战中刷新 | 棋局丢失回难度页（v1 已知限制） |
| 重名作者 | 无法区分（v1 已知限制，不做作者主页） |

## 9. 验收用例

| # | 操作 | 期望 |
|---|---|---|
| 1 | 任意页面看顶栏 | 都有「数独 / 我的题目 / 登录」 |
| 2 | 游客点「我的题目」 | 提示「该功能需要登录才可以使用」，不跳转；路由变化后消失 |
| 3 | 注册 | 看到「账号 ID」卡片，复制成功；本地保存 lastUid |
| 4 | 重进登录页 | 账号 ID 已预填；只输密码即可登录 |
| 5 | 换设备粘贴 uid 登录 | 成功；顶栏弹层可查看并复制自己的 uid |
| 6 | 搜索结果 | 看不到任何 uid；列表项只有 标题/S×S/挖空/预览/挑战 |
| 7 | 出题（标题 + 两阶段 + 挖空 45%） | 转圈后「出题完成」；`/my-puzzles` 立即可见（默认公开） |
| 8 | 出题时挖空 10% | 提示「挖空比例需在 40%~70% 之间」，不入库 |
| 9 | 自定义勾选「提交到我的题目」 | 展开标题输入框（必填）；提交后我的题目可见（默认私有）并提示「已保存」 |
| 10 | 我的题目点「显示/复制/答案预览/编辑/挑战」 | 都只调一次 `mine/:rowId`；**复制 pid 不显示在界面** |
| 11 | 我的题目：重命名 / 三态 / 参考答案开关 / 排序 / 浏览方式 | 全部生效；排序与页码进 URL，浏览方式下次仍保留 |
| 12 | 我的题目：编辑（改题面 → 重填答案） | 校验失败有提示；成功后列表与预览同步；创建时间不变 |
| 13 | 我的题目：删除 | 二次确认后消失（`puzzle_play` 一并清理）；列表刷新 |
| 14 | 挑战中点参考答案（对方开启） | 遮罩只读答案；「回到挑战」关闭；**已填内容不变** |
| 15 | 游戏页点「重开」/「返回」 | 回到初始题面 / 回到来源页（无历史则回难度页） |
| 16 | 搜索：空 / 关键词 / 20 位 pid / 20 位 uid | 四种分流正确；pid 命中跳 `/p/:pid` |
| 17 | 分享 `/p/:pid` 给未登录的人 | 能看到信息与只读棋盘；可挑战 |
| 18 | 热度：同账号 1 小时内挑战两次 / 作者挑战自己的题 / 游客挑战 | 分别：只 +1 / 不计 / 不计 |
| 19 | 连续输错密码 5 次 | 第 6 次被锁定 10 分钟 |
| 20 | 切换排序/关键词 / 输 `?page=999` | page 自动回 1 / 收敛到最后一页 |
| 21 | `/difficulty/custom` 直达 / 后退 / 「再来一局」类入口 | 都正常；`{ name: PAGE.Difficulty }` 落系统生成 |
| 22 | 任意棋盘（B=6） | 缩放可用、到界变灰；不预设缩放 |
| 23 | 在 `/create` 退出登录 | 跳 `/home`；再点「出题」被守卫送登录 |
| 24 | `pnpm guard --strict && pnpm typecheck && pnpm typecheck:functions && pnpm test` | 全绿 |

## 10. 非目标（v1）

计时 / 排行 / 难度评级 / 多解检测 / 收藏 / 评论 / 离线缓存 / **uid 找回** / 改密码 / 改显示名 /
作者主页 / 单点登录与踢下线 / 账号自助解锁 / **IP 维度限流** / 用户注销 / `/game` 刷新恢复 /
i18n / 深色模式 / 完整 a11y。

## 11. 决策记录

| # | 决策 |
|---|---|
| 1 | 游客 = 游玩 + 搜索挑战 + 自定义 + 参考答案；注册 = + 出题 + 我的题目管理 |
| 2 | 受限入口**灰显 + 点击提示**；顶栏**全站可见**（`AppLayout` 父路由） |
| 3 | 后端 CF Functions + D1；PBKDF2；token 7 天；**uid 与 pid 同规则**（20 位 base62 / 唯一 / 服务端生成） |
| 4 | **登录 = uid + 密码**；uname 仅显示名、**可重名**；注册成功必须展示并复制 uid；本地保存 lastUid |
| 5 | **uid 敏感**：不出现在搜索结果、题目列表与出题人信息里（前端题目类型不含 uid） |
| 6 | 可见性三态：`public`（默认，出题）/ `protected`（pid 可达）/ `private`（仅作者，404） |
| 7 | 自定义提交默认 `private`；参考答案 `show_solution` 默认关 |
| 8 | **入库必须 40%~70% 挖空**（出题/编辑/自定义提交）；纯自定义游玩不校验；整数比较 |
| 9 | 热度：同一人 1 小时 1 次；**游客与作者本人不计**；并列按创建时间倒序；分页 **10/页** |
| 10 | 排序放 query（搜索与我的题目都有）；**浏览形态存本地偏好**（`sudoku.pagerMode`） |
| 11 | 搜索分流：空 → 公开列表；20 位串 → 先 pid（跳 `/p/:pid`）后 uid；其它 → 标题/uname 模糊 |
| 12 | **pid 按需申请**：我的题目列表只给 `rowId`，显示/复制/预览/答案预览/编辑/挑战都走 `mine/:rowId` |
| 13 | 编辑：不能改大小；预填题面；**答案必须重填**；编辑页无多余项；标题在列表里**重命名**；**不改创建时间** |
| 14 | 出题/编辑：提交 → 转圈遮罩（校验 + 上传）→ 完成遮罩 |
| 15 | 预览遮罩**无**挑战按钮；答案预览只在我的题目；遮罩**绝不写 store** |
| 16 | 所有棋盘必须有缩放（R14）；**不设默认缩放** |
| 17 | 难度页用**子路由**；`/difficulty` 落系统生成（不记忆） |
| 18 | 路由/状态归位（R15）：位置放路由、过程放 state、影响数据请求放 query、UI 偏好放本地偏好、布局用父路由 |
| 19 | 删除题目 = 硬删 + 清理 `puzzle_play`；标题必填（🔸1~40） |
| 20 | 🔸 系统生成 / 自定义也有参考答案按钮；出题完成只留「回到主页」，编辑完成回「我的题目」；退出登录跳 `/home` |
| 21 | **只做 uid 限流**（连败 5 次锁 10 分钟）；**密码 ≥8**；PBKDF2 迭代 **10000** |
| 22 | 列表行标识 `rowId`（8 位 base62，落库）；pid 按需申请合并为 `GET /api/puzzles/mine/:rowId` |
| 23 | **列表接口不带题面串**；预览/挑战/答案预览/编辑统一走详情接口 |
| 24 | **挖空数入库时算好**（`blank_count`），列表直接返回 |
| 25 | 自定义「提交到我的题目」可选项（默认否），勾选后展开补充项（标题必填），其余详情到「我的题目」改 |
| 26 | `/game` 刷新不恢复棋局（v1 已知限制） |
| 27 | 401 由 store / composable 处理（`services` 层不碰 router） |
| 28 | 换排序/关键词时 `page` 重置 1；`page` 越界 clamp；`pageCount ≤ 1` 隐藏分页条 |
| 29 | 游戏页操作条 =「返回」（`router.back()` 兜底 `/difficulty`）+「重开」（`jump(0)`）；胜利遮罩 =「回主页」+「重开」 |
| 30 | 勾选提交保存成功后提示「已保存到我的题目」 |
| 31 | 我的题目改动（PATCH/DELETE）后：清 `rowId` 缓存 + 重拉当前页列表 |
| 32 | `?redirect=` 必须是站内路径（`/` 开头且非 `//`） |
| 33 | localStorage 键名统一 `sudoku.` 前缀；移除未使用的 `axios` |
| 34 | 后端类型检查用**同一个** `functions/tsconfig.json`（esbuild + tsc 双用），并串进 `build` |

## 12. 分批路线

| 批 | 内容 |
|---|---|
| 6A | core：`sameShape` · `parsePuzzle` · `boxSizeOf` · `countBlanks` · `isBlankRatioOk` · `percentOf` · 拆 `board/model.ts`+`ops.ts` · `useZoom.zoomActions` · 8 个同名测试 · 修掉 `DifficultyPage` 的 `Math.round`（消掉守卫唯一红） |
| 6B-1 | ★ 后端打通验证：`pnpm add -D wrangler` · `functions/tsconfig.json`（单文件双用）· `wrangler types` · 一个 import core 的 ping 接口 → `wrangler pages dev` 能打包 |
| 6B-2 | `schema.sql`（5 表）+ `wrangler.toml` + 本地 D1 建表 |
| 6B-3 | `functions/utils/{id,auth,json}.ts`（`AUTH_ITERATIONS = 10000`） |
| 6B-4 | auth 四接口（注册 / 登录（uid 限流） / 登出 / me） |
| 6B-5 | puzzle 四组接口（`index` / `[pid]` / `mine/[rowId]` / `play`） |
| 6B-6 | `typecheck:functions` 串进 `build` |
| 6C | 前端数据层：types/constants 定稿 · `services/{prefs.ts,api/*}` · `stores/{user,puzzle}` · `pages/AppLayout.vue` + 路由重排 · 守卫 + `/login` · `SecretField` · `useAuth` · `LoginPage` · 主页瘦身 |
| 7 | 题目页面：`BoardOverlay` · `PuzzleCard` · `PagerBar` · `SearchPage` · `MyPuzzlesPage` · `PuzzleViewPage` |
| 8 | 难度页：壳 + `difficulty/{SystemPage,CustomPage}` + `useCustomFlow` + `useDifficultyFlow` 命名收口 |
| 9 | 管理闭环：出题保存 · `EditPuzzlePage` · 重命名 · 三态 · 参考答案开关 · 删除 · 游戏页「返回/重开/参考答案」 |

## 13. 工程注记

```
· 后端类型检查：同一个 functions/tsconfig.json（esbuild 读 paths；tsc -p 检查）
  → "typecheck:functions": "tsc --noEmit -p functions/tsconfig.json"，并串进 build
· wrangler types 生成 worker-configuration.d.ts（提交进仓库，供 D1 类型）
· 本地开发：pnpm add -D wrangler；.gitignore 追加 .wrangler/
· vite.config.ts 加 server.proxy['/api'] = 'http://127.0.0.1:8788'
· 移除未使用的 axios（dependencies）
· 限流：login_attempt 只按 uid（连败 5 次锁 10 分钟），成功登录清零
· rowId：8 位 base62 + UNIQUE 查重；pid：20 位 base62 同理
· blankCount：入库 / PATCH 时用 core 的 countBlanks 算好写列
· 前端缓存：mine/:rowId 详情按 rowId 缓存在 stores/puzzle.ts；PATCH/DELETE 后清缓存 + 重拉当前页
· localStorage 键：sudoku.token / sudoku.lastUid / sudoku.pagerMode
· 6C 落地后把 Page / User / SearchResult / Puzzle 从守卫 RESERVED_TYPES 里移除登记
· README.md 恢复极简版（介绍 + 命令 + 指向两份文档）
· 守卫现况：唯一红是 DifficultyPage 的 Math.round（6A 修）→ 之后 `guard --strict` 应为 红 0 / 黄 0
```
