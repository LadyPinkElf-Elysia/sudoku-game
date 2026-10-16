# 数独项目 · 详细讲解系列（docs/）

> **这套文档是"教材"**：从**知识点**讲起 → 落到**本项目真实代码** → 讲清**为什么这么写 / 坑在哪**。
> 目标读者：**接手这份代码但很多代码不是自己写的人**（包括半年后的自己）。所以每个概念都会：先讲"它是什么、为什么有它" → 再指到项目里的**具体文件和函数** → 最后给"自己动手改一遍会怎样"。

## 0. 与其它文档的关系（别搞混）

| 文档 | 定位 | 什么时候看 |
|---|---|---|
| `docs/`（本系列） | **教材**：从零讲知识点 → 逐文件逐函数 | 想**真正读懂**某段代码时 |
| `PROJECT.md` | **全景导读**：项目怎么串起来（框架/数据流/决策） | 想知道"整体长什么样" |
| `CODE-GUIDE.md` | **分层导读**：`pages / components / composables / stores / core` 为什么这么写 | 想知道"逻辑该放哪一层" |
| `ARCHITECTURE.md` | **硬约束**：R1~R15 / E1~E8（守卫可执行） | 改代码前确认"没破坏规矩" |
| `REQUIREMENTS.md` | **要什么**：功能清单 + 验收 + 决策存档 | 想知道"为什么要这个功能" |

## 1. 阅读路线（建议按顺序，也可按需跳）

```
第 0 步（没基础就先看这三册知识点）
  00-工具链与语言基础.md     ← Node / pnpm / 包 / 构建 / ESM / TypeScript
  01-Vue3 与浏览器平台.md     ← 响应式 / 组件 / canvas / Worker / localStorage
  02-后端与数据基础.md        ← HTTP / SQL / D1 / 哈希 / 会话 / 限流

第 1 步（建立结构认知）
  03-架构分层与守卫.md        ← 为什么分五层、R1~R15 逐条什么意思

第 2 步（自下而上读代码，与依赖方向一致）
  04-core 逐文件详解.md       ← 规则/生成/求解/解析/分页/文案
  05-状态层 stores 逐文件.md
  06-组合式 composables 逐文件.md
  07-组件与页面逐文件.md
  08-适配器 render 与 services.md   ← canvas 渲染 / HTTP / Worker / 本地存储（D1 与后端适配器见 02 册）

第 3 步（把上面串起来）
  09-数据流与端到端链路.md     ← 一条功能从点击到落库，逐跳标注
  10-工程化与调试.md          ← 命令 / 配置 / 调试 / 报错速查 / 发布

第 4 步（学"怎么从规则推出实现"——方法论，可迁移到任何项目）
  11-从规则到实现：数独拆解全流程.md  ← 规则→判定→类型→函数→算法→状态→校验→界面→表
```

## 1.5 进度表（写一册登记一册）

| 册 | 文件 | 状态 |
|---|---|---|
| 导航 | `README.md` | ✅ 完成 |
| 00 | `00-工具链与语言基础.md` | ✅ 完成（Node/pnpm/monorepo · 模块与构建 · JS 16 个知识点 · TS 13 个知识点 · 报错速查） |
| 01 | `01-Vue3 与浏览器平台.md` | ✅ 完成（Vue 响应式/组件/指令 12 节 · Pinia · canvas/DPR/ResizeObserver/watchEffect/localStorage/Worker） |
| 02 | `02-后端与数据基础.md` | ✅ 完成（Pages Functions 约定路由 · 全部 12 个接口表 · wrangler 逐行 · HTTP/状态码 · SQL·D1 五表逐字段 · 注入与白名单 · upsert · 分页 · **PBKDF2/盐/恒定时间比较/限流/拒绝采样** · 八个接口逐段精读 · 权限矩阵） |
| 03 | `03-架构分层与守卫.md` | ✅ 完成（为什么要分层 · 五层+三适配器判据 · **依赖矩阵逐格解释** · **R1~R15 逐条**（为什么/机器怎么查/违规长什么样/怎么改）· 例外 E1~E8 · **守卫脚本逐段解剖**（含动态 import 盲点）· 归位原则 · 三个实战演练） |
| 04 | `04-core 逐文件详解.md` | ✅ 完成（**17 个文件全解**：读法 · 依赖图 · array · metrics · model · ops · zoom · shape · parse · rules + **groups（组单元表 + 三扫描）** · tracker · solver · multiSolver · generator · digger · derive · message · page · 26 题自测 · 速查表） |
| 05 | `05-状态层 stores 逐文件.md` | ✅ 完成（**三个 store 全解**：判据与全景 · game.ts 19 小节（状态清单/派生/历史机制/**两个开局入口（`startGame`/`startInput`）**/落子四守卫/就地改对象/resetHistory 截断未来/return 分组）· puzzle.ts（loadPage 收口/缓存与失效/一次性提示）· user.ts 补完 · **五条共性模式 + 六类不该进 store 的数据 + 数据流总图** · 20 题自测）（**2026-10 归位**：`startCreate`/`startSolve`/`startFromTexts` 移出 store → composable；`cheat` 更名 `fillSolution`） |
| 06 | `06-组合式 composables 逐文件.md` | ✅ 完成（**20 个 `use*` 组合式 + 1 个例外模块 `metaText.ts` 全解**：全景/依赖图/三条判据 · useClipboard · usePuzzleExport · metaText（E8）· **useListQuery** · **useAuth** · useAccountMenu · useAccountPanel · **useZoom/useBoardCanvas** · **game 七件（含 useStartFromTexts：挑战开局从 store 归位，§5.7）** · **puzzle 五件** · **useSolveFlow** · **编排层五条共性** · 26 题自测 · 速查表） |
| 07 | `07-组件与页面逐文件.md` | ✅ 完成（**15 组件 + 13 页面全解**：TextAction（`:is` 切换/禁用契约）· Flex · EyeGlyph · FormField（五形态 + DOM 值类型还原）· Overlay（Teleport/插槽/五块可缺省）· SecretValue · RenameText（nextTick focus/Esc 与 blur）· NumberPad · PagerBar 三形态（索引语义归一化）· ListSection（泛型 + 三插槽）· MyPuzzleRow（可写 computed）· PuzzleCard · **BoardView** · 13 个页面逐个接线核对 · 横向模式与两份检查清单 · 25 题自测） |
| 08 | `08-适配器 render 与 services.md` | ✅ 完成（**render/ 五文件**（geometry 几何 / board 适配与绘制 / paint 单格 / layer 线层纯工厂 / dirty 脏格 + 重绘决策）：DPR / **整盘与局量两种重绘** / 类型全进 `types/render.ts` / getClickPos · prefs · **client（四出口 + 401 广播 + 非 JSON 翻译）** · session · userApi · puzzleApi（`qs` / `offsetOf`）· worker（`reference lib` + 随机注入 + 错误回传）· workerClient（两端契约图）· **适配器四条纪律** + 两份检查清单 · 20 题自测）（D1 与后端适配器见 02 册） |
| 09 | `09-数据流与端到端链路.md` | ✅ 完成（**12 条端到端链路**逐跳标注（生成/落子/提示/历史/导出/出题/编辑/自定义/登录五子链/搜索挑战/求解/行内改动）· **症状→链路排查法**（5 步顺序 + 10 种症状对照表 + 推理演示）· 12 题自测 · 链路速查） |
| 11 | `11-从规则到实现：数独拆解全流程.md` | ✅ 完成（**方法论教程**：八步拆解法 · 规则判定化（R-1~R-9，含"**负需求**：不要求唯一解"）· 领域词汇表 · 数据结构四决策（`lock`/三种表示/`Position`/二维）· **规则→判定函数**（两两比较→Map 分组、`sameShape`、EPS、`validatePuzzle` 四步顺序）· **规则→算法**（模式盘公式手算验证、四类保性质变换、`keepRatioOf`、`digPuzzle` 三阶段、MRV + tracker、**"不要求唯一解"这笔减法三笔账**）· 状态机与四守卫 · 快照栈 · 校验阶梯 · UI 参数从规则算 · 表结构逐字段 · **反向验证 8 题** · 八步法检查表 · 四个"拆不动的症状"+ 一个常见混淆 · 12 题自测） |

> 每册结尾都有「**本册自测**」；答不上来就说明那一册还没吃透，建议回看对应小节再往下走。

## 1.6 2026-10 同步记录（本轮改动 → 落在哪几册）

**代码侧（四处）**：`core/sudoku/groups.ts` 新建（组单元表 + 计数缓冲）· `core/sudoku/rules.ts` 收身（178 → 95 行）· `render/` 拆五文件并**去掉模块级状态**（整盘 / 局量双路径重绘）· `stores/game.ts` 归位（`startCreate` / `startSolve` 删除、`startFromTexts` → `composables/game/useStartFromTexts.ts`、`cheat` → `fillSolution`，169 → 146 行）· 类型归位（`types/render.ts` ＋`BoardGeometry`/`CellFonts`/`FrameState`/`RedrawMode`；`types/sudoku.ts` ＋`GroupTable`/`GroupScanner`）。

**文档侧（同步点）**：

| 册 / 文档 | 本轮同步了什么 |
|---|---|
| `04-core` | ＋`groups.ts` 一节（组表 + 三扫描共用计数缓冲）· `rules.ts` 行数与职责更新 · `keepRatioOf` 的"能否生成"结论 |
| `05-stores` | §2.12 整节重写（`startFromTexts` → composable）· §2.13 删两个薄入口的取舍表 · §2.18 `fillSolution` 命名说明 · §2.7 冲突增量"暂不做"的技术账 · 行数 169 → 146 |
| `06-composables` | ＋§5.7 `useStartFromTexts`（含判据表）· §5.8 横向总结 ＋1 行 · §5.6 DEV 按钮（`fillSolution`）· §6.1/§6.4 调用点改组合式 · 自测 ＋第 22 题（26 题） |
| `08-render 与 services` | render 五文件逐一讲（geometry / paint / layer / dirty / board）· 整盘 vs 局量重绘 · 类型归位 |
| `09-数据流` | 「挑战」链路的开局步骤改指 `useStartFromTexts` · 编辑链路改 `startInput(GAME_MODE.Create, …)` |
| `11-拆解全流程` | 全文按"数独**不要求唯一解**"修正（R-5 为负需求）· `keepRatioOf` 反证实测 · 八步法 |
| `01-Vue3` | DEV 按钮的 `onClick: gameStore.fillSolution` · 重绘链补"整盘 / 脏格由渲染器决定" · 修一处旧笔误 |
| `PROJECT.md` | 决策 ＋14（store 归位）· §6.1 动作清单 · §7 ＋useStartFromTexts · 顶部 ＋2026-10 归位映射注 |
| `ARCHITECTURE.md` | v1.9.16 变更记录 · E2 改 `boardGeometryOf` / `prepareCanvas` · §九 types 索引补新类型 · §六 归位原则 ＋useStartFromTexts |
| `CODE-GUIDE.md` | §2.5/§2.6 动作清单 · §3.7 ＋"从 store 归位出来的业务"一形 · §5.2 求解链的 `startInput(Solve, …)` |
| `REQUIREMENTS.md` | 决策 ＋80（三处归位 + 性能重排）· §0 术语表的挑战动作改指 `useStartFromTexts` · 决策 71 加归位旁注 |

> **约定**：以后每次"归位 / 拆文件 / 改名"都照这一节登记 —— **一册一节，读者能按图找到**。

## 2. 每一册的写法（**按"数据类型"调整**）

**知识点型册（00~03）—— 五段式**：

1. **知识点**：这个概念是什么、为什么存在（配最小示例，不依赖本项目）。
2. **本项目为什么用它**：在哪些文件用、解决什么问题。
3. **逐段剖析真实代码**：贴出项目里的真实片段（并给文件路径 + 行号范围），逐行说明。
4. **动手改一遍**：故意写错会怎样（报错信息 / 守卫拦截 / 运行期表现）。
5. **自测**：3~5 个问题，能答上说明这一册看懂了。

**逐文件型册（04~08）—— "每个文件四问"**：

1. **它是谁**：一句话职责 + 依赖谁、被谁依赖。
2. **逐段解释**：真实代码 + "为什么这么写"。
3. **边界与坑**：传错参数 / 空值 / 并发会怎样。
4. **谁在用它**：调用方（前向引用到别的册）。

> 04（core 17 个文件）· 05（3 个 store）· 06（20 个 composable + `metaText`）· 07（15 组件 + 13 页面）· 08（适配器文件）都用这个骨架；每册再加一节**横向共性 + 自测**。

**链路型册（09）—— "每链四段"**：`【触发】→ 逐跳（层 + 文件 + 函数）→【落点】→【如果断了】`，最后给一节**症状→排查法**。

**工程型册（10）—— "能直接照做"**：命令逐条 / 配置逐项 / 调试手段按问题类型分 / 报错速查表 / 发布步骤。

> **共同点（每一册都一样）**：**① 只讲这个项目里真实存在的东西；② 每条规则都说清"为什么"；③ 每册结尾都有自测。**

## 3. 怎么"配着代码看"（强烈建议）

- 左边开 `docs/`，右边开对应源文件；
- 看到 `packages/…`、`src/…` 这类路径时直接跳过去；
- 命令行随时验证：

```bash
pnpm guard                # 架构守卫（红线）
pnpm typecheck            # 前端类型检查（含 .vue）
pnpm typecheck:functions  # 后端类型检查
pnpm build                # 完整构建（不含 guard）
pnpm dev                  # 起前端（/api 代理到 8788）
```

## 4. 目录里没写进本系列的东西

- 需求细节、验收用例、决策编号 → 看 `REQUIREMENTS.md`；
- 约束条文（R1~R15）与例外登记（E1~E8）→ 看 `ARCHITECTURE.md`；
- 本系列只讲"**这些代码是什么意思、为什么这么写**"。
