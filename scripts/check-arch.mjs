#!/usr/bin/env node
/**
 * 架构守卫 —— 《ARCHITECTURE.md》R1~R15 的可执行版本
 * （R11 = core 必须可测：只查「可测性」—— 纯函数 / rng 注入 / 无模块级可变状态；**不查有没有测试，也不跑测试**）
 * 原则：能机器查的一律查；查不了的明确标为「评审」。
 *
 *   node scripts/check-arch.mjs           红规则（违规 exit 1）
 *
 * 规则 → 检查方式：
 *   R1   红  顶层目录白名单
 *   R2   红  依赖矩阵（逐层校验 src/ 与 functions/；含外部包白名单、全局禁 axios）
 *   R3   红  core 纯度（宿主 / Worker / 随机 / 时间 / console）
 *   R4   红  数据层不写算法（for / forEach / Math.）+ 不碰路由
 *   R5   红  展示层不碰 store / 路由
 *   R6   红  页面只接线（声明 ≤ 10；禁 Math.；依赖由 R2 保证）
 *   R7   红  组合式不写算式（Math.）
 *   R9   红  体量（行数 / core 导出数 / 单函数模块）
 *   R10  红  类型归位（死类型 / Omit·Pick 派生 / constants 不许放类型）
 *   R11  红  core 可测性（模块级可变状态；纯度与 rng 注入由 R3 覆盖）
 *   R12  红  禁桶文件（export * from）
 *   R13  红  types 是叶子（由 R2 矩阵保证，单独报错）
 *   R14  红  有棋盘必须有缩放
 *   R8   红  命名（constants 导出名 UPPER_SNAKE；composables/** 文件名 use*）
 *   R8（其余命名语义）· R15（状态归位）→ 评审
 *
 * 改规矩：先改 ARCHITECTURE.md 的矩阵/规则，再改下面的 MATRIX 与预算常量。
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'

const existDir = d => { try { readdirSync(d); return true } catch { return false } }
if (!existDir('src')) {
    console.error('❌ 找不到 src/，请在项目根目录运行：node scripts/check-arch.mjs')
    process.exit(1)
}

/* ═════════════════ 规则参数（与 ARCHITECTURE.md §二/§三 一一对应） ═════════════════ */

/** R1 顶层白名单（src 内） */
const TOP_ALLOW = new Set([
    'core', 'services', 'render', 'stores', 'composables', 'components',
    'pages', 'constants', 'types', 'styles', 'router', 'main.ts', 'App.vue', 'assets',
])

/**
 * R2 依赖矩阵（就是文档 §二 那张表）
 *   src: 允许的 src 前缀（null = 组合根，允许一切）
 *   pkg: 允许的外部包（[] = 只能相对/@ 内部 + node:）
 */
const MATRIX = {
    'src':             { src: null, pkg: null },                                    // main.ts / App.vue
    'src/constants':   { src: [], pkg: [] },                                        // 叶子：只放值
    'src/types':       { src: ['src/types/', 'src/constants/'], pkg: [] },          // 叶子
    'src/core':        { src: ['src/core/', 'src/constants/', 'src/types/'], pkg: [] },
    'src/services':    { src: ['src/services/', 'src/core/', 'src/constants/', 'src/types/'], pkg: [] },
    'src/render':      { src: ['src/render/', 'src/core/', 'src/constants/', 'src/types/'], pkg: [] },
    'src/stores':      { src: ['src/stores/', 'src/core/', 'src/services/', 'src/constants/', 'src/types/'], pkg: ['vue', 'pinia'] },
    'src/composables': { src: ['src/composables/', 'src/stores/', 'src/render/', 'src/core/', 'src/services/', 'src/constants/', 'src/types/'], pkg: ['vue', 'vue-router'] },
    'src/components':  { src: ['src/components/', 'src/composables/', 'src/constants/', 'src/types/'], pkg: ['vue'] },   // ← 禁 vue-router（RouterLink 是全局组件）
    'src/pages':       { src: ['src/pages/', 'src/components/', 'src/composables/', 'src/stores/', 'src/constants/', 'src/types/'], pkg: ['vue', 'vue-router'] },
    'src/router':      { src: ['src/router/', 'src/stores/', 'src/constants/', 'src/types/'], pkg: ['vue-router'] },
    'functions':       { src: ['functions/', 'src/core/', 'src/constants/', 'src/types/'], pkg: [] },                     // 后端：复用 core，禁 vue/pinia
}

/** 全局禁用依赖（统一 fetch） */
const FORBIDDEN_PKGS = new Set(['axios'])

/** R3 core 纯度 */
const HOST = /\b(window|document|localStorage|sessionStorage|navigator)\b/
const IMPURE = /Math\.random|Date\.now|new Date\(/

/** R4 数据层算法痕迹 */
const ALGO_IN_DATA = /\bfor\s*\(|\.forEach\(|Math\./

/** R7 / R6 算式：组合式与页面都禁 `Math.` */
const MATH = /Math\./

/** R10 工具类型派生禁令 */
const TYPE_DERIVE = /\b(Omit|Pick|Partial|Required|Exclude|Extract)/

/** R12 桶文件 */
const BARREL = /^export\s+\*\s+from/m

/** R8 常量命名（constants 只放值，且全大写） */
const CONST_NAME = /^[A-Z][A-Z0-9_]*$/

/** R8 组合式文件名：src/composables/** 的 .ts 必须 use 开头（纯函数模块登记到 COMPOSABLE_EXEMPT） */
const COMPOSABLE_NAME = /\/use[A-Z]/
const COMPOSABLE_EXEMPT = new Set(['src/composables/puzzle/metaText.ts'])

/** R14 有棋盘就必须有缩放（缩放数据来自 useZoom() 或预览 composable 的 …ZoomActions，经 :zoom-actions 传进棋盘） */
const BOARD_VIEW = /BoardView\.vue/
const ZOOM_ENTRY = /useZoom\(|useBoardZoom\(|zoom-actions=/

/** R9 预算 */
const MAX_LINES = 200
/** 页面允许更长：**单页专用的流程就地写**（见 R6 的 2026-10 调整） */
const MAX_PAGE_LINES = 400
const MAX_CORE_EXPORTS = 8
const MIN_SOLO_MODULE_LINES = 50
const MAX_PAGE_DECLS = 60

/** R10 / E4 预留类型白名单（当前无预留：types/ 的导出都有真实使用点） */
/** R10 / E4 预留类型白名单（当前无预留：types/ 的导出都有真实使用点） */
const RESERVED_TYPES = new Set([])

/** R11 core 可测：模块级可变状态（顶层 let / var / Map / Set）会让用例互相串味 —— 例外登记 E1 */
const CORE_STATE = /^(?:let|var)\s|^const\s+\w+\s*=\s*new\s+(?:Map|Set|WeakMap|WeakSet)\b/m
const CORE_STATE_EXEMPT = new Set(['src/core/sudoku/rules.ts'])

/* ═════════════════ 扫描 ═════════════════ */

const files = []
for (const root of ['src', 'functions'].filter(existDir)) {
    ;(function walk(dir) {
        for (const name of readdirSync(dir)) {
            const p = join(dir, name).split(sep).join('/')
            statSync(p).isDirectory() ? walk(p) : /\.(ts|vue)$/.test(p) && files.push(p)
        }
    })(root)
}

const read = f => readFileSync(f, 'utf8')
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
const importsOf = code => [...code.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)].map(m => m[1])
const under = (file, dir) => file.startsWith(dir + '/')
const isVue = file => file.endsWith('.vue')
const isTest = file => file.endsWith('.test.ts')      // R11：测试随时可补（.test.ts 豁免、守卫不拦），只是不强制
const isCore = file => under(file, 'src/core')
const isPages = file => under(file, 'src/pages')
const dirOf = f => f.slice(0, f.lastIndexOf('/'))

/** import 说明符 → 仓库相对路径；外部包返回 null */
const repoTarget = (file, spec) => {
    if (spec.startsWith('@/')) return 'src/' + spec.slice(2)
    if (spec.startsWith('./') || spec.startsWith('../')) {
        const out = []
        for (const p of (dirOf(file) + '/' + spec).split('/')) {
            if (p === '' || p === '.') continue
            if (p === '..') out.pop()
            else out.push(p)
        }
        return out.join('/')
    }
    return null
}

const layerKeys = Object.keys(MATRIX).sort((a, b) => b.length - a.length)
const layerOf = file => layerKeys.find(k => file === k || under(file, k))

const errors = []
const err = (id, where, msg) => errors.push(`${id} ${where} — ${msg}`)

/* ───── R1 顶层白名单 ───── */
for (const name of readdirSync('src'))
    if (!TOP_ALLOW.has(name)) err('R1', `src/${name}`, '顶层不在白名单（见 ARCHITECTURE.md R1）')

for (const file of files) {
    const code = read(file)
    const bare = stripComments(code)
    const imps = importsOf(code)
    // 行数按"不含结尾换行"计：否则正好 200 行的文件会被多算 1 行
    const lines = code.replace(/\n$/, '').split('\n').length

    /* ───── R9 行数 ───── */
    const lineLimit = isPages(file) ? MAX_PAGE_LINES : MAX_LINES
    if (lines > lineLimit) err('R9', file, `${lines} 行 > ${lineLimit}，请拆文件`)

    /* ───── R2 / R5 / R13 依赖矩阵 ───── */
    if (!isTest(file)) {
        const rule = MATRIX[layerOf(file)]
        if (rule && rule.src !== null) {
            for (const spec of imps) {
                if (FORBIDDEN_PKGS.has(spec)) {
                    err('R2', file, `${spec} 已移除，请用 fetch`)
                    continue
                }
                const target = repoTarget(file, spec)

                if (target === null) {                                   // 外部包
                    if (!spec.startsWith('node:') && !rule.pkg.includes(spec)) {
                        const id = under(file, 'src/components') && spec === 'vue-router' ? 'R5' : 'R2'
                        err(id, file, spec === 'vue-router' && under(file, 'src/components')
                            ? '组件不得引入路由（RouterLink / RouterView 是全局组件）'
                            : `不允许依赖外部包 ${spec}`)
                    }
                    continue
                }
                if (rule.src.some(p => target.startsWith(p))) continue   // 合规

                const id = under(file, 'src/components') && target.startsWith('src/stores/') ? 'R5'
                    : under(file, 'src/types') ? 'R13'
                        : 'R2'
                err(id, file, `越层依赖 ${spec} → ${target}`)
            }
        }
    }

    /* ───── R3 core 纯度 + R9 core 体量 ───── */
    if (isCore(file) && !isTest(file)) {
        if (HOST.test(bare)) err('R3', file, 'core 不得访问宿主对象')
        if (/new Worker/.test(bare)) err('R3', file, 'core 不得创建 Worker')
        if (IMPURE.test(bare)) err('R3', file, 'core 不得用不可控随机/时间，请由调用方注入 rng')
        if (/console\./.test(bare)) err('R3', file, 'core 不得打印')

        /* R11 可测性：模块级可变状态（例外见 E1） */
        if (!CORE_STATE_EXEMPT.has(file) && CORE_STATE.test(bare))
            err('R11', file, 'core 不得有模块级可变状态（顶层 let / Map / Set）→ 用例会互相串味；确有必要请登记例外')

        const exp = (bare.match(/^export (?:const|function|async function)\s/gm) || []).length
        if (exp > MAX_CORE_EXPORTS) err('R9', file, `core 导出 ${exp} 个 > ${MAX_CORE_EXPORTS}`)
        if (exp === 1 && lines < MIN_SOLO_MODULE_LINES)
            err('R9', file, `单函数文件（< ${MIN_SOLO_MODULE_LINES} 行），请并入同域文件`)
    }

    /* ───── R4 数据层 ───── */
    if (under(file, 'src/stores')) {
        if (imps.includes('vue-router')) err('R4', file, 'store 不得碰路由')
        if (ALGO_IN_DATA.test(bare)) err('R4', file, '数据层出现算法，请下沉 core')
    }

    /* ───── R6 页面只接线 ───── */
    if (isPages(file)) {
        const script = code.slice(code.indexOf('<script'), code.indexOf('</script>'))
        // 只数**顶层**声明（行首无缩进）：页面 = 视图接线 + 该页自己的流程
        const decls = (script.match(/^(?:const|function|async function)\s/gm) || []).length
        if (decls > MAX_PAGE_DECLS) err('R6', file, `页面声明 ${decls} 个 > ${MAX_PAGE_DECLS}`)
        if (MATH.test(bare)) err('R6', file, '页面出现算式（Math.），请下沉 core 或放进 composable')
    }

    /* ───── R7 组合式不写算式 ───── */
    if (under(file, 'src/composables') && MATH.test(bare))
        err('R7', file, '组合式出现算式，请下沉 core')

    /* ───── R8 constants 命名 / R10 constants 不放类型 ───── */
    if (under(file, 'src/constants')) {
        for (const m of bare.matchAll(/^export\s+(?:const|function|async function)\s+([A-Za-z_$][\w$]*)/gm))
            if (!CONST_NAME.test(m[1])) err('R8', file, `常量名 ${m[1]} 应为 UPPER_SNAKE_CASE`)
        for (const m of bare.matchAll(/^export\s+(?:interface|type)\s+(\w+)/gm))
            err('R10', file, `${m[1]} 是类型 → 请放 types/（constants 只放值）`)
    }

    /* ───── R8 组合式文件名 ───── */
    if (under(file, 'src/composables') && file.endsWith('.ts')
        && !COMPOSABLE_EXEMPT.has(file) && !COMPOSABLE_NAME.test(file))
        err('R8', file, '组合式文件名必须以 use 开头（纯函数模块请登记 COMPOSABLE_EXEMPT）')

    /* ───── R12 禁桶文件 ───── */
    if (BARREL.test(bare)) err('R12', file, '禁止桶文件（export * from）')

    /* ───── R14 有棋盘就必须有缩放 ───── */
    if (isVue(file) && BOARD_VIEW.test(code) && !ZOOM_ENTRY.test(code))
        err('R14', file, '显示棋盘的页面/组件必须给缩放数据（useZoom(…) 或 :zoom-actions="…"）')
}

/* ═════════════════ R10 types/ 只放「共享」类型 ═════════════════ */

const allCode = stripComments(files.map(read).join('\n'))
const countOf = name => (allCode.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length

for (const file of files.filter(f => under(f, 'src/types'))) {
    const bare = stripComments(read(file))

    bare.split('\n').forEach((line, i) => {
        if (TYPE_DERIVE.test(line))
            err('R10', `${file}:${i + 1}`, '不要用 Omit/Pick/Partial 派生「同形状的第二个名字」，改成函数参数')
    })

    for (const m of bare.matchAll(/^export\s+(?:interface|type)\s+(\w+)/gm)) {
        const name = m[1]
        if (RESERVED_TYPES.has(name)) continue
        if (countOf(name) < 2)
            err('R10', file, `${name} 只有定义没有使用点（共享类型才进 types/；预留的登记到 RESERVED_TYPES）`)
    }
}

/* ═════════════════ 汇总 ═════════════════ */

const tally = list => {
    const map = new Map()
    for (const line of list) {
        const id = line.slice(0, 3)
        map.set(id, (map.get(id) || 0) + 1)
    }
    return [...map].map(([id, n]) => `${id}×${n}`).join('  ')
}

for (const e of errors) console.error('❌ ' + e)
if (errors.length) console.error(`\n违规分布：${tally(errors)}`)
console.log(`\n红规则违规 ${errors.length} 条`)
process.exit(errors.length ? 1 : 0)
