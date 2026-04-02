import type { TodayResponse } from '../../types/task';

function TaskList({ title, count }: { title: string; count: number }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
      <h3>{title}</h3>
      <p>Количество: {count}</p>
    </div>
  );
}

export function TodayBlocks({ today }: { today: TodayResponse }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <TaskList title="Просроченные" count={today.overdue.length} />
      <TaskList title="Дедлайн сегодня" count={today.due_today.length} />
      <TaskList title="Вернуться сегодня" count={today.return_today.length} />
      <TaskList title="Напоминания" count={today.reminders_today.length} />
      <TaskList title="Без движения" count={today.stalled.length} />
    </div>
  );
}
