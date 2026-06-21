import { useMemo, useState } from 'react';
import type { BoardColumn, ChecklistItem, Task } from '../../types/task';
import type { Tag } from '../../api/tasks';
import emojiConfig from '../../emoji_config.json';

type LaneMode = 'none' | 'priority' | 'assignee' | 'project' | 'blocked' | 'serviceClass' | 'workType';
type ViewMode = 'board' | 'table' | 'calendar';

interface Props {
  columns: BoardColumn[];
  laneMode: LaneMode;
  onLaneModeChange: (mode: LaneMode) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
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

const serviceClassLabel: Record<string, string> = {
  expedite: 'Срочный',
  fixed_date: 'Фиксированная дата',
  standard: 'Стандартный',
  intangible: 'Улучшение',
};

const workTypeLabel: Record<string, string> = {
  feature: 'Фича',
  bug: 'Баг',
  support: 'Поддержка',
  ops: 'Операции',
  research: 'Исследование',
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
  if (laneMode === 'serviceClass') return serviceClassLabel[task.service_class ?? 'standard'] ?? 'Стандартный';
  if (laneMode === 'workType') return workTypeLabel[task.work_type ?? 'feature'] ?? 'Фича';
  return 'Все задачи';
};

const buildLanes = (tasks: Task[], laneMode: LaneMode): string[] => {
  if (laneMode === 'none') return ['Все задачи'];
  if (laneMode === 'priority') return ['Критический', 'Высокий', 'Обычный', 'Низкий'].filter((lane) => tasks.some((task) => getLaneName(task, laneMode) === lane));
  if (laneMode === 'blocked') return ['Заблокировано', 'Без блокировки'].filter((lane) => tasks.some((task) => getLaneName(task, laneMode) === lane));
  if (laneMode === 'serviceClass') return ['Срочный', 'Фиксированная дата', 'Стандартный', 'Улучшение'].filter((lane) => tasks.some((task) => getLaneName(task, laneMode) === lane));
  if (laneMode === 'workType') return ['Баг', 'Поддержка', 'Операции', 'Исследование', 'Фича'].filter((lane) => tasks.some((task) => getLaneName(task, laneMode) === lane));
  return Array.from(new Set(tasks.map((task) => getLaneName(task, laneMode)))).sort((a, b) => a.localeCompare(b, 'ru'));
};


const toDateKey = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const formatDate = (value: string | null): string => (value ? new Date(value).toLocaleDateString('ru-RU') : '—');

const getColumnName = (columns: BoardColumn[], task: Task): string => {
  const column = columns.find((item) => item.id === task.board_column_id);
  return column?.name ?? task.status;
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
  viewMode,
  onViewModeChange,
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
              Лимит НЗР
            </span>
          )}
          {slaBreaches > 0 && (
            <span className="badge badge-accent">
              Просрочка: {slaBreaches}
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
                  {task.service_class === 'expedite' && <span className="badge badge-danger" title={task.policy_note ?? 'Ускоренный класс обслуживания'}>Срочный</span>}
                  {task.service_class === 'fixed_date' && <span className="badge badge-accent" title={task.policy_note ?? 'Фиксированная дата'}>Фиксированная дата</span>}
                  {task.work_type && <span className="badge">{workTypeLabel[task.work_type] ?? task.work_type}</span>}
                  {task.is_blocked && <span className="badge badge-danger" title={task.block_reason ?? 'Задача заблокирована'}>Блокер</span>}
                  {taskSlaBreached && <span className="badge badge-accent">Срок просрочен</span>}
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

  const renderTableView = () => {
    const sortedTasks = [...tasks].sort((a, b) => {
      const aDeadline = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
      const bDeadline = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
      return aDeadline - bDeadline || a.position - b.position || a.id - b.id;
    });

    return (
      <div className="board-table-wrap">
        <table className="board-table">
          <thead>
            <tr>
              <th>Задача</th>
              <th>Колонка</th>
              <th>Приоритет</th>
              <th>Исполнитель</th>
              <th>Проект</th>
              <th>Дедлайн</th>
              <th>Чек-лист</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => {
              const checklist = taskChecklistByTaskId[task.id] ?? [];
              const done = checklist.filter((item) => item.is_done).length;
              return (
                <tr key={task.id} onClick={() => onOpenTask(task.id)}>
                  <td>
                    <strong>{task.title}</strong>
                    <div className="muted">{task.description?.slice(0, 90) || 'Без описания'}</div>
                  </td>
                  <td>{getColumnName(columns, task)}</td>
                  <td>{priorityDot[task.priority]} {priorityLabel[task.priority] ?? task.priority}</td>
                  <td>{getAssigneeName(task)}</td>
                  <td>{task.project_id || '—'}</td>
                  <td>{formatDate(task.deadline_at)}</td>
                  <td>{checklist.length ? `${done}/${checklist.length}` : '—'}</td>
                  <td>
                    <div className="badges">
                      {task.is_blocked && <span className="badge badge-danger">Блокер</span>}
                      {task.is_done && <span className="badge badge-success">Готово</span>}
                      {task.service_class === 'expedite' && <span className="badge badge-danger">Срочный</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCalendarView = () => {
    const tasksWithDates = tasks.filter((task) => task.deadline_at || task.planned_return_at);
    const dateKeys = Array.from(
      new Set(tasksWithDates.flatMap((task) => [toDateKey(task.deadline_at), toDateKey(task.planned_return_at)].filter((key): key is string => Boolean(key)))),
    ).sort();

    if (dateKeys.length === 0) {
      return <div className="empty-state">Нет задач с дедлайном или датой возврата. Укажите даты в карточках, чтобы увидеть календарный план.</div>;
    }

    return (
      <div className="calendar-view">
        {dateKeys.map((dateKey) => {
          const dayTasks = tasksWithDates.filter((task) => toDateKey(task.deadline_at) === dateKey || toDateKey(task.planned_return_at) === dateKey);
          return (
            <section key={dateKey} className="calendar-day">
              <h3>{new Date(`${dateKey}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}</h3>
              {dayTasks.map((task) => (
                <button key={task.id} className="calendar-task" onClick={() => onOpenTask(task.id)}>
                  <span>{priorityDot[task.priority] ?? priorityDot.normal} {task.title}</span>
                  <span className="muted">{toDateKey(task.deadline_at) === dateKey ? 'Дедлайн' : 'Возврат'} · {getColumnName(columns, task)}</span>
                </button>
              ))}
            </section>
          );
        })}
      </div>
    );
  };

  const renderBoardContent = () => laneMode === 'none' ? (
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
  );

  return (
    <div className="board-view">
      <div className="board-toolbar">
        <label>
          Вид
          <select className="select-styled" value={viewMode} onChange={(e) => onViewModeChange(e.target.value as ViewMode)}>
            <option value="board">Канбан-доска</option>
            <option value="table">Таблица</option>
            <option value="calendar">Календарь</option>
          </select>
        </label>
        <label>
          Дорожки
          <select className="select-styled" value={laneMode} onChange={(e) => onLaneModeChange(e.target.value as LaneMode)} disabled={viewMode !== 'board'}>
            <option value="none">Без дорожек</option>
            <option value="priority">По приоритету</option>
            <option value="assignee">По исполнителю</option>
            <option value="project">По проекту</option>
            <option value="blocked">По блокировкам</option>
            <option value="serviceClass">По классу обслуживания</option>
            <option value="workType">По типу работ</option>
          </select>
        </label>
        <span className="muted">Переключайтесь между доской, таблицей и календарем: так удобнее планировать дедлайны, проверять загрузку и находить задачи.</span>
      </div>
      {viewMode === 'board' && renderBoardContent()}
      {viewMode === 'table' && renderTableView()}
      {viewMode === 'calendar' && renderCalendarView()}
    </div>
  );
}
