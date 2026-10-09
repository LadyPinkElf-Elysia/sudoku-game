export const PAGE = {
    Game:'game',
    Difficulty: 'difficulty',
    Create:'create',
    Home:'home',
} as const

export type Page = typeof PAGE[keyof typeof PAGE]
