import { useMemo } from 'react';
import type { BoardColumn, Task } from '../../types/task';

interface Props {
  columns: BoardColumn[];
  tasks: Task[];
  onOpenTask: (taskId: number) => void;
}

export function BoardView({ columns, tasks, onOpenTask }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const col of columns) map.set(col.id, []);
    for (const task of tasks) {
      if (task.board_column_id && map.has(task.board_column_id)) {
        map.get(task.board_column_id)!.push(task);
      }
    }
    return map;
  }, [columns, tasks]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 16 }}>
      {columns.map((column) => (
        <section key={column.id} style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
          <h3>{column.name}</h3>
          {(grouped.get(column.id) ?? []).map((task) => (
            <article
              key={task.id}
              style={{ background: '#fff', marginTop: 8, padding: 10, borderRadius: 8, cursor: 'pointer' }}
              onClick={() => onOpenTask(task.id)}
            >
              <strong>{task.title}</strong>
              <p style={{ margin: '8px 0 0', color: '#64748b' }}>{task.description.slice(0, 80)}</p>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
