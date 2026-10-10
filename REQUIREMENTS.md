# 数独 · 需求与功能文档 v1.0

> 关联：`ARCHITECTURE.md`（架构硬约束）· `scripts/check-arch.mjs`（守卫）
> 标记：✅ 已实现 · 🟡 部分 · ⛔ 未实现 · 🔸 默认取值（未否决即按此执行）

## 0. 术语表

| 词 | 含义 | 硬约束 |
|---|---|---|
| **B / boxSize** | 宫边长 | 3 / 4 / 5 / 6 |
| **S / sideS** | 盘面边长 = B² | 9 / 16 / 25 / 36 |
| **题面串 puzzleText** | 空格/逗号/换行分隔、行优先、`0` = 空格 | 数字个数必须是 16 / 81 / 256 / 625 / 1296 |
| **答案串 solutionText** | 同上，全非 0 | 必须是合法终盘 |
| **pid / uid** | 题目 / 用户标识 | **20 位 base62 随机串**，只由服务端生成 |
| **预览** | 遮罩里看题目（只读），不离开列表 | 三按钮：缩小 / 放大 / 返回 |
| **答案预览** | 我的题目里看自己的答案（只读） | 三按钮：缩小 / 放大 / 返回 |
| **参考答案** | 挑战中看答案（只读） | 三按钮：缩小 / 放大 / **回到挑战** |
| **挑战** | 以某道题的题面直接开局 | `parsePuzzle` → `startGame` |
| **开局** | 进入游戏页的唯一入口 | `gameStore.startGame(puzzle, solution, cfg)` |

## 1. 角色与权限

| 能力 | 游客 | 注册用户 |
|---|---|---|
| 主页浏览 | ✅ | ✅ |
| 系统生成开局 | ✅ | ✅ |
| 自定义字符串开局（临时挑战） | ✅ | ✅ |
| 搜索题目 / 预览 / 挑战 / 参考答案 | ✅ | ✅ |
| 出题（新建） | ⛔ 入口灰 + 点击提示 | ✅ |
| 我的题目（预览 / 答案预览 / 挑战 / 重命名 / 三态 / 编辑 / 删除） | ⛔ 入口灰 + 点击提示 | ✅ |
| 登录 / 注册 | ✅ | 退出登录 |

- **灰显规则**：入口保留可见（**不用 HTML `disabled`**，否则点不到提示）→ `aria-disabled` + `.is-disabled`
  + `@click.prevent` → 显示「该功能需要登录才可以使用」，**不导航**。
- **登录入口**：主页右上角「登录」；登录后同位置显示「用户名 · 退出」。
- **兜底守卫**：地址栏直入 `/create`、`/my-puzzles` → 跳 `/login?redirect=…`，登录后回跳。
- 游客**没有 uid**，用户表中只有注册用户。

## 2. 页面地图

    主页 HomePage
      ├─ 右上角：[ 我的题目（游客灰） ] [ 登录 | 用户名·退出 ]
      ├─ 开始游戏 ──▶ 难度页 DifficultyPage
      │                ├─ Tab① 系统生成（Worker）
      │                └─ Tab② 自定义（题面串 + 答案串）
      ├─ 出题（游客灰）──▶ 出题页 CreatePage（新建 / 编辑两用）
      └─ 搜索题目 ──▶ 搜索页 SearchPage
    我的题目 MyPuzzlesPage（需登录）· 登录注册 LoginPage
    游戏页 GamePage（三条开局路径都汇到这里）
    遮罩 BoardOverlay（题目预览 / 答案预览 / 参考答案，不跳页）

## 3. 功能需求

### FR-1 主页 ✅🟡
- 三入口：开始游戏 / 出题 / 搜索题目；右上角：我的题目 + 登录。
- 游客时「出题」「我的题目」灰显，点击提示，不导航；登录后立刻可用。
- 验收：4 处入口都能到达目标；灰显项不跳转且出现提示。

### FR-2 难度页 · Tab① 系统生成 ✅
- 参数：B（3/4/5/6）、挖空比例 0.4~0.7；实时显示「共 N 格，挖空 M 格」。
- 生成走 Worker（20s 超时），期间 loading 遮罩；失败给中文错误并可重试，`loading` 必须复位。
- 成功：`startGame(puzzle, solution, { boxSize, blankRatio })` → 游戏页。
- 参考答案按钮：**有**（答案在本地会话里）。

### FR-3 难度页 · Tab② 自定义 ⛔
- 两个 `textarea`（题面串 / 答案串）+ 格式提示 + 字符计数。
- **必须两个都填**；不做"只填题面自动求解"。
- 点「开始游戏」按序校验，任一步失败**不跳页**：

| 步骤 | 规则 | 失败文案 |
|---|---|---|
| 1 | `parsePuzzle(题面串)` 非 null | 题面格式不对：需要 16/81/256/625/1296 个 0-9 的数字 |
| 2 | `parsePuzzle(答案串)` 非 null | 答案格式不对：同上 |
| 3 | 两者 `boxSize` 相同 | 题面与答案的盘面大小必须一致 |
| 4 | `isBlankBoard(题面)` 为 false | 题面不能全空 |
| 5 | `validatePuzzle(题面, 答案)` 为 true | 题面与答案不一致，或答案不是合法终盘 |
| 6 | 通过 | 开局：`startGame(题面, 答案, { boxSize: B, blankRatio: 0 })` |

- 游客：**临时挑战**，不保存。
- 已登录：开局前可选择「提交到我的题目」（🔸 默认可见性 **private**）。
- 不检查唯一解。

### FR-4 搜索页 ⛔
- 搜索框判定（按输入形态分流）：

| 输入 | 行为 |
|---|---|
| 空 | 全部**公开**题（时间优先，10/页） |
| `^[A-Za-z0-9]{20}$` | ① 按 **pid** 精确查：命中 `public`/`protected` → 展示该题；命中 `private` 且我是作者 → 展示；命中 `private` 且非作者 → 「题目不存在或不可访问」<br>② 未命中 → 按 **uid** 精确查 → 该出题人的全部**公开**题 |
| 其它（含中文/空格/长度不符） | 模糊匹配 **标题** + 出题人 **uname**（只返回公开题） |

- 排序切换：**时间优先 / 热度优先**；分页 **10 个/页**。
- 列表项：`标题 · S×S · 挖空 N 格 · 题目预览 · 挑战`（不显示状态 / pid / 答案）。
- 三态：加载中 / 空结果（「没有找到题目」）/ 错误（可重试）。
- 挑战：进入游戏页时对**已登录**用户调一次 `POST /api/puzzles/:pid/play`（热度）；游客不调用。

### FR-5 我的题目（需登录）⛔
列表项与操作：

    [ 标题  ✏️重命名 ]  [ S×S ]  [ 🌐公开 | 🔗受保护 | 🔒私有（可切换）]  [ 创建时间 ]  [ 挖空 N 格 ]
    [ pid ▮▮▮▮… 👁 ]     [ 题目预览 ] [ 答案预览 ] [ 参考答案 开关 ] [ 编辑 ] [ 删除 ]

- 空态：「你还没有出过题，去出题 →」。
- 删除需二次确认（「确认删除《标题》？不可恢复」）。
- **三态**（见 FR-11）；**重命名**发 `PATCH { title }`；**参考答案开关**发 `PATCH { showSolution }`。
- 预览/答案预览/挑战都走 `BoardOverlay` 与 `startGame`；作者看自己的题不受可见性限制。

### FR-6 遮罩 BoardOverlay（三种用途）⛔
- props：`show` · `board` · `boxSize` · `title` · `desc?` · `closeText?`；emit `close`。
- 内容：只读棋盘（`BoardView :interactive="false"`）+ 信息行 + **只有三个按钮：缩小 / 放大 / 关闭**。
- 缩放：组件自持 `useZoom()`（范围 0.5~3，到界禁用）；**不设默认缩放**。
- **副作用为零**：不跳路由、不写 store → 挑战中关闭后**已填内容原样保留**。
- 用途与参数：

| 用途 | board | title | closeText |
|---|---|---|---|
| 题目预览 | `fromPuzzle(题面, true)` | 题目预览 | 返回 |
| 答案预览（我的题目） | `fromPuzzle(答案, true)` | 答案预览 | 返回 |
| 参考答案（挑战中） | `fromPuzzle(答案, true)` | 参考答案 | 回到挑战 |

> 预览遮罩**不加**「挑战」按钮（要挑战请回列表点）。

### FR-7 出题页（新建）✅🟡
- **有**盘面大小选择器（新建才有）。
- 阶段① 填题面 →「提交题目」→ 校验（非全空 + `hasConflict`）→ 锁定。
- 阶段② 填答案 →「提交答案」→ `validatePuzzle`。
- 提交 → **转圈遮罩（正在校验并上传）** → 成功后「🎉 出题完成」+ **回到主页**（🔸 只这一个按钮）。
- **校验通过即自动保存上传**（`POST /api/puzzles`）；失败可重试并给中文原因。
- 🔸 标题：新建页提供标题输入（必填，默认自动填一个），保存后可重命名。
- 保存默认可见性：**public**。

### FR-8 编辑页（编辑自己的题）⛔
- **没有**盘面大小选择器（不允许改大小）。
- 进入即**预填自己上传的题面**（未锁定，可增量修改）；不预填旧答案。
- 「提交题目」→ 校验 → 锁定 → 阶段② **重新填答案**（旧答案不参与）。
- 提交 → 转圈遮罩（校验 + `PATCH`）→「修改完成」→ 回到**我的题目**。
- 🔸 **不含**标题 / 可见性 / 参考答案开关（那三项在列表里改）。

### FR-9 游戏页 ✅🟡
- 进入守卫：`mode !== Game` 或盘面为空 → 回难度页。
- 选格 / 填数（`NumberPad`）/ 冲突标红 / 提示 / 撤回与跳步 / 胜利遮罩 / DEV 作弊。
- **题目信息行**：挑战自己的题/别人的题显示「标题 · 出题人」；系统生成显示「系统生成 9×9」。
- **参考答案按钮**：`solution` 存在时显示；点击 → `BoardOverlay(closeText='回到挑战')`。
  - 系统生成 / 自定义（自己填）→ 有（本地答案）
  - 挑战他人题 → 仅当对方 `show_solution = 1`（否则接口不下发答案）
- 缩放按钮来自 `useZoom().zoomActions`（R14）。

### FR-10 账号（Cloudflare Functions + D1）⛔
- 注册 / 登录 / 退出 / 刷新静默恢复（`GET /api/me`）。
- 规则：用户名 2-16 位（中英文 / 数字 / 下划线）；密码 ≥ 6 位。
- 密码 `PBKDF2-SHA256`（10 万次 + 每用户随机盐）；会话 = 随机 token 存 D1，**有效期 7 天**，前端 `Authorization: Bearer`。
- 错误：用户名已占用 / 用户名或密码错误 / 登录已过期（401，清 token 并提示重新登录）。

### FR-11 可见性与分享 ⛔

| 值 | 名称 | 出现在搜索列表 | 凭 pid 直达 | 他人可挑战 | 仅作者可见 |
|---|---|---|---|---|---|
| `public` | 公开 | ✅ | ✅ | ✅ | — |
| `protected` | 受保护 | ❌ | ✅ | ✅ | — |
| `private` | 私有 | ❌ | ❌（**404**，不泄露存在性） | ❌ | ✅ |

- 出题保存 → 🔸 默认 `public`；自定义提交 → 🔸 默认 `private`。
- 切换入口：我的题目列表项；分享方式：**分享 pid**（列表里 pid 默认隐藏，闭眼图标点击显示）。

### FR-12 缩放（所有棋盘）✅🟡
- 凡渲染棋盘处必须有放大 / 缩小：游戏页主盘、出题/编辑页主盘、三种遮罩。
- 由 **R14** 守卫保证（`.vue` import 了 `BoardView` 就必须出现 `useZoom(` 或 `BoardOverlay`）。
- 按钮统一来自 `useZoom().zoomActions`；🔸 **不设默认缩放**（默认 1，玩家自己按）。
- 列表项不渲染棋盘。

## 4. 游戏流程

    A 系统生成（✅）
      主页→难度页Tab①→选B/比例→开始游戏→blankCountOf→generateInWorker→startGame→游戏页

    B 自定义（⛔）
      主页→难度页Tab②→题面串+答案串→parsePuzzle×2→boxSize 相同→isBlankBoard→validatePuzzle
        →（已登录可选：提交到我的题目，默认 private）→startGame→游戏页

    C 搜索·预览（⛔）
      主页→搜索页→搜索框分流→列表→题目预览→BoardOverlay(题面)→返回

    D 搜索·挑战（⛔）
      列表→挑战→GET /api/puzzles/:pid→parsePuzzle→（登录时）POST /:pid/play→startGame→游戏页
        └─参考答案（对方开启时）→BoardOverlay(答案, 回到挑战)→关闭保留进度

    E 我的题目管理（⛔）
      主页右上角→我的题目→GET /api/puzzles?mine=1
        ├─题目预览 / 答案预览（BoardOverlay）
        ├─挑战（同 D）
        ├─重命名   → PATCH { title }
        ├─三态切换 → PATCH { visibility }
        ├─参考答案开关 → PATCH { showSolution }
        ├─编辑     → 编辑页（题面→重填答案）→ PATCH { puzzle, solution }
        └─删除     → 二次确认 → DELETE

    F 出题保存（🟡）
      主页→出题→标题 + 阶段①题面→阶段②答案→转圈遮罩(校验+POST)→出题完成→回主页

    G 编辑（⛔）
      我的题目→编辑→（无大小选择器）预填题面→改→提交题目→重填答案→转圈(PATCH)→回我的题目

    H 账号（⛔）
      注册/登录→存 token→回跳 redirect→刷新时 GET /api/me 恢复

## 5. 分层归属（实现时守住）

| 步骤 | 层 | 文件 |
|---|---|---|
| 字符串↔盘面、S↔B、挖空数 | 纯函数 | `core/sudoku/parse.ts` · `shape.ts` · `core/board/ops.ts` |
| 题面/答案校验（含同尺寸） | 纯函数 | `core/sudoku/rules.ts` |
| 盘面构造 | 纯函数 | `core/board/model.ts` · `ops.ts` |
| 缩放换算 | 纯函数 | `core/board/zoom.ts` |
| HTTP / token / 存储 | 服务适配器 | `services/api/{client,token,userApi,puzzleApi}.ts` |
| 登录态 / 题目列表 | 数据层 | `stores/{user,puzzle}.ts` |
| 流程编排（router/loading/错误） | 组合式层 | `composables/{auth,puzzle}/*` · `composables/game/*` |
| 遮罩 / 列表项 / 缩放按钮 | 展示层 | `components/{BoardOverlay,PuzzleCard,SecretField}.vue` · `useZoom().zoomActions` |
| 只接线 | 页面 | `pages/*.vue` |

## 6. 数据模型（D1）

```sql
CREATE TABLE user (
  uid TEXT PRIMARY KEY,                      -- 20 位 base62
  uname TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE session (
  token TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE puzzle (
  pid TEXT PRIMARY KEY,                      -- 20 位 base62
  uid TEXT NOT NULL,
  title TEXT NOT NULL,
  puzzle TEXT NOT NULL,
  solution TEXT NOT NULL,
  side_s INTEGER NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public', -- public | protected | private
  show_solution INTEGER NOT NULL DEFAULT 0,
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_puzzle_public ON puzzle(visibility, created_at DESC);
CREATE INDEX idx_puzzle_hot    ON puzzle(visibility, play_count DESC);
CREATE INDEX idx_puzzle_uid    ON puzzle(uid);

CREATE TABLE puzzle_play (                   -- 热度去重：同一人 1 小时 1 次
  pid TEXT NOT NULL,
  uid TEXT NOT NULL,
  played_at INTEGER NOT NULL,
  PRIMARY KEY (pid, uid)
);
```

## 7. 接口清单（CF Functions）

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/register` | 公开 | `{uname,password}` → `{token,user}` |
| POST | `/api/login` | 公开 | 同上 |
| POST | `/api/logout` | Bearer | 删 session |
| GET | `/api/me` | Bearer | 恢复登录态 |
| GET | `/api/puzzles` | 公开 | `?keyword=&uid=&sort=time\|hot&limit=10&offset=0`；**只返回 public**；`mine=1` 返回自己的全部（三态） |
| GET | `/api/puzzles/:pid` | 公开 | 三态判定（private 非作者 → 404）；`solution` 仅当 `show_solution=1` 或我是作者 |
| POST | `/api/puzzles` | Bearer | 新建，默认 `visibility=public` |
| PATCH | `/api/puzzles/:pid` | Bearer·作者 | 可改 `title / puzzle / solution / visibility / showSolution`；改题面或答案时**服务端复用 core 校验** |
| DELETE | `/api/puzzles/:pid` | Bearer·作者 | 硬删 |
| POST | `/api/puzzles/:pid/play` | Bearer | 热度 +1（1 人 1 小时 1 次）；**游客不调用** |

## 8. 错误与边界

| 场景 | 期望 |
|---|---|
| 题面/答案为空或个数不对 | 中文格式提示，不跳页 |
| 题面与答案尺寸不一致 | 「盘面大小必须一致」（现有 `validatePuzzle` 会抛异常 → 先补 `sameShape`） |
| 题面全空 / 有冲突 / 与答案不符 | 分别给明确文案 |
| 大盘（B=6）生成慢 | Worker + loading，UI 不卡；玩家用缩放按钮放大 |
| 搜索无结果 / 接口失败 | 「没有找到题目」/「加载失败，点击重试」 |
| `private` 被非作者访问 | 404 + 「题目不存在或不可访问」 |
| 挑战他人题且对方未开参考答案 | 游戏页无「参考答案」按钮 |
| token 过期 | 401 → 清 token → 提示重新登录 |
| 未登录 | 灰显入口点击提示；直入受保护页跳登录并回跳 |
| 手输地址无棋局进游戏页 | 回难度页（现有守卫） |

## 9. 验收用例

| # | 操作 | 期望 |
|---|---|---|
| 1 | 游客主页 | 「出题」「我的题目」灰；点击出现「该功能需要登录才可以使用」 |
| 2 | 游客走 系统生成 / 自定义 / 搜索挑战 | 全部可玩 |
| 3 | 注册 → 登录 → 刷新 | 登录态保持；灰显项变可用 |
| 4 | 出题（标题 + 两阶段） | 转圈后「出题完成」；「我的题目」立即可见（默认公开） |
| 5 | 我的题目：重命名 / 三态切换 / 参考答案开关 | 列表与预览同步；受保护题搜索列表搜不到、pid 能打开 |
| 6 | 我的题目：编辑（改题面 → 重填答案） | 校验失败有提示；成功后列表与预览同步 |
| 7 | 我的题目：删除 | 二次确认后消失 |
| 8 | 挑战中点参考答案（对方开启） | 遮罩只读答案；「回到挑战」关闭；**已填内容不变** |
| 9 | 挑战中对方未开参考答案 | 无该按钮；胜利判定仍正常（走规则） |
| 10 | 搜索：空 / 关键词 / 20 位 pid / 20 位 uid | 四种分流都正确；私有题仅作者可用 pid 打开 |
| 11 | 热度：同一账号 1 小时内挑战两次 | `play_count` 只 +1；游客挑战不计数 |
| 12 | 任意棋盘（B=6） | 缩放按钮可用、到界变灰；不预设缩放 |
| 13 | 直入 `/my-puzzles` | 跳登录页；登录后回到该页 |
| 14 | `pnpm guard --strict && pnpm typecheck && pnpm test` | 全绿 |

## 10. 非目标（v1 不做）

计时 / 排行 / 难度自动评级 / 多解检测 / 分享链接（分享 pid 即可）/ 题目收藏 / 评论 / 离线缓存 /
深链接到难度页某个 Tab / 忘记密码 / 改密码。

## 11. 决策记录

| # | 决策 |
|---|---|
| 1 | 游客 = 游玩 + 搜索挑战 + 自定义 + 参考答案；注册 = + 出题 + 我的题目管理 |
| 2 | 受限入口**灰显 + 点击提示**（不跳转）；登录入口在主页右上角 |
| 3 | 后端 Cloudflare Functions + D1；PBKDF2-SHA256 + 随机盐；token 有效期 7 天 |
| 4 | `uid` / `pid` 均为 **20 位 base62 随机串**，只由服务端生成 |
| 5 | 可见性三态：`public` / `protected` / `private`（private 非作者 404） |
| 6 | 出题保存默认 `public`；自定义提交默认 `private` |
| 7 | 参考答案 `show_solution` 默认关；挑战时仅在开启时下发答案 |
| 8 | 热度：同一人 1 小时 1 次；**游客不计** |
| 9 | 排序 时间 / 热度；分页 **10/页** |
| 10 | 搜索分流：空 → 公开列表；20 位串 → 先 pid 后 uid；其它 → 标题/uname 模糊 |
| 11 | 编辑：不能改大小；预填题面；**答案必须重填**；编辑页无多余项 |
| 12 | 标题可改，入口在**我的题目**的「重命名」 |
| 13 | 出题/编辑：提交 → 转圈遮罩（校验+上传）→ 完成遮罩 |
| 14 | 预览遮罩**无**挑战按钮；答案预览只在我的题目 |
| 15 | 所有棋盘必须有缩放（R14）；**不设默认缩放**；难度页**不记忆 Tab** |
| 16 | 游戏页显示题目信息（标题 · 出题人 / 系统生成 9×9） |
| 17 | 🔸 系统生成 / 自定义也有参考答案按钮；🔸 出题完成遮罩只有「回到主页」（编辑完成回「我的题目」）；🔸 挖空数前端算 |

## 12. 分批路线

| 批 | 内容 |
|---|---|
| 6A | core：`sameShape` · `parsePuzzle` · `boxSizeOf` · `countBlanks` · 拆 `board/model.ts`+`ops.ts` · `useZoom.zoomActions` · R14 + 文档 · 同名测试 |
| 6B | 后端：schema（4 表）· `wrangler.toml` · `utils/{id,auth,json}` · auth 4 接口 · puzzle 6 接口（含 `/play`） |
| 6C | 前端数据层：types/constants 定稿 · `services/api/*` · `stores/{user,puzzle}` · 守卫 + `/login` · 灰显菜单 · `SecretField` · `useAuth` · `LoginPage` · 主页右上角 |
| 7 | 题目页面：`BoardOverlay` · `PuzzleCard` · `SearchPage` · `MyPuzzlesPage` |
| 8 | 难度页 Tab + `useCustomFlow`（含"提交到我的题目"）+ `useDifficultyFlow` 命名收口 |
| 9 | 管理闭环：出题保存 · 编辑页 · 重命名 · 三态 · 参考答案开关 · 删除 · 游戏页参考答案按钮 |
