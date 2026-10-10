/** Cloudflare 绑定（与 wrangler.toml 的 [[d1_databases]].binding 一致） */
export interface Env {
    DB: D1Database
}
