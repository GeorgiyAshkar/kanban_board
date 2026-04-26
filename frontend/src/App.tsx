import { useEffect, useState } from 'react';
import { TopBar } from './components/common/TopBar';
import { NewTaskModal } from './components/common/NewTaskModal';
import { BoardPage } from './pages/BoardPage';
import { HistoryPage } from './pages/HistoryPage';
import { TodayPage } from './pages/TodayPage';
import { ArchivePage } from './pages/ArchivePage';
import { SettingsPage } from './pages/SettingsPage';
import { useUIStore } from './store/uiStore';
import { useBoardQueries } from './hooks/useBoardQueries';
import { useTaskMutations } from './hooks/useTaskMutations';
import { useReminderNotifications } from './hooks/useReminderNotifications';
import './styles.css';
import fontConfig from './font_config.json';

type Page = 'board' | 'today' | 'history' | 'archive' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('board');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { query, setQuery, activeTaskId, setActiveTaskId } = useUIStore();

  const {
    boardQuery,
    archivedQuery,
    historyQuery,
    todayQuery,
    tagsQuery,
    taskDetailsQuery,
    taskTagsByTaskId,
    taskChecklistByTaskId,
  } = useBoardQueries(query, activeTaskId);

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
      <TopBar query={query} onQueryChange={setQuery} setPage={setPage} onCreateTask={() => setIsCreateOpen(true)} />
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
            onCreateColumn={async (name) => onCreateColumn(name, (boardQuery.data?.columns ?? []).length)}
            onRenameColumn={onRenameColumn}
            onUpdateColumnColor={onUpdateColumnColor}
            onCreateTag={onCreateTag}
            onUpdateTag={onUpdateTag}
          />
        )}
      </div>
    </div>
  );
}
