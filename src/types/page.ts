import type { PAGE } from "@/constants/pages";

export type Page = typeof PAGE[keyof typeof PAGE]