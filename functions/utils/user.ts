import type { User } from '../../src/types/user'

/** 对外暴露的用户字段（收口在此：不泄露 password_hash / salt） */
export const toPublicUser = (uid: string, uname: string): User => ({ uid, uname, isGuest: false })
