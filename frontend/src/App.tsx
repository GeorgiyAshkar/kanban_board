import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addChecklistItem,
  addTaskTag,
  addTaskComment,
  createTag,
  createTaskWithPayload,
  fetchTags,
  fetchTaskTags,
  fetchArchivedTasks,
  fetchColumns,
  fetchHistory,
  fetchTaskChecklist,
  fetchTaskComments,
  fetchTaskHistory,
  fetchTaskReminders,
  fetchTasks,
  fetchToday,
  moveTask,
  patchChecklistItem,
  patchTask,
  removeTaskTag,
  restoreTask,
} from './api/tasks';
import { TopBar } from './components/common/TopBar';
import { NewTaskModal } from './components/common/NewTaskModal';
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { query, setQuery, activeTaskId, setActiveTaskId } = useUIStore();

  const tasksQuery = useQuery({ queryKey: ['tasks'], queryFn: fetchTasks });
  const archivedQuery = useQuery({ queryKey: ['tasks', 'archived'], queryFn: fetchArchivedTasks });
  const columnsQuery = useQuery({ queryKey: ['columns'], queryFn: fetchColumns });
  const historyQuery = useQuery({ queryKey: ['history'], queryFn: fetchHistory });
  const todayQuery = useQuery({ queryKey: ['today'], queryFn: fetchToday });
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: fetchTags });

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
  const taskTagsQuery = useQuery({
    queryKey: ['task-tags', activeTaskId],
    queryFn: () => fetchTaskTags(activeTaskId!),
    enabled: Boolean(activeTaskId),
  });

  const refreshBoardData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['history'] }),
      queryClient.invalidateQueries({ queryKey: ['today'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks', 'archived'] }),
      queryClient.invalidateQueries({ queryKey: ['task-comments', activeTaskId] }),
      queryClient.invalidateQueries({ queryKey: ['task-checklist', activeTaskId] }),
      queryClient.invalidateQueries({ queryKey: ['task-history', activeTaskId] }),
      queryClient.invalidateQueries({ queryKey: ['task-tags', activeTaskId] }),
      queryClient.invalidateQueries({ queryKey: ['tags'] }),
    ]);
  };

  const handleCreateTask = () => setIsCreateOpen(true);

  return (
    <div className="app-shell">
      <TopBar query={query} onQueryChange={setQuery} setPage={setPage} onCreateTask={handleCreateTask} />
      <NewTaskModal
        open={isCreateOpen}
        columns={columnsQuery.data ?? []}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async ({ title, description, boardColumnId, status, priority }) => {
          await createTaskWithPayload({
            title,
            description,
            board_column_id: boardColumnId,
            status,
            priority,
          });
          await refreshBoardData();
        }}
      />

      <div className="content">
        {page === 'board' && (
          <>
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
              onMoveTask={async (taskId, columnId, position) => {
                const statusMap: Record<number, string> = {};
                (columnsQuery.data ?? []).forEach((col) => {
                  const name = col.name.toLowerCase();
                  statusMap[col.id] = name.includes('вход') ? 'inbox' : name.includes('выполн') ? 'todo' : name.includes('работ') ? 'in_progress' : name.includes('пауз') ? 'paused' : name.includes('готов') ? 'done' : 'inbox';
                });
                await moveTask(taskId, columnId, statusMap[columnId], position);
                await refreshBoardData();
              }}
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
              onSaveTask={async (patch) => {
                if (!activeTaskId) return;
                await patchTask(activeTaskId, patch);
                await refreshBoardData();
              }}
              taskTags={taskTagsQuery.data ?? []}
              allTags={tagsQuery.data ?? []}
              onAddTag={async (tagId) => {
                if (!activeTaskId) return;
                await addTaskTag(activeTaskId, tagId);
                await refreshBoardData();
              }}
              onRemoveTag={async (tagId) => {
                if (!activeTaskId) return;
                await removeTaskTag(activeTaskId, tagId);
                await refreshBoardData();
              }}
              onCreateTagAndAdd={async (name) => {
                if (!activeTaskId) return;
                const tag = await createTag(name);
                await addTaskTag(activeTaskId, tag.id);
                await refreshBoardData();
              }}
            />
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
