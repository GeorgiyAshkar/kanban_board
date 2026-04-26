import { api } from './client';
import type {
  BoardColumn,
  ChecklistItem,
  HistoryItem,
  Task,
  TaskComment,
  TaskReminder,
  TodayResponse,
} from '../types/task';

export interface PaginatedBoardResponse {
  tasks: Task[];
  columns: BoardColumn[];
  metadata: BoardTaskMetadata[];
  total: number;
  limit: number;
  offset: number;
}

export interface TaskDetailsResponse {
  comments: TaskComment[];
  reminders: TaskReminder[];
  checklist: ChecklistItem[];
  history: HistoryItem[];
  tags: Tag[];
}

export interface ReminderNotificationEvent {
  id: number;
  reminder_id: number;
  task_id: number;
  title: string;
  body?: string;
  status: 'queued' | 'dispatched' | 'acknowledged' | 'failed';
  created_at: string;
  dispatched_at?: string | null;
}

export const fetchTasks = async (): Promise<Task[]> => {
  const { data } = await api.get<Task[]>('/tasks?archived=false&limit=200');
  return data;
};

export const fetchArchivedTasks = async (): Promise<Task[]> => {
  const { data } = await api.get<Task[]>('/tasks?archived=true');
  return data;
};

export const createTask = async (title: string): Promise<Task> => {
  const { data } = await api.post<Task>('/tasks', { title, description: '', priority: 'normal' });
  return data;
};

export const createTaskWithPayload = async (payload: Partial<Task> & { title: string }): Promise<Task> => {
  const { data } = await api.post<Task>('/tasks', payload);
  return data;
};

export const patchTask = async (taskId: number, payload: Partial<Task>): Promise<Task> => {
  const { data } = await api.patch<Task>(`/tasks/${taskId}`, payload);
  return data;
};

export const moveTask = async (taskId: number, board_column_id: number, position?: number): Promise<Task> => {
  const { data } = await api.post<Task>(`/tasks/${taskId}/move`, { board_column_id, position });
  return data;
};

export const fetchColumns = async (): Promise<BoardColumn[]> => {
  const { data } = await api.get<BoardColumn[]>('/columns');
  return data;
};

export const fetchHistory = async (): Promise<HistoryItem[]> => {
  const { data } = await api.get<HistoryItem[]>('/history');
  return data;
};

export const fetchTaskHistory = async (taskId: number): Promise<HistoryItem[]> => {
  const { data } = await api.get<HistoryItem[]>(`/tasks/${taskId}/history`);
  return data;
};

export const fetchTaskComments = async (taskId: number): Promise<TaskComment[]> => {
  const { data } = await api.get<TaskComment[]>(`/tasks/${taskId}/comments`);
  return data;
};

export const addTaskComment = async (taskId: number, text: string): Promise<TaskComment> => {
  const { data } = await api.post<TaskComment>(`/tasks/${taskId}/comments`, { text, author: 'local_user' });
  return data;
};

export const fetchTaskReminders = async (taskId: number): Promise<TaskReminder[]> => {
  const { data } = await api.get<TaskReminder[]>(`/tasks/${taskId}/reminders`);
  return data;
};

export const fetchTaskChecklist = async (taskId: number): Promise<ChecklistItem[]> => {
  const { data } = await api.get<ChecklistItem[]>(`/tasks/${taskId}/checklist`);
  return data;
};

export const patchChecklistItem = async (
  itemId: number,
  payload: Partial<Pick<ChecklistItem, 'is_done' | 'title' | 'position'>>,
): Promise<ChecklistItem> => {
  const { data } = await api.patch<ChecklistItem>(`/checklist/${itemId}`, payload);
  return data;
};

export const addChecklistItem = async (taskId: number, title: string): Promise<ChecklistItem> => {
  const { data } = await api.post<ChecklistItem>(`/tasks/${taskId}/checklist`, { title });
  return data;
};

export const deleteChecklistItem = async (itemId: number): Promise<void> => {
  await api.delete(`/checklist/${itemId}`);
};

export const fetchToday = async (): Promise<TodayResponse> => {
  const { data } = await api.get<TodayResponse>('/today');
  return data;
};

export const archiveTask = async (taskId: number): Promise<Task> => {
  const { data } = await api.post<Task>(`/tasks/${taskId}/archive`);
  return data;
};

export const restoreTask = async (taskId: number): Promise<Task> => {
  const { data } = await api.post<Task>(`/tasks/${taskId}/restore`);
  return data;
};

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface BoardTaskMetadata {
  task_id: number;
  tags: Tag[];
  checklist: ChecklistItem[];
}

export type TaskDateField = 'deadline_at' | 'planned_return_at' | 'created_at' | 'updated_at' | 'done_at';

export interface BoardFilters {
  archiveScope: 'active' | 'archived' | 'all';
  completedScope: 'all' | 'open' | 'completed';
  tagIds: number[];
  columnIds: number[];
  assignee: string;
  dateField: TaskDateField;
  dateFrom?: string;
  dateTo?: string;
}

export const fetchTags = async (): Promise<Tag[]> => {
  const { data } = await api.get<Tag[]>('/tags');
  return data;
};

export const createTag = async (name: string, color = '#64748b'): Promise<Tag> => {
  const { data } = await api.post<Tag>('/tags', { name, color });
  return data;
};

export const patchTag = async (tagId: number, payload: Partial<Tag>): Promise<Tag> => {
  const { data } = await api.patch<Tag>(`/tags/${tagId}`, payload);
  return data;
};

export const fetchTaskTags = async (taskId: number): Promise<Tag[]> => {
  const { data } = await api.get<Tag[]>(`/tasks/${taskId}/tags`);
  return data;
};

export const fetchBoardMetadata = async (taskIds: number[]): Promise<BoardTaskMetadata[]> => {
  if (!taskIds.length) return [];
  const { data } = await api.get<BoardTaskMetadata[]>('/tasks/board-metadata', {
    params: { task_ids: taskIds },
    paramsSerializer: { indexes: null },
  });
  return data;
};

export const fetchBoardData = async (query?: string, filters?: BoardFilters): Promise<PaginatedBoardResponse> => {
  const archived =
    filters?.archiveScope === 'all' ? undefined : filters?.archiveScope === 'archived';
  const isDone =
    filters?.completedScope === 'all' ? undefined : filters?.completedScope === 'completed';
  const { data } = await api.get<PaginatedBoardResponse>('/tasks/board', {
    params: {
      archived,
      is_done: isDone,
      q: query || undefined,
      tag_ids: filters?.tagIds?.length ? filters.tagIds : undefined,
      board_column_ids: filters?.columnIds?.length ? filters.columnIds : undefined,
      assignee: filters?.assignee?.trim() || undefined,
      date_field: filters?.dateField || undefined,
      date_from: filters?.dateFrom || undefined,
      date_to: filters?.dateTo || undefined,
      limit: 200,
      offset: 0,
    },
    paramsSerializer: { indexes: null },
  });
  return data;
};

export const fetchTaskDetails = async (taskId: number): Promise<TaskDetailsResponse> => {
  const { data } = await api.get<TaskDetailsResponse>(`/tasks/${taskId}/details`);
  return data;
};

export const pullReminderNotificationEvents = async (afterId = 0): Promise<ReminderNotificationEvent[]> => {
  const { data } = await api.get<ReminderNotificationEvent[]>('/notifications/events', { params: { after_id: afterId, limit: 20 } });
  return data;
};

export const ackReminderNotificationEvent = async (notificationId: number): Promise<ReminderNotificationEvent> => {
  const { data } = await api.post<ReminderNotificationEvent>(`/notifications/events/${notificationId}/ack`);
  return data;
};

export const addTaskTag = async (taskId: number, tag_id: number): Promise<Tag> => {
  const { data } = await api.post<Tag>(`/tasks/${taskId}/tags`, { tag_id });
  return data;
};

export const removeTaskTag = async (taskId: number, tag_id: number): Promise<void> => {
  await api.delete(`/tasks/${taskId}/tags/${tag_id}`);
};

export const createColumn = async (name: string, position: number): Promise<BoardColumn> => {
  const { data } = await api.post<BoardColumn>('/columns', { name, position, is_system: false });
  return data;
};

export const patchColumn = async (columnId: number, payload: Partial<BoardColumn>): Promise<BoardColumn> => {
  const { data } = await api.patch<BoardColumn>(`/columns/${columnId}`, payload);
  return data;
};
