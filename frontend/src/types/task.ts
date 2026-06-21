export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type TaskServiceClass = 'standard' | 'fixed_date' | 'expedite' | 'intangible';
export type TaskWorkType = 'feature' | 'bug' | 'support' | 'ops' | 'research';

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
  row_version: number;
  is_archived: boolean;
  is_done: boolean;
  done_at: string | null;
  board_column_id: number | null;
  position: number;
  project_id?: string | null;
  color_mark?: string | null;
  estimate_minutes?: number | null;
  spent_minutes?: number | null;
  assignee_last_name?: string | null;
  assignee_first_name?: string | null;
  assignee_middle_name?: string | null;
  assignee_phone?: string | null;
  assignee_email?: string | null;
  assignee_org?: string | null;
  emoji?: string | null;
  is_blocked?: boolean;
  block_reason?: string | null;
  blocker_task_id?: number | null;
  service_class?: TaskServiceClass;
  work_type?: TaskWorkType;
  policy_note?: string | null;
}


export interface AssigneeProfile {
  id: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  phone: string;
  email: string;
  org: string;
}

export interface BoardColumn {
  id: number;
  name: string;
  canonical_status: string;
  position: number;
  color: string;
  wip_limit?: number | null;
  sla_hours?: number | null;
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
  done_at?: string | null;
  created_at?: string;
}
