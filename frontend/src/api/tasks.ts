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

export const fetchTasks = async (): Promise<Task[]> => {
  const { data } = await api.get<Task[]>('/tasks?archived=false');
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

export const moveTask = async (taskId: number, board_column_id: number, status?: string, position?: number): Promise<Task> => {
  const { data } = await api.post<Task>(`/tasks/${taskId}/move`, { board_column_id, status, position });
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

export const patchChecklistItem = async (itemId: number, is_done: boolean): Promise<ChecklistItem> => {
  const { data } = await api.patch<ChecklistItem>(`/checklist/${itemId}`, { is_done });
  return data;
};

export const addChecklistItem = async (taskId: number, title: string): Promise<ChecklistItem> => {
  const { data } = await api.post<ChecklistItem>(`/tasks/${taskId}/checklist`, { title });
  return data;
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
