import { useEffect } from 'react';
import { TopBar } from './components/common/TopBar';
import { NewTaskModal } from './components/common/NewTaskModal';
import { BoardPage } from './pages/BoardPage';
import { HistoryPage } from './pages/HistoryPage';
import { TodayPage } from './pages/TodayPage';
import { ArchivePage } from './pages/ArchivePage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { useBoardController } from './hooks/useBoardController';
import './styles.css';
import fontConfig from './font_config.json';

export default function App() {
  const { state, queries, actions } = useBoardController();

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
        query={state.query}
        onQueryChange={state.setQuery}
        filters={state.filters}
        onFiltersChange={state.setFilters}
        tags={queries.tagsQuery.data ?? []}
        columns={queries.boardQuery.data?.columns ?? []}
        savedFilters={state.savedFilters}
        onApplySavedFilter={actions.applySavedFilter}
        onSaveCurrentFilter={actions.saveCurrentFilter}
        onDeleteSavedFilter={actions.deleteSavedFilter}
        setPage={state.setPage}
        onCreateTask={actions.openCreateTask}
      />

      <NewTaskModal
        open={state.isCreateOpen}
        columns={queries.boardQuery.data?.columns ?? []}
        onClose={() => state.setIsCreateOpen(false)}
        onSubmit={actions.createTask}
      />

      <div className="content">
        {state.page === 'board' && (
          <BoardPage
            columns={queries.boardQuery.data?.columns ?? []}
            tasks={queries.boardQuery.data?.tasks ?? []}
            query={state.query}
            activeTaskId={state.activeTaskId}
            setActiveTaskId={state.setActiveTaskId}
            comments={queries.taskDetailsQuery.data?.comments ?? []}
            reminders={queries.taskDetailsQuery.data?.reminders ?? []}
            checklist={queries.taskDetailsQuery.data?.checklist ?? []}
            taskHistory={queries.taskDetailsQuery.data?.history ?? []}
            onMoveTask={actions.moveTask}
            onAddComment={actions.addComment}
            onToggleChecklist={actions.toggleChecklist}
            onAddChecklist={actions.addChecklist}
            onEditChecklist={actions.editChecklist}
            onDeleteChecklist={actions.deleteChecklist}
            onSaveTask={actions.saveTask}
            taskTags={queries.taskDetailsQuery.data?.tags ?? []}
            allTags={queries.tagsQuery.data ?? []}
            onAddTag={actions.addTag}
            onRemoveTag={actions.removeTag}
            onCreateTagAndAdd={actions.createTagAndAdd}
            taskTagsByTaskId={queries.taskTagsByTaskId}
            taskChecklistByTaskId={queries.taskChecklistByTaskId}
            onArchiveTask={actions.archiveActiveTask}
          />
        )}

        {state.page === 'today' && <TodayPage today={queries.todayQuery.data} />}
        {state.page === 'history' && <HistoryPage items={queries.historyQuery.data ?? []} />}
        {state.page === 'archive' && (
          <ArchivePage
            tasks={queries.archivedQuery.data ?? []}
            onRestore={actions.restoreTaskFromArchive}
          />
        )}
        {state.page === 'settings' && (
          <SettingsPage
            columns={queries.boardQuery.data?.columns ?? []}
            tags={queries.tagsQuery.data ?? []}
            onCreateColumn={actions.createColumn}
            onRenameColumn={actions.renameColumn}
            onUpdateColumnColor={actions.updateColumnColor}
            onUpdateColumnWipLimit={actions.updateColumnWipLimit}
            onUpdateColumnSlaHours={actions.updateColumnSlaHours}
            onCreateTag={actions.createTag}
            onUpdateTag={actions.updateTag}
            onExportBackup={actions.exportBackup}
            onImportBackup={actions.importBackup}
            onDryRunBackupImport={actions.dryRunBackupImport}
          />
        )}
        {state.page === 'reports' && (
          <ReportsPage
            report={queries.analyticsQuery.data}
            loading={queries.analyticsQuery.isLoading}
            days={state.reportDays}
            bucket={state.reportBucket}
            onDaysChange={state.setReportDays}
            onBucketChange={state.setReportBucket}
          />
        )}
      </div>
    </div>
  );
}
