
export interface TodoApi {
  editTodo: (id: number) => void
  updateTodo: (id: number, text: string) => void
  removeTodo: (id: number) => void
  toggleTodo: (id: number) => void
}

export const TODO_API_KEY = Symbol('todoApi')   // ★ Symbol 防止 key 冲突