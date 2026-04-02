import { useMemo } from 'react';
import type { BoardColumn, Task } from '../../types/task';
import type { Tag } from '../../api/tasks';

interface Props {
  columns: BoardColumn[];
  tasks: Task[];
  onOpenTask: (taskId: number) => void;
  onMoveTask: (taskId: number, columnId: number, position: number) => Promise<void>;
  taskTagsByTaskId: Record<number, Tag[]>;
  activeTaskId: number | null;
}

const priorityBg: Record<string, string> = {
  low: 'rgba(34, 197, 94, 0.15)',
  normal: 'rgba(250, 204, 21, 0.18)',
  high: 'rgba(249, 115, 22, 0.18)',
  critical: 'rgba(239, 68, 68, 0.18)',
};

export function BoardView({ columns, tasks, onOpenTask, onMoveTask, taskTagsByTaskId, activeTaskId }: Props) {
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
            const tags = taskTagsByTaskId[task.id] ?? [];
            return (
              <article
                key={task.id}
                className={`card ${activeTaskId === task.id ? 'active' : ''}`}
                style={{ background: priorityBg[task.priority] ?? priorityBg.normal }}
                onClick={() => onOpenTask(task.id)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('taskId', String(task.id));
                }}
              >
                <div className="card-title">{task.title}</div>
                <div className="muted">{task.description?.slice(0, 70) || 'Без описания'}</div>
                <div className="badges">
                  {tags.slice(0, 3).map((tag) => (
                    <span key={tag.id} className="tag-chip" style={{ borderColor: tag.color, color: tag.color }}>
                      {tag.name}
                    </span>
                  ))}
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
