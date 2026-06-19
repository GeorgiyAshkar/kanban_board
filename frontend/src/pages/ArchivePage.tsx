import type { Task } from '../types/task';

export function ArchivePage({ tasks, onRestore }: { tasks: Task[]; onRestore: (id: number) => Promise<void> }) {
  return (
    <section className="history-panel">
      <h3>Архив</h3>
      {tasks.length === 0 && <p>В архиве пока нет задач.</p>}
      {tasks.map((task) => (
        <div key={task.id} className="history-row inline-actions">
          <span>{task.title}</span>
          <span>
            <button className="small-btn" onClick={() => onRestore(task.id)}>Восстановить</button>
          </span>
        </div>
      ))}
    </section>
  );
}
