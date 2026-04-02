import type { Task } from '../../types/task';

export function TaskDrawer({ task }: { task?: Task }) {
  if (!task) {
    return <aside style={{ padding: 12, color: '#64748b' }}>Выберите задачу, чтобы увидеть детали.</aside>;
  }

  return (
    <aside style={{ borderLeft: '1px solid #e2e8f0', padding: 16 }}>
      <h2>{task.title}</h2>
      <p>{task.description || 'Без описания'}</p>
      <ul>
        <li>Статус: {task.status}</li>
        <li>Приоритет: {task.priority}</li>
        <li>Дедлайн: {task.deadline_at ?? '—'}</li>
        <li>Вернуться: {task.planned_return_at ?? '—'}</li>
      </ul>
    </aside>
  );
}
