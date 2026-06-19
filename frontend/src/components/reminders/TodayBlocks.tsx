import type { TodayResponse } from '../../types/task';

function TaskList({ title, count }: { title: string; count: number }) {
  return (
    <div className="today-block">
      <h3>{title}</h3>
      <p>Количество: {count}</p>
    </div>
  );
}

export function TodayBlocks({ today }: { today: TodayResponse }) {
  return (
    <div className="today-blocks-grid">
      <TaskList title="Просроченные" count={today.overdue.length} />
      <TaskList title="Дедлайн сегодня" count={today.due_today.length} />
      <TaskList title="Вернуться сегодня" count={today.return_today.length} />
      <TaskList title="Напоминания" count={today.reminders_today.length} />
      <TaskList title="Без движения" count={today.stalled.length} />
    </div>
  );
}
