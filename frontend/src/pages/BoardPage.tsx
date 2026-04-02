import { useMemo } from 'react';
import { BoardView } from '../components/board/BoardView';
import { TaskDrawer } from '../components/task/TaskDrawer';
import type { BoardColumn, ChecklistItem, HistoryItem, Task, TaskComment, TaskReminder } from '../types/task';

interface Props {
  columns: BoardColumn[];
  tasks: Task[];
  query: string;
  activeTaskId: number | null;
  setActiveTaskId: (taskId: number | null) => void;
  comments: TaskComment[];
  reminders: TaskReminder[];
  checklist: ChecklistItem[];
  taskHistory: HistoryItem[];
  onAddComment: (text: string) => Promise<void>;
  onToggleChecklist: (itemId: number, isDone: boolean) => Promise<void>;
  onAddChecklist: (title: string) => Promise<void>;
}

export function BoardPage({
  columns,
  tasks,
  query,
  activeTaskId,
  setActiveTaskId,
  comments,
  reminders,
  checklist,
  taskHistory,
  onAddComment,
  onToggleChecklist,
  onAddChecklist,
}: Props) {
  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }, [tasks, query]);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <div className="board-layout">
      <BoardView columns={columns} tasks={visibleTasks} onOpenTask={setActiveTaskId} />
      <TaskDrawer
        task={activeTask}
        comments={comments}
        reminders={reminders}
        checklist={checklist}
        history={taskHistory}
        onAddComment={onAddComment}
        onToggleChecklist={onToggleChecklist}
        onAddChecklist={onAddChecklist}
      />
    </div>
  );
}
