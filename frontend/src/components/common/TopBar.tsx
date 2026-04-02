interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  setPage: (page: 'board' | 'today' | 'history' | 'archive' | 'settings') => void;
  onCreateTask: () => void;
}

export function TopBar({ query, onQueryChange, setPage, onCreateTask }: Props) {
  return (
    <header className="topbar">
      <span className="brand">▣</span>
      <button className="title-link" onClick={() => setPage('board')}>Мои задачи</button>
      <button onClick={() => setPage('today')}>Сегодня</button>
      <button onClick={() => setPage('history')}>История</button>
      <button onClick={() => setPage('archive')}>Архив</button>
      <button onClick={() => setPage('settings')}>⚙</button>
      <button className="small-btn top-create" onClick={onCreateTask}>+ Новая задача</button>
      <div className="search">
        <input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Поиск..." />
      </div>
    </header>
  );
}
