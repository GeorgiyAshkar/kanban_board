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

export interface AnalyticsTrendPoint {
  period_start: string;
  period_end: string;
  completed_tasks: number;
  created_tasks: number;
  overdue_open_tasks: number;
  wip_open_tasks: number;
  avg_lead_time_hours?: number | null;
  avg_cycle_time_hours?: number | null;
}

export interface AnalyticsSummary {
  window_start: string;
  window_end: string;
  total_tasks: number;
  created_tasks: number;
  completed_tasks: number;
  overdue_open_tasks: number;
  wip_open_tasks: number;
  velocity_per_period: number;
  avg_lead_time_hours?: number | null;
  avg_cycle_time_hours?: number | null;
}

export interface AnalyticsReport {
  summary: AnalyticsSummary;
  trend: AnalyticsTrendPoint[];
}

export interface BackupMetadata {
  exported_at: string;
  app_version: string;
  task_count: number;
  column_count: number;
  tag_count: number;
}

export interface BackupTaskItem {
  title: string;
  description: string;
  status: string;
  priority: Task['priority'];
  deadline_at?: string | null;
  planned_return_at?: string | null;
  position: number;
  board_column_name?: string | null;
  tags: string[];
}

export interface BackupPayload {
  metadata: BackupMetadata;
  columns: BoardColumn[];
  tags: Tag[];
  tasks: BackupTaskItem[];
}

export interface BackupImportResponse {
  dry_run: boolean;
  mode: 'merge' | 'replace_all';
  tasks_to_import: number;
  tags_to_create: number;
  columns_to_create: number;
  created_tasks: number;
  created_tags: number;
  created_columns: number;
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

export const fetchAnalyticsReport = async (
  days = 30,
  bucket: 'day' | 'week' = 'week',
): Promise<AnalyticsReport> => {
  const { data } = await api.get<AnalyticsReport>('/analytics/report', { params: { days, bucket } });
  return data;
};

const backupEndpointMap = {
  json: '/backup/export.json',
  csv: '/backup/export.csv',
  archive: '/backup/archive',
} as const;

const fallbackFileName = (kind: 'json' | 'csv' | 'archive') => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (kind === 'json') return `kanban_backup_${stamp}.json`;
  if (kind === 'csv') return `kanban_tasks_${stamp}.csv`;
  return `kanban_backup_${stamp}.zip`;
};

const extractFileName = (contentDisposition: string | undefined, kind: 'json' | 'csv' | 'archive') => {
  if (!contentDisposition) return fallbackFileName(kind);
  const match = /filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i.exec(contentDisposition);
  const encoded = match?.[1] ?? match?.[2];
  if (!encoded) return fallbackFileName(kind);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
};

export const downloadBackup = async (kind: 'json' | 'csv' | 'archive'): Promise<void> => {
  const response = await api.get<Blob>(backupEndpointMap[kind], { responseType: 'blob' });
  const filename = extractFileName(response.headers['content-disposition'], kind);
  const blob = response.data as unknown as Blob;
  const objectUrl = window.URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.URL.revokeObjectURL(objectUrl);
  }
};

export const importBackup = async (
  backup: BackupPayload,
  options?: { dryRun?: boolean; mode?: 'merge' | 'replace_all' },
): Promise<BackupImportResponse> => {
  const { data } = await api.post<BackupImportResponse>('/backup/import', {
    backup,
    dry_run: options?.dryRun ?? false,
    mode: options?.mode ?? 'merge',
  });
  return data;
};
