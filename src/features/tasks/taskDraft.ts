import type { Task } from '@/lib/data/types'

export type TaskDraft = Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'recurrence' | 'tags' | 'subtasks'> & { dueDate: string }
type EditorCycle = { open: boolean; taskId: string | null }

export function shouldInitializeTaskDraft(previous: EditorCycle, next: EditorCycle): boolean {
  return next.open && (!previous.open || previous.taskId !== next.taskId)
}

export function createTaskDraft(task: Task): TaskDraft {
  return { title: task.title, description: task.description, status: task.status, priority: task.priority, dueDate: task.dueDate ?? '', recurrence: task.recurrence ?? 'none', tags: [...(task.tags ?? [])], subtasks: (task.subtasks ?? []).map(item => ({ ...item })) }
}

/** Keep an already-open editor available for copying its draft after remote deletion. */
export function retainTaskEditor(previous: Task | null, requestedId: string | null, found: Task | undefined, scope?: { previous: string | null; current: string | null }): Task | null {
  if (scope && (!scope.current || scope.previous !== scope.current)) return null
  if (requestedId === null) return null
  if (found?.id === requestedId) return found
  return previous?.id === requestedId ? previous : null
}

export function taskDraftConflict(baseline: Task, current: Task | undefined): 'missing' | 'deleted' | 'changed' | null {
  if (!current || current.id !== baseline.id) return 'missing'
  if (current.deletedAt) return 'deleted'
  // Focus minutes, ordering and server timestamps are not part of the editable draft.
  return JSON.stringify(createTaskDraft(baseline)) === JSON.stringify(createTaskDraft(current)) ? null : 'changed'
}
