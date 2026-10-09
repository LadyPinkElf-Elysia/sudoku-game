export const PAGE = {
    Game:'game',
    Difficulty: 'difficulty',
} as const

export type Page = typeof PAGE[keyof typeof PAGE]
