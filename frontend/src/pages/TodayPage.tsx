import { useEffect, useMemo, useRef, useState } from 'react';
import type { Task, TodayResponse } from '../types/task';

type TodaySectionKey = 'overdue' | 'due_today' | 'return_today' | 'reminders_today' | 'stalled';

type TodaySection = {
  key: TodaySectionKey;
  title: string;
  description: string;
  count: number;
};

function TaskListBlock({ title, tasks }: { title: string; tasks: Task[] }) {
  return (
    <section className="today-block today-active-block">
      <h4>{title} ({tasks.length})</h4>
      {tasks.length === 0 && <p className="muted">Нет задач</p>}
      {tasks.map((task) => (
        <div key={task.id} className="today-item">
          <strong>{task.title}</strong>
          <span className="muted">{task.deadline_at ? new Date(task.deadline_at).toLocaleString() : task.status}</span>
        </div>
      ))}
    </section>
  );
}

function ReminderListBlock({ today }: { today: TodayResponse }) {
  return (
    <section className="today-block today-active-block">
      <h4>Напоминания ({today.reminders_today.length})</h4>
      {today.reminders_today.length === 0 && <p className="muted">Нет напоминаний</p>}
      {today.reminders_today.map((reminder) => (
        <div key={reminder.id} className="today-item">
          <strong>Задача #{reminder.task_id}</strong>
          <span className="muted">{new Date(reminder.remind_at).toLocaleString()}</span>
          {reminder.message && <span>{reminder.message}</span>}
        </div>
      ))}
    </section>
  );
}

const getDefaultSection = (today?: TodayResponse): TodaySectionKey => {
  if (!today) return 'overdue';
  if (today.overdue.length > 0) return 'overdue';
  if (today.due_today.length > 0) return 'due_today';
  if (today.return_today.length > 0) return 'return_today';
  if (today.reminders_today.length > 0) return 'reminders_today';
  return 'stalled';
};

export function TodayPage({ today }: { today?: TodayResponse }) {
  const [selectedSection, setSelectedSection] = useState<TodaySectionKey>(() => getDefaultSection(today));
  const didApplyInitialSection = useRef(Boolean(today));

  useEffect(() => {
    if (!today || didApplyInitialSection.current) return;
    setSelectedSection(getDefaultSection(today));
    didApplyInitialSection.current = true;
  }, [today]);

  const sections = useMemo<TodaySection[]>(() => {
    if (!today) return [];
    return [
      { key: 'overdue', title: 'Просроченные', description: 'Задачи с истекшим дедлайном', count: today.overdue.length },
      { key: 'due_today', title: 'Дедлайн сегодня', description: 'Задачи, которые нужно завершить сегодня', count: today.due_today.length },
      { key: 'return_today', title: 'Вернуться сегодня', description: 'Отложенные задачи, к которым пора вернуться', count: today.return_today.length },
      { key: 'reminders_today', title: 'Напоминания', description: 'Запланированные напоминания на сегодня', count: today.reminders_today.length },
      { key: 'stalled', title: 'Без движения', description: 'Задачи, которые давно не обновлялись', count: today.stalled.length },
    ];
  }, [today]);

  const activeSection = sections.find((section) => section.key === selectedSection) ?? sections[0];

  return (
    <section className="history-panel">
      <h3>Сегодня / Требует внимания</h3>
      {!today ? (
        <p>Загрузка...</p>
      ) : (
        <div className="today-panel">
          <div className="today-selector-card">
            <label>
              Что показать
              <select className="select-styled" value={activeSection.key} onChange={(event) => setSelectedSection(event.target.value as TodaySectionKey)}>
                {sections.map((section) => (
                  <option key={section.key} value={section.key}>
                    {section.title} ({section.count})
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">{activeSection.description}</p>
            <div className="today-summary-row" aria-label="Сводка по блокам Сегодня">
              {sections.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  className={`today-summary-chip ${section.key === activeSection.key ? 'active' : ''}`}
                  onClick={() => setSelectedSection(section.key)}
                >
                  <span>{section.title}</span>
                  <strong>{section.count}</strong>
                </button>
              ))}
            </div>
          </div>

          {activeSection.key === 'overdue' && <TaskListBlock title="Просроченные" tasks={today.overdue} />}
          {activeSection.key === 'due_today' && <TaskListBlock title="Дедлайн сегодня" tasks={today.due_today} />}
          {activeSection.key === 'return_today' && <TaskListBlock title="Вернуться сегодня" tasks={today.return_today} />}
          {activeSection.key === 'stalled' && <TaskListBlock title="Без движения" tasks={today.stalled} />}
          {activeSection.key === 'reminders_today' && <ReminderListBlock today={today} />}
        </div>
      )}
    </section>
  );
}
