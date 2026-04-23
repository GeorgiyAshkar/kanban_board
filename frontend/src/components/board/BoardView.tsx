import { useMemo, useState } from 'react';
import type { BoardColumn, ChecklistItem, Task } from '../../types/task';
import type { Tag } from '../../api/tasks';

interface Props {
  columns: BoardColumn[];
  tasks: Task[];
  onOpenTask: (taskId: number) => void;
  onMoveTask: (taskId: number, columnId: number, position: number) => Promise<void>;
  onToggleChecklist: (itemId: number, isDone: boolean, taskId?: number) => Promise<void>;
  taskTagsByTaskId: Record<number, Tag[]>;
  taskChecklistByTaskId: Record<number, ChecklistItem[]>;
}

const priorityBg: Record<string, string> = {
  low: 'rgba(34, 197, 94, 0.15)',
  normal: 'rgba(250, 204, 21, 0.18)',
  high: 'rgba(249, 115, 22, 0.18)',
  critical: 'rgba(239, 68, 68, 0.18)',
};

export function BoardView({
  columns,
  tasks,
  onOpenTask,
  onMoveTask,
  onToggleChecklist,
  taskTagsByTaskId,
  taskChecklistByTaskId,
}: Props) {
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
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
            const checklist = taskChecklistByTaskId[task.id] ?? [];
            const checklistDone = checklist.filter((item) => item.is_done).length;
            return (
              <article
                key={task.id}
                className={`card ${expandedTaskId === task.id ? 'expanded' : ''}`}
                style={{ background: priorityBg[task.priority] ?? priorityBg.normal }}
                onClick={() => onOpenTask(task.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenTask(task.id);
                  }
                }}
              >
                <div className="card-head">
                  <button className="card-title-btn" onClick={() => onOpenTask(task.id)}>
                    {task.title}
                  </button>
                  <div className="card-head-right">
                    <button
                      className="card-expand-btn"
                      draggable
                      onClick={(e) => e.stopPropagation()}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('taskId', String(task.id));
                      }}
                      aria-label="Перетащить задачу"
                      title="Перетащить"
                    >
                      ⠿
                    </button>
                    {tags.slice(0, 2).map((tag) => (
                      <span key={tag.id} className="tag-chip" style={{ borderColor: tag.color, color: tag.color }}>
                        {tag.name}
                      </span>
                    ))}
                    <button
                      className="card-expand-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedTaskId((prev) => (prev === task.id ? null : task.id));
                      }}
                      aria-label={expandedTaskId === task.id ? 'Свернуть карточку' : 'Развернуть карточку'}
                    >
                      {expandedTaskId === task.id ? '▴' : '▾'}
                    </button>
                  </div>
                </div>
                <div className="card-details">
                  <div className="muted">{task.description?.slice(0, 70) || 'Без описания'}</div>
                  <div className="badges">
                    {task.deadline_at && <span className="muted">Дедлайн: {new Date(task.deadline_at).toLocaleDateString()}</span>}
                  </div>
                  {checklist.length > 0 && (
                    <div className="card-checklist">
                      <div className="muted">Чек-лист: {checklistDone}/{checklist.length}</div>
                      <ul className="card-checklist-list">
                        {checklist.map((item) => (
                          <li key={item.id} className="card-checklist-item">
                            <label
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={item.is_done}
                                onChange={() => void onToggleChecklist(item.id, !item.is_done, task.id)}
                              />{' '}
                              {item.title}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
