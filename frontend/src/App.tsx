import { useEffect, useState } from 'react';
import type { BoardFilters } from './api/tasks';
import { TopBar, type SavedBoardFilter } from './components/common/TopBar';
import { NewTaskModal } from './components/common/NewTaskModal';
import { useBoardQueries } from './hooks/useBoardQueries';
import { useReminderNotifications } from './hooks/useReminderNotifications';
import { useTaskMutations } from './hooks/useTaskMutations';
import { ArchivePage } from './pages/ArchivePage';
import { BoardPage } from './pages/BoardPage';
import { HistoryPage } from './pages/HistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TodayPage } from './pages/TodayPage';
import { useUIStore } from './store/uiStore';
import fontConfig from './font_config.json';
import './styles.css';

type Page = 'board' | 'today' | 'history' | 'archive' | 'reports' | 'settings';
const SAVED_FILTERS_KEY = 'kanban.saved-filters.v1';

const defaultBoardFilters: BoardFilters = {
  archiveScope: 'active',
  completedScope: 'all',
  tagIds: [],
  columnIds: [],
  assignee: '',
  dateField: 'deadline_at',
};

export default function App() {
  const [page, setPage] = useState<Page>('board');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filters, setFilters] = useState<BoardFilters>(defaultBoardFilters);
  const [savedFilters, setSavedFilters] = useState<SavedBoardFilter[]>(() => {
    const raw = window.localStorage.getItem(SAVED_FILTERS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SavedBoardFilter[];
    } catch {
      return [];
    }
  });
  const [reportDays, setReportDays] = useState(30);
  const [reportBucket, setReportBucket] = useState<'day' | 'week'>('week');
  const { query, setQuery, activeTaskId, setActiveTaskId } = useUIStore();

  const {
    boardQuery,
    archivedQuery,
    historyQuery,
    todayQuery,
    tagsQuery,
    analyticsQuery,
    taskDetailsQuery,
    taskTagsByTaskId,
    taskChecklistByTaskId,
  } = useBoardQueries(query, activeTaskId, filters, reportDays, reportBucket);

  const {
    onCreateTask,
    onMoveTask,
    onAddComment,
    onToggleChecklist,
    onAddChecklist,
    onEditChecklist,
    onDeleteChecklist,
    onSaveTask,
    onAddTag,
    onRemoveTag,
    onCreateTagAndAdd,
    onArchiveTask,
    onRestoreTask,
    onCreateColumn,
    onRenameColumn,
    onUpdateColumnColor,
    onCreateTag,
    onUpdateTag,
  } = useTaskMutations({ activeTaskId, setActiveTaskId });

  useReminderNotifications();

  useEffect(() => {
    window.localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(savedFilters));
  }, [savedFilters]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--font-title-base', fontConfig.font_title);
    root.style.setProperty('--font-column-title-base', fontConfig.font_column_title);
    root.style.setProperty('--font-card-title-base', fontConfig.font_card_title);
    root.style.setProperty('--font-section-title-base', fontConfig.font_section_title);
    root.style.setProperty('--font-text-base', fontConfig.font_text);
    root.style.setProperty('--font-meta-base', fontConfig.font_meta);
    root.style.setProperty('--font-button-base', fontConfig.font_button);
    root.style.setProperty('--font-drawer-title-base', fontConfig.font_drawer_title);
  }, []);

  return (
    <div className="app-shell">
      <TopBar
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onFiltersChange={setFilters}
        tags={tagsQuery.data ?? []}
        columns={boardQuery.data?.columns ?? []}
        savedFilters={savedFilters}
        onApplySavedFilter={(filterId) => {
          const selected = savedFilters.find((item) => item.id === filterId);
          if (!selected) return;
          setQuery(selected.query);
          setFilters(selected.filters);
        }}
        onSaveCurrentFilter={(name) => {
          setSavedFilters((prev) => [
            { id: `${Date.now()}`, name, query, filters: { ...filters } },
            ...prev,
          ]);
        }}
        onDeleteSavedFilter={(filterId) => {
          setSavedFilters((prev) => prev.filter((item) => item.id !== filterId));
        }}
        setPage={setPage}
        onCreateTask={() => setIsCreateOpen(true)}
      />

      <NewTaskModal
        open={isCreateOpen}
        columns={boardQuery.data?.columns ?? []}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={onCreateTask}
      />

      <div className="content">
        {page === 'board' && (
          <BoardPage
            columns={boardQuery.data?.columns ?? []}
            tasks={boardQuery.data?.tasks ?? []}
            query={query}
            activeTaskId={activeTaskId}
            setActiveTaskId={setActiveTaskId}
            comments={taskDetailsQuery.data?.comments ?? []}
            reminders={taskDetailsQuery.data?.reminders ?? []}
            checklist={taskDetailsQuery.data?.checklist ?? []}
            taskHistory={taskDetailsQuery.data?.history ?? []}
            onMoveTask={onMoveTask}
            onAddComment={onAddComment}
            onToggleChecklist={onToggleChecklist}
            onAddChecklist={onAddChecklist}
            onEditChecklist={onEditChecklist}
            onDeleteChecklist={onDeleteChecklist}
            onSaveTask={onSaveTask}
            taskTags={taskDetailsQuery.data?.tags ?? []}
            allTags={tagsQuery.data ?? []}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            onCreateTagAndAdd={onCreateTagAndAdd}
            taskTagsByTaskId={taskTagsByTaskId}
            taskChecklistByTaskId={taskChecklistByTaskId}
            onArchiveTask={onArchiveTask}
          />
        )}

        {page === 'today' && <TodayPage today={todayQuery.data} />}
        {page === 'history' && <HistoryPage items={historyQuery.data ?? []} />}
        {page === 'archive' && <ArchivePage tasks={archivedQuery.data ?? []} onRestore={onRestoreTask} />}

        {page === 'settings' && (
          <SettingsPage
            columns={boardQuery.data?.columns ?? []}
            tags={tagsQuery.data ?? []}
            onCreateColumn={async (name) => {
              const pos = (boardQuery.data?.columns ?? []).length;
              await onCreateColumn(name, pos);
            }}
            onRenameColumn={onRenameColumn}
            onUpdateColumnColor={onUpdateColumnColor}
            onCreateTag={onCreateTag}
            onUpdateTag={onUpdateTag}
          />
        )}

        {page === 'reports' && (
          <ReportsPage
            report={analyticsQuery.data}
            loading={analyticsQuery.isLoading}
            days={reportDays}
            bucket={reportBucket}
            onDaysChange={setReportDays}
            onBucketChange={setReportBucket}
          />
        )}
      </div>
    </div>
  );
}
