import type { HistoryItem } from '../../types/task';

export function HistoryFeed({ items }: { items: HistoryItem[] }) {
  return (
    <div className="history-feed">
      {items.map((item) => (
        <div key={item.id} className="history-feed-card">
          <div>{new Date(item.created_at).toLocaleString()}</div>
          <div>{item.action_type}</div>
          <small>
            {item.field_name} {item.old_value} → {item.new_value}
          </small>
        </div>
      ))}
    </div>
  );
}
