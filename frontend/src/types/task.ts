export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: TaskPriority;
  deadline_at: string | null;
  planned_return_at: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_done: boolean;
  done_at: string | null;
  board_column_id: number | null;
  position: number;
}

export interface BoardColumn {
  id: number;
  name: string;
  position: number;
  color: string;
  is_system: boolean;
}

export interface HistoryItem {
  id: number;
  task_id: number;
  created_at: string;
  action_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  comment?: string;
}

export interface TodayResponse {
  overdue: Task[];
  due_today: Task[];
  return_today: Task[];
  reminders_today: Array<{ id: number; task_id: number; remind_at: string; message?: string }>;
  stalled: Task[];
}

export interface TaskComment {
  id: number;
  task_id: number;
  text: string;
  created_at: string;
  updated_at: string;
  author: string;
}

export interface TaskReminder {
  id: number;
  task_id: number;
  remind_at: string;
  message?: string;
  repeat_type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  is_completed: boolean;
}

export interface ChecklistItem {
  id: number;
  task_id: number;
  title: string;
  position: number;
  is_done: boolean;
}
