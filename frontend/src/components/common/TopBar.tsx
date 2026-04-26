import type { BoardColumn } from '../../types/task';
import type { BoardFilters, Tag } from '../../api/tasks';

export interface SavedBoardFilter {
  id: string;
  name: string;
  query: string;
  filters: BoardFilters;
}

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  filters: BoardFilters;
  onFiltersChange: (next: BoardFilters) => void;
  tags: Tag[];
  columns: BoardColumn[];
  savedFilters: SavedBoardFilter[];
  onApplySavedFilter: (filterId: string) => void;
  onSaveCurrentFilter: (name: string) => void;
  onDeleteSavedFilter: (filterId: string) => void;
  setPage: (page: 'board' | 'today' | 'history' | 'archive' | 'settings') => void;
  onCreateTask: () => void;
}

export function TopBar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  tags,
  columns,
  savedFilters,
  onApplySavedFilter,
  onSaveCurrentFilter,
  onDeleteSavedFilter,
  setPage,
  onCreateTask,
}: Props) {
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
      <details className="filters-panel">
        <summary>Фильтры</summary>
        <div className="filters-grid">
          <label>
            Архив
            <select
              value={filters.archiveScope}
              onChange={(e) => onFiltersChange({ ...filters, archiveScope: e.target.value as BoardFilters['archiveScope'] })}
            >
              <option value="active">Только активные</option>
              <option value="archived">Только архив</option>
              <option value="all">Все</option>
            </select>
          </label>
          <label>
            Выполнение
            <select
              value={filters.completedScope}
              onChange={(e) => onFiltersChange({ ...filters, completedScope: e.target.value as BoardFilters['completedScope'] })}
            >
              <option value="all">Все</option>
              <option value="open">Не завершённые</option>
              <option value="completed">Завершённые</option>
            </select>
          </label>
          <label>
            Исполнитель
            <input
              value={filters.assignee}
              placeholder="ФИО / email / org"
              onChange={(e) => onFiltersChange({ ...filters, assignee: e.target.value })}
            />
          </label>
          <label>
            Поле даты
            <select
              value={filters.dateField}
              onChange={(e) => onFiltersChange({ ...filters, dateField: e.target.value as BoardFilters['dateField'] })}
            >
              <option value="deadline_at">Дедлайн</option>
              <option value="planned_return_at">Вернуть в работу</option>
              <option value="created_at">Создано</option>
              <option value="updated_at">Обновлено</option>
              <option value="done_at">Завершено</option>
            </select>
          </label>
          <label>
            От даты
            <input type="date" value={filters.dateFrom ?? ''} onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })} />
          </label>
          <label>
            До даты
            <input type="date" value={filters.dateTo ?? ''} onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value || undefined })} />
          </label>
          <label>
            Колонки
            <select
              multiple
              value={filters.columnIds.map(String)}
              onChange={(e) => {
                const next = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
                onFiltersChange({ ...filters, columnIds: next });
              }}
            >
              {columns.map((column) => (
                <option key={column.id} value={column.id}>{column.name}</option>
              ))}
            </select>
          </label>
          <label>
            Теги
            <select
              multiple
              value={filters.tagIds.map(String)}
              onChange={(e) => {
                const next = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
                onFiltersChange({ ...filters, tagIds: next });
              }}
            >
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="saved-filters-row">
          <button
            className="small-btn"
            onClick={() => {
              const name = window.prompt('Название фильтра');
              if (name?.trim()) onSaveCurrentFilter(name.trim());
            }}
          >
            Сохранить текущий фильтр
          </button>
          {savedFilters.map((item) => (
            <span key={item.id} className="saved-filter-chip">
              <button className="small-btn" onClick={() => onApplySavedFilter(item.id)}>{item.name}</button>
              <button className="small-btn" onClick={() => onDeleteSavedFilter(item.id)} aria-label={`Удалить фильтр ${item.name}`}>✕</button>
            </span>
          ))}
        </div>
      </details>
    </header>
  );
}
