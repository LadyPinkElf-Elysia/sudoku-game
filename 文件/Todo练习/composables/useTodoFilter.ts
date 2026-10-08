import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Todos } from '../types/TodoType'

export interface UseTodoFilterReturn {
  hideCompleted: Ref<boolean>
  visibleTodos: ComputedRef<Todos>
  toggle: () => void
}

export const useTodoFilter = (todos: Ref<Todos>): UseTodoFilterReturn => {
  const hideCompleted = ref<boolean>(true)

  const visibleTodos = computed<Todos>(() =>
    hideCompleted.value
      ? todos.value.filter(t => !t.done)
      : todos.value
  )

  const toggle = (): void => {
    hideCompleted.value = !hideCompleted.value
  }

  return { hideCompleted, visibleTodos, toggle }
}