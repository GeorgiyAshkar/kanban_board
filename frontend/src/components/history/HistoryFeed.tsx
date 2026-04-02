import type { HistoryItem } from '../../types/task';

export function HistoryFeed({ items }: { items: HistoryItem[] }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((item) => (
        <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
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
