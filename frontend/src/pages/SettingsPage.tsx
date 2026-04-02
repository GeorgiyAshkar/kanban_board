import type { BoardColumn } from '../types/task';

export function SettingsPage({ columns }: { columns: BoardColumn[] }) {
  return (
    <section className="history-panel">
      <h3>Настройки</h3>
      <div className="history-row">Управление колонками</div>
      {columns.map((col) => (
        <div key={col.id} className="history-row">{col.position + 1}. {col.name}</div>
      ))}
      <div className="history-row">Формат даты, тема и резервное копирование — в следующем шаге.</div>
    </section>
  );
}
