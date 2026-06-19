import { useMemo, useState } from 'react';
import type { BoardColumn, ChecklistItem, Task } from '../../types/task';
import type { Tag } from '../../api/tasks';
import emojiConfig from '../../emoji_config.json';

type LaneMode = 'none' | 'priority' | 'assignee' | 'project' | 'blocked';

interface Props {
  columns: BoardColumn[];
  laneMode: LaneMode;
  onLaneModeChange: (mode: LaneMode) => void;
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

const priorityDot: Record<string, string> = {
  low: '🟢',
  normal: '🟡',
  high: '🟠',
  critical: '🔴',
};

const priorityLabel: Record<string, string> = {
  critical: 'Критический',
  high: 'Высокий',
  normal: 'Обычный',
  low: 'Низкий',
};

const getAssigneeName = (task: Task): string => {
  const fullName = [task.assignee_last_name, task.assignee_first_name, task.assignee_middle_name].filter(Boolean).join(' ').trim();
  return fullName || task.assignee_email || task.assignee_org || 'Без исполнителя';
};

const getLaneName = (task: Task, laneMode: LaneMode): string => {
  if (laneMode === 'priority') return priorityLabel[task.priority] ?? task.priority;
  if (laneMode === 'assignee') return getAssigneeName(task);
  if (laneMode === 'project') return task.project_id?.trim() || 'Без проекта';
  if (laneMode === 'blocked') return task.is_blocked ? 'Заблокировано' : 'Без блокировки';
  return 'Все задачи';
};

const buildLanes = (tasks: Task[], laneMode: LaneMode): string[] => {
  if (laneMode === 'none') return ['Все задачи'];
  if (laneMode === 'priority') return ['Критический', 'Высокий', 'Обычный', 'Низкий'].filter((lane) => tasks.some((task) => getLaneName(task, laneMode) === lane));
  if (laneMode === 'blocked') return ['Заблокировано', 'Без блокировки'].filter((lane) => tasks.some((task) => getLaneName(task, laneMode) === lane));
  return Array.from(new Set(tasks.map((task) => getLaneName(task, laneMode)))).sort((a, b) => a.localeCompare(b, 'ru'));
};

const toCardBackground = (colorMark?: string | null, fallback?: string): string => {
  if (!colorMark) return fallback ?? priorityBg.normal;
  const normalized = colorMark.trim();
  if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(normalized)) return fallback ?? priorityBg.normal;
  const hex = normalized.length === 4
    ? `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
    : normalized;
  const value = hex.slice(1);
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.18)`;
};

export function BoardView({
  columns,
  laneMode,
  onLaneModeChange,
  tasks,
  onOpenTask,
  onMoveTask,
  onToggleChecklist,
  taskTagsByTaskId,
  taskChecklistByTaskId,
}: Props) {
  const nowMs = Date.now();
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

  const lanes = buildLanes(tasks, laneMode);

  const renderColumn = (column: BoardColumn, laneTasks: Task[], laneName?: string) => {
    const columnTasks = (grouped.get(column.id) ?? []).filter((task) => laneTasks.some((laneTask) => laneTask.id === task.id));
    const wipLimit = column.wip_limit ?? null;
    const isWipExceeded = wipLimit != null && columnTasks.length > wipLimit;
    const slaHours = column.sla_hours ?? null;
    const slaBreaches = slaHours == null
      ? 0
      : columnTasks.filter((task) => {
        if (task.is_done || task.is_archived) return false;
        const updatedAtMs = new Date(task.updated_at).getTime();
        return nowMs - updatedAtMs > slaHours * 60 * 60 * 1000;
      }).length;

    return (
      <section
        key={`${laneName ?? 'all'}-${column.id}`}
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
        <h3>
          {column.name}{' '}
          <span className="muted">
            {columnTasks.length}
            {wipLimit != null ? ` / ${wipLimit}` : ''}
          </span>
          {isWipExceeded && (
            <span className="badge badge-danger">
              WIP limit
            </span>
          )}
          {slaBreaches > 0 && (
            <span className="badge badge-accent">
              SLA: {slaBreaches}
            </span>
          )}
        </h3>
        {columnTasks.map((task) => {
          const tags = taskTagsByTaskId[task.id] ?? [];
          const checklist = taskChecklistByTaskId[task.id] ?? [];
          const checklistDone = checklist.filter((item) => item.is_done).length;
          const emojiHint = task.emoji ? emojiConfig[task.emoji as keyof typeof emojiConfig] : undefined;
          const taskSlaBreached = slaHours != null
            && !task.is_done
            && !task.is_archived
            && (nowMs - new Date(task.updated_at).getTime() > slaHours * 60 * 60 * 1000);
          const spent = task.spent_minutes ?? 0;
          const estimate = task.estimate_minutes ?? 0;
          const timeOverrun = estimate > 0 && spent > estimate;
          return (
            <article
              key={task.id}
              className={`card ${expandedTaskId === task.id ? 'expanded' : ''}`}
              style={{ background: toCardBackground(task.color_mark, priorityBg[task.priority] ?? priorityBg.normal) }}
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
                  <div className="card-controls-grid">
                    <span className="priority-indicator" title={`Приоритет: ${task.priority}`}>
                      {priorityDot[task.priority] ?? priorityDot.normal}
                    </span>
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
                    {task.emoji ? (
                      <span className="badge card-emoji-badge" title={emojiHint ?? task.emoji}>
                        {task.emoji}
                      </span>
                    ) : (
                      <span className="card-emoji-placeholder" aria-hidden="true" />
                    )}
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
                  {tags.slice(0, 2).map((tag) => (
                    <span key={tag.id} className="tag-chip" style={{ borderColor: tag.color, color: tag.color }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="card-details">
                <div className="muted">{task.description?.slice(0, 70) || 'Без описания'}</div>
                <div className="badges">
                  {task.deadline_at && <span className="muted">Дедлайн: {new Date(task.deadline_at).toLocaleDateString()}</span>}
                  {task.is_blocked && <span className="badge badge-danger" title={task.block_reason ?? 'Задача заблокирована'}>Блокер</span>}
                  {taskSlaBreached && <span className="badge badge-accent">SLA просрочен</span>}
                  {task.is_blocked && task.block_reason && <span className="muted">🚧 {task.block_reason}</span>}
                  {estimate > 0 && (
                    <span className={`time-pill ${timeOverrun ? 'overrun' : ''}`}>⏱ {spent}/{estimate} мин</span>
                  )}
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
    );
  };

  return (
    <div className="board-view">
      <div className="board-toolbar">
        <label>
          Дорожки
          <select className="select-styled" value={laneMode} onChange={(e) => onLaneModeChange(e.target.value as LaneMode)}>
            <option value="none">Без дорожек</option>
            <option value="priority">По приоритету</option>
            <option value="assignee">По исполнителю</option>
            <option value="project">По проекту</option>
            <option value="blocked">По блокировкам</option>
          </select>
        </label>
        <span className="muted">Дорожки помогают разделять поток по приоритетам, командам, проектам или блокировкам.</span>
      </div>
      {laneMode === 'none' ? (
        <div className="columns">
          {columns.map((column) => renderColumn(column, tasks))}
        </div>
      ) : (
        <div className="swimlane-board">
          {lanes.map((lane) => {
            const laneTasks = tasks.filter((task) => getLaneName(task, laneMode) === lane);
            return (
              <section key={lane} className="swimlane">
                <div className="swimlane-title">
                  <span>{lane}</span>
                  <span className="muted">{laneTasks.length}</span>
                </div>
                <div className="columns swimlane-columns">
                  {columns.map((column) => renderColumn(column, laneTasks, lane))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
