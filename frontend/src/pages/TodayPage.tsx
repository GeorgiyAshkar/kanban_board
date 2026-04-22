import type { Task, TodayResponse } from '../types/task';

function TaskListBlock({ title, tasks }: { title: string; tasks: Task[] }) {
  return (
    <section className="today-block">
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

export function TodayPage({ today }: { today?: TodayResponse }) {
  return (
    <section className="history-panel">
      <h3>Сегодня / Требует внимания</h3>
      {!today ? (
        <p>Загрузка...</p>
      ) : (
        <div className="today-grid">
          <TaskListBlock title="Просроченные" tasks={today.overdue} />
          <TaskListBlock title="Дедлайн сегодня" tasks={today.due_today} />
          <TaskListBlock title="Вернуться сегодня" tasks={today.return_today} />
          <TaskListBlock title="Без движения" tasks={today.stalled} />
          <section className="today-block">
            <h4>Напоминания ({today.reminders_today.length})</h4>
            {today.reminders_today.length === 0 && <p className="muted">Нет напоминаний</p>}
            {today.reminders_today.map((r) => (
              <div key={r.id} className="today-item">
                <strong>Задача #{r.task_id}</strong>
                <span className="muted">{new Date(r.remind_at).toLocaleString()}</span>
              </div>
            ))}
          </section>
        </div>
      )}
    </section>
  );
}
