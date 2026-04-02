interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  setPage: (page: 'board' | 'today' | 'history' | 'archive' | 'settings') => void;
}

export function TopBar({ query, onQueryChange, setPage }: Props) {
  return (
    <header className="topbar">
      <span className="brand">▣</span>
      <span className="title">Мои задачи</span>
      <button onClick={() => setPage('today')}>Сегодня</button>
      <button onClick={() => setPage('history')}>История</button>
      <button onClick={() => setPage('archive')}>Архив</button>
      <button onClick={() => setPage('settings')}>⚙</button>
      <div className="search">
        <input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Поиск..." />
      </div>
    </header>
  );
}
