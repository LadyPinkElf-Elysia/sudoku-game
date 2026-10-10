#!/usr/bin/env node
/**
 * 架构守卫 —— 《ARCHITECTURE.md》R1~R13 的可执行版本
 *
 *   node scripts/check-arch.mjs           红规则（违规 exit 1）
 *   node scripts/check-arch.mjs --strict  额外考核 R11（core 必须有同名测试）
 *
 * 规则 → 检查方式：
 *   R1 R2 R3 R4 R5 R6 R9 R13  红（脚本强制）
 *   R7                        红（Math.）+ 评审（实例注入）
 *   R10                       红（死类型 / Omit·Pick 派生）+ 评审（extends 用法）
 *   R11                       黄（仅 --strict）
 *   R8 R12                    评审
 *
 * 改规矩：先改 ARCHITECTURE.md，再改下面「规则参数」区。
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'

try {
    readdirSync('src')
} catch {
    console.error('❌ 找不到 src/，请在项目根目录运行：node scripts/check-arch.mjs')
    process.exit(1)
}

const strict = process.argv.includes('--strict')

/* ═════════════════ 规则参数 ═════════════════ */

/** R1 顶层白名单 */
const TOP_ALLOW = new Set([
    'core', 'services', 'render', 'stores', 'composables', 'components',
    'pages', 'constants', 'types', 'styles', 'router', 'main.ts', 'App.vue', 'assets',
])

/** R2 core 的依赖白名单 / 黑名单 */
const CORE_ALLOW = [/^@\/(constants|types|core)\//, /^\.{1,2}\//]
const CORE_BAN = [
    /^vue$/, /^pinia$/, /^vue-router$/, /^axios$/,
    /^@\/(stores|services|render|composables|components|pages)\//,
]

/** R13 types 是叶子层 */
const TYPES_ALLOW = [/^\.{1,2}\//, /^@\/types\//, /^@\/constants\//]

/** R6 页面只接线 */
const PAGE_ALLOW = /^(@\/(components|composables|stores|constants|types)\/|vue$|vue-router$)/

/** R3 core 不得触碰的宿主能力 / 不得使用的不可控随机·时间 */
const HOST = /\b(window|document|localStorage|sessionStorage|navigator)\b/
const IMPURE = /Math\.random|Date\.now|new Date\(/

/** R4 数据层不得出现的算法痕迹 */
const ALGO_IN_DATA = /\bfor\s*\(|\.forEach\(|Math\./

/** R10 禁止用工具类型派生「同形状的第二个名字」 */
const TYPE_DERIVE = /\b(Omit|Pick|Partial|Required|Exclude|Extract)</

/** R9 预算 */
const MAX_LINES = 200
const MAX_CORE_EXPORTS = 8
const MIN_SOLO_MODULE_LINES = 50   // 「唯一入口模块」的最小行数
const MAX_PAGE_DECLS = 10

/** R10 / E4 预留类型白名单：还没有使用点的类型登记在这里；真用起来后删掉登记 */
const RESERVED_TYPES = new Set(['Page', 'User', 'SearchResult', 'Puzzle'])

/* ═════════════════ 扫描 ═════════════════ */

const files = []
;(function walk(dir) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name).split(sep).join('/')
        statSync(p).isDirectory() ? walk(p) : /\.(ts|vue)$/.test(p) && files.push(p)
    }
})('src')

const read = f => readFileSync(f, 'utf8')
/** 去掉注释后再扫描，避免注释里的词误报 */
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
const importsOf = code => [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1])
const under = (file, dir) => file.startsWith(dir + '/')
const isTest = file => file.endsWith('.test.ts')
const isCore = file => under(file, 'src/core')

const errors = []
const warns = []
const err = (id, where, msg) => errors.push(`${id} ${where} — ${msg}`)
const warn = (id, where, msg) => warns.push(`${id} ${where} — ${msg}`)

/* ───── R1 顶层白名单 ───── */
for (const name of readdirSync('src'))
    if (!TOP_ALLOW.has(name)) err('R1', `src/${name}`, '顶层不在白名单（见 ARCHITECTURE.md R1）')

for (const file of files) {
    const code = read(file)
    const bare = stripComments(code)
    const imps = importsOf(code)
    const lines = code.split('\n').length

    /* ───── R9 单文件行数 ───── */
    if (lines > MAX_LINES) err('R9', file, `${lines} 行 > ${MAX_LINES}，请拆文件`)

    /* ───── R2 / R3 core 纯度 + R9 core 导出数（测试文件允许 import vitest） ───── */
    if (isCore(file) && !isTest(file)) {
        for (const i of imps) {
            if (CORE_BAN.some(re => re.test(i))) err('R2', file, `core 不得依赖 ${i}`)
            else if (!CORE_ALLOW.some(re => re.test(i))) err('R2', file, `core 未登记依赖 ${i}`)
        }
        if (HOST.test(bare)) err('R3', file, 'core 不得访问宿主对象')
        if (/new Worker/.test(bare)) err('R3', file, 'core 不得创建 Worker')
        if (IMPURE.test(bare)) err('R3', file, 'core 不得用不可控随机/时间，请由调用方注入 rng')
        if (/console\./.test(bare)) err('R3', file, 'core 不得打印')

        const exp = (bare.match(/^export (?:const|function|async function)\s/gm) || []).length
        if (exp > MAX_CORE_EXPORTS) err('R9', file, `core 导出 ${exp} 个 > ${MAX_CORE_EXPORTS}`)
        if (exp === 1 && lines < MIN_SOLO_MODULE_LINES)
            err('R9', file, `单函数文件（< ${MIN_SOLO_MODULE_LINES} 行），请并入同域文件`)
    }

    /* ───── R4 数据层不写算法 ───── */
    if (under(file, 'src/stores')) {
        if (imps.includes('vue-router')) err('R4', file, 'store 不得碰路由')
        if (ALGO_IN_DATA.test(bare)) err('R4', file, '数据层出现算法，请下沉 core')
    }

    /* ───── R5 展示层不碰状态 ───── */
    if (under(file, 'src/components') && imps.some(i => i.startsWith('@/stores')))
        err('R5', file, '组件不得直接读 store，请由页面传 props')

    /* ───── R6 页面只接线 ───── */
    if (under(file, 'src/pages')) {
        const script = code.slice(code.indexOf('<script'), code.indexOf('</script>'))
        const decls = (script.match(/^\s*(const|function|async function)\s/gm) || []).length
        if (decls > MAX_PAGE_DECLS) err('R6', file, `页面声明 ${decls} 个 > ${MAX_PAGE_DECLS}`)
        for (const i of imps) if (!PAGE_ALLOW.test(i)) err('R6', file, `页面不得依赖 ${i}`)
    }

    /* ───── R7 组合式不写算式 ───── */
    if (under(file, 'src/composables') && /Math\./.test(bare))
        err('R7', file, '组合式出现算式，请下沉 core')

    /* ───── R13 types 是叶子层 ───── */
    if (under(file, 'src/types'))
        for (const i of imps)
            if (!TYPES_ALLOW.some(re => re.test(i))) err('R13', file, `types 层不得依赖 ${i}`)

    /* ───── R11 core 必须可测（仅 --strict，黄） ───── */
    if (strict && isCore(file) && !isTest(file) && !files.includes(file.replace(/\.ts$/, '.test.ts')))
        warn('R11', file, '缺少同名测试')
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

    for (const m of bare.matchAll(/^export (?:interface|type) (\w+)/gm)) {
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
for (const w of warns) console.warn('⚠️  ' + w)
if (errors.length) console.error(`\n违规分布：${tally(errors)}`)
if (warns.length) console.warn(`提醒分布：${tally(warns)}`)
console.log(`\n红规则违规 ${errors.length} 条；黄提醒 ${warns.length} 条`)
process.exit(errors.length ? 1 : 0)
