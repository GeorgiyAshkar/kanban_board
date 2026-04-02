interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onCreateTask: () => void;
  setPage: (page: 'board' | 'today' | 'history' | 'archive' | 'settings') => void;
}

export function TopBar({ query, onQueryChange, onCreateTask, setPage }: Props) {
  return (
    <header style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <strong style={{ marginRight: 12 }}>Kanban Board</strong>
      <button onClick={onCreateTask}>Новая задача</button>
      <input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Поиск" />
      <button onClick={() => setPage('today')}>Сегодня</button>
      <button onClick={() => setPage('history')}>История</button>
      <button onClick={() => setPage('archive')}>Архив</button>
      <button onClick={() => setPage('settings')}>Настройки</button>
      <button onClick={() => setPage('board')}>Доска</button>
    </header>
  );
}
