import type { HistoryItem } from '../types/task';

export function HistoryPage({ items }: { items: HistoryItem[] }) {
  return (
    <section className="history-panel">
      <h3>Глобальная история</h3>
      {items.map((item) => (
        <div key={item.id} className="history-row history-row-compact">
          {new Date(item.created_at).toLocaleString()} — задача #{item.task_id} — {item.action_type}
        </div>
      ))}
    </section>
  );
}
