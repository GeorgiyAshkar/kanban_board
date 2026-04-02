import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createTask, fetchColumns, fetchHistory, fetchTasks, fetchToday } from './api/tasks';
import { TopBar } from './components/common/TopBar';
import { BoardPage } from './pages/BoardPage';
import { HistoryPage } from './pages/HistoryPage';
import { TodayPage } from './pages/TodayPage';
import { ArchivePage } from './pages/ArchivePage';
import { SettingsPage } from './pages/SettingsPage';
import { useUIStore } from './store/uiStore';

type Page = 'board' | 'today' | 'history' | 'archive' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('board');
  const queryClient = useQueryClient();
  const { query, setQuery, activeTaskId, setActiveTaskId } = useUIStore();

  const tasksQuery = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });
  const columnsQuery = useQuery({ queryKey: ['columns'], queryFn: fetchColumns });
  const historyQuery = useQuery({ queryKey: ['history'], queryFn: fetchHistory });
  const todayQuery = useQuery({ queryKey: ['today'], queryFn: fetchToday });

  const handleCreateTask = async () => {
    const title = window.prompt('Название задачи');
    if (!title) return;
    await createTask(title);
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    await queryClient.invalidateQueries({ queryKey: ['history'] });
  };

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <TopBar query={query} onQueryChange={setQuery} onCreateTask={handleCreateTask} setPage={setPage} />
      {page === 'board' && (
        <BoardPage
          columns={columnsQuery.data ?? []}
          tasks={tasksQuery.data ?? []}
          query={query}
          activeTaskId={activeTaskId}
          setActiveTaskId={setActiveTaskId}
        />
      )}
      {page === 'today' && <TodayPage today={todayQuery.data} />}
      {page === 'history' && <HistoryPage items={historyQuery.data ?? []} />}
      {page === 'archive' && <ArchivePage />}
      {page === 'settings' && <SettingsPage />}
    </div>
  );
}
