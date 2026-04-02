import { useMemo } from 'react';
import type { BoardColumn, Task } from '../../types/task';

interface Props {
  columns: BoardColumn[];
  tasks: Task[];
  onOpenTask: (taskId: number) => void;
  onMoveTask: (taskId: number, columnId: number, position: number) => Promise<void>;
}

const priorityMeta: Record<string, { label: string; color: string }> = {
  low: { label: 'Низкий', color: '#22c55e' },
  normal: { label: 'Обычный', color: '#3b82f6' },
  high: { label: 'Высокий', color: '#f59e0b' },
  critical: { label: 'Критичный', color: '#ef4444' },
};

export function BoardView({ columns, tasks, onOpenTask, onMoveTask }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const col of columns) map.set(col.id, []);
    for (const task of tasks) {
      if (task.board_column_id && map.has(task.board_column_id)) {
        map.get(task.board_column_id)!.push(task);
      }
    }
    for (const [id, items] of map.entries()) {
      map.set(
        id,
        items.sort((a, b) => a.position - b.position || a.id - b.id),
      );
    }
    return map;
  }, [columns, tasks]);

  return (
    <div className="columns">
      {columns.map((column) => (
        <section
          key={column.id}
          className="column"
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            const taskId = Number(e.dataTransfer.getData('taskId'));
            if (!taskId) return;
            const targetSize = (grouped.get(column.id) ?? []).length;
            await onMoveTask(taskId, column.id, targetSize);
          }}
        >
          <h3>{column.name}</h3>
          {(grouped.get(column.id) ?? []).map((task) => {
            const priority = priorityMeta[task.priority] ?? priorityMeta.normal;
            return (
              <article
                key={task.id}
                className="card"
                onClick={() => onOpenTask(task.id)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('taskId', String(task.id));
                }}
              >
                <div className="card-title">{task.title}</div>
                <div className="muted">{task.description?.slice(0, 70) || 'Без описания'}</div>
                <div className="badges">
                  <span className="badge" style={{ background: priority.color }}>
                    {priority.label}
                  </span>
                  {task.deadline_at && <span className="muted">Дедлайн: {new Date(task.deadline_at).toLocaleDateString()}</span>}
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
