import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addChecklistItem,
  addTaskComment,
  createTask,
  fetchArchivedTasks,
  fetchColumns,
  fetchHistory,
  fetchTaskChecklist,
  fetchTaskComments,
  fetchTaskHistory,
  fetchTaskReminders,
  fetchTasks,
  fetchToday,
  patchChecklistItem,
  restoreTask,
} from './api/tasks';
import { TopBar } from './components/common/TopBar';
import { BoardPage } from './pages/BoardPage';
import { HistoryPage } from './pages/HistoryPage';
import { TodayPage } from './pages/TodayPage';
import { ArchivePage } from './pages/ArchivePage';
import { SettingsPage } from './pages/SettingsPage';
import { useUIStore } from './store/uiStore';
import './styles.css';

type Page = 'board' | 'today' | 'history' | 'archive' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('board');
  const queryClient = useQueryClient();
  const { query, setQuery, activeTaskId, setActiveTaskId } = useUIStore();

  const tasksQuery = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });
  const archivedQuery = useQuery({ queryKey: ['tasks', 'archived'], queryFn: fetchArchivedTasks });
  const columnsQuery = useQuery({ queryKey: ['columns'], queryFn: fetchColumns });
  const historyQuery = useQuery({ queryKey: ['history'], queryFn: fetchHistory });
  const todayQuery = useQuery({ queryKey: ['today'], queryFn: fetchToday });

  const taskCommentsQuery = useQuery({
    queryKey: ['task-comments', activeTaskId],
    queryFn: () => fetchTaskComments(activeTaskId!),
    enabled: Boolean(activeTaskId),
  });
  const taskRemindersQuery = useQuery({
    queryKey: ['task-reminders', activeTaskId],
    queryFn: () => fetchTaskReminders(activeTaskId!),
    enabled: Boolean(activeTaskId),
  });
  const taskChecklistQuery = useQuery({
    queryKey: ['task-checklist', activeTaskId],
    queryFn: () => fetchTaskChecklist(activeTaskId!),
    enabled: Boolean(activeTaskId),
  });
  const taskHistoryQuery = useQuery({
    queryKey: ['task-history', activeTaskId],
    queryFn: () => fetchTaskHistory(activeTaskId!),
    enabled: Boolean(activeTaskId),
  });

  const boardHistory = useMemo(() => (historyQuery.data ?? []).slice(0, 8), [historyQuery.data]);

  const refreshBoardData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['history'] }),
      queryClient.invalidateQueries({ queryKey: ['today'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks', 'archived'] }),
      queryClient.invalidateQueries({ queryKey: ['task-comments', activeTaskId] }),
      queryClient.invalidateQueries({ queryKey: ['task-checklist', activeTaskId] }),
      queryClient.invalidateQueries({ queryKey: ['task-history', activeTaskId] }),
    ]);
  };

  const handleCreateTask = async () => {
    const title = window.prompt('Название задачи');
    if (!title) return;
    await createTask(title);
    await refreshBoardData();
  };

  return (
    <div className="app-shell">
      <TopBar query={query} onQueryChange={setQuery} setPage={setPage} />

      <div className="content">
        {page === 'board' && (
          <>
            <div className="new-task-row">
              <button className="primary-btn" onClick={handleCreateTask}>+ Новая задача</button>
            </div>
            <BoardPage
              columns={columnsQuery.data ?? []}
              tasks={tasksQuery.data ?? []}
              query={query}
              activeTaskId={activeTaskId}
              setActiveTaskId={setActiveTaskId}
              comments={taskCommentsQuery.data ?? []}
              reminders={taskRemindersQuery.data ?? []}
              checklist={taskChecklistQuery.data ?? []}
              taskHistory={taskHistoryQuery.data ?? []}
              onAddComment={async (text) => {
                if (!activeTaskId) return;
                await addTaskComment(activeTaskId, text);
                await refreshBoardData();
              }}
              onToggleChecklist={async (itemId, isDone) => {
                await patchChecklistItem(itemId, isDone);
                await refreshBoardData();
              }}
              onAddChecklist={async (title) => {
                if (!activeTaskId) return;
                await addChecklistItem(activeTaskId, title);
                await refreshBoardData();
              }}
            />
            <section className="history-panel">
              <h3>История изменений</h3>
              {boardHistory.map((item) => (
                <div key={item.id} className="history-row">
                  {new Date(item.created_at).toLocaleString()} — {item.action_type}
                </div>
              ))}
            </section>
          </>
        )}

        {page === 'today' && <TodayPage today={todayQuery.data} />}
        {page === 'history' && <HistoryPage items={historyQuery.data ?? []} />}
        {page === 'archive' && <ArchivePage tasks={archivedQuery.data ?? []} onRestore={async (id) => { await restoreTask(id); await refreshBoardData(); }} />}
        {page === 'settings' && <SettingsPage columns={columnsQuery.data ?? []} />}
      </div>
    </div>
  );
}
