#!/usr/bin/env node
/**
 * 架构守卫：《ARCHITECTURE.md》R1~R12 的可执行版本
 * node scripts/check-arch.mjs           只跑红规则
 * node scripts/check-arch.mjs --strict  额外考核 R11（测试存在性）
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'

const strict = process.argv.includes('--strict')
const TOP_ALLOW = new Set(['core','services','render','stores','composables','components','pages','constants','types','styles','router','main.ts','App.vue','assets'])
const CORE_BAN = [/^vue$/,/^pinia$/,/^vue-router$/,/^@\/(stores|services|render|composables|components|pages)\//]
const CORE_ALLOW = [/^@\/(constants|types)\//, /^@\/core\//, /^\.{1,2}\//]
const PAGE_ALLOW = /^(@\/(components|composables|stores|constants|types|render|services)\/|vue$|vue-router$)/

const files = []
;(function walk(dir){ for (const n of readdirSync(dir)) {
    const p = join(dir, n).split(sep).join('/')
    statSync(p).isDirectory() ? walk(p) : /\.(ts|vue)$/.test(p) && files.push(p)
}})('src')

const errors = [], warns = []
const imp = c => [...c.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1])
const under = (f, d) => f.startsWith(d + '/')

for (const name of readdirSync('src'))                       // R1 顶层白名单
    if (!TOP_ALLOW.has(name)) errors.push(`R1 src/${name} — 顶层不在白名单`)

for (const file of files) {
    const code = readFileSync(file, 'utf8'), imps = imp(code)
    const lines = code.split('\n').length

    if (lines > 200) errors.push(`R9 ${file} — ${lines} 行 > 200，请拆或登记例外`)   // R9

    if (under(file, 'src/core')) {                                                // R2/R3
        for (const i of imps)
            if (CORE_BAN.some(r => r.test(i)))    errors.push(`R2 ${file} — core 不得 import ${i}`)
            else if (!CORE_ALLOW.some(r => r.test(i))) errors.push(`R2 ${file} — core 未登记依赖 ${i}`)
        if (/\b(window|document|localStorage|navigator)\b/.test(code)) errors.push(`R3 ${file} — core 不得访问宿主对象`)
        if (/new Worker/.test(code))            errors.push(`R3 ${file} — core 不得创建 Worker`)
        if (/Math\.random|Date\.now|new Date\(/.test(code)) errors.push(`R3 ${file} — core 不得用不可控随机/时间`)
        if (/console\./.test(code))             errors.push(`R3 ${file} — core 不得打印`)
    }
    if (under(file, 'src/stores')) {                                              // R4
        if (imps.includes('vue-router'))        errors.push(`R4 ${file} — store 不得碰路由`)
        if (/\bfor\s*\(|\.forEach\(|Math\./.test(code)) errors.push(`R4 ${file} — 数据层出现算法，请下沉 core`)
    }
    if (under(file, 'src/components') && imps.some(i => i.startsWith('@/stores')))
        errors.push(`R5 ${file} — 组件不得直接读 store`)
    if (under(file, 'src/composables') && /Math\./.test(code))
        errors.push(`R7 ${file} — 组合式出现算式，请下沉 core`)
    if (under(file, 'src/pages')) {                                               // R6
        const script = code.slice(code.indexOf('<script'), code.indexOf('</script>'))
        const decls = (script.match(/^\s*(const|function|async function)\s/gm) || []).length
        if (decls > 10) errors.push(`R6 ${file} — 页面声明 ${decls} 个 > 10`)
        for (const i of imps) if (!PAGE_ALLOW.test(i)) errors.push(`R6 ${file} — 页面未登记依赖 ${i}`)
    }
    const exp = (code.match(/^export (?:const|function|async function)\s/gm) || []).length
    if (exp === 1 && lines < 50) errors.push(`R9 ${file} — 单函数文件，请并入同域文件`)   // R9/E2
    if (exp > 8) errors.push(`R9 ${file} — 导出 ${exp} 个 > 8`)

    if (strict && under(file, 'src/core') && !file.endsWith('.test.ts') &&     // R11
        !files.includes(file.replace(/\.ts$/, '.test.ts')))
        warns.push(`W-R11 ${file} — 缺少同名测试`)
}

for (const e of errors) console.error('❌ ' + e)
for (const w of warns)  console.warn('⚠️ ' + w)
console.log(`\n红规则违规 ${errors.length} 条，黄提醒 ${warns.length} 条`)
process.exit(errors.length ? 1 : 0)
