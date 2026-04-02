import { useMemo } from 'react';
import { BoardView } from '../components/board/BoardView';
import { TaskDrawer } from '../components/task/TaskDrawer';
import type { BoardColumn, Task } from '../types/task';

interface Props {
  columns: BoardColumn[];
  tasks: Task[];
  query: string;
  activeTaskId: number | null;
  setActiveTaskId: (taskId: number | null) => void;
}

export function BoardPage({ columns, tasks, query, activeTaskId, setActiveTaskId }: Props) {
  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }, [tasks, query]);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <main style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
      <BoardView columns={columns} tasks={visibleTasks} onOpenTask={setActiveTaskId} />
      <TaskDrawer task={activeTask} />
    </main>
  );
}
