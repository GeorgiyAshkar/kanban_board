import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveTask,
  addChecklistItem,
  deleteChecklistItem,
  addTaskTag,
  addTaskComment,
  createTag,
  createTaskWithPayload,
  createColumn,
  fetchTags,
  fetchTaskTags,
  fetchBoardMetadata,
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
  patchColumn,
  patchTag,
  patchTask,
  removeTaskTag,
  restoreTask,
  type Tag,
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
import fontConfig from './font_config.json';

type Page = 'board' | 'today' | 'history' | 'archive' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('board');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskTagsByTaskId, setTaskTagsByTaskId] = useState<Record<number, Tag[]>>({});
  const [taskChecklistByTaskId, setTaskChecklistByTaskId] = useState<Record<number, Awaited<ReturnType<typeof fetchTaskChecklist>>>>({});
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

  useEffect(() => {
    const loadBoardMetadata = async () => {
      try {
        const tasks = tasksQuery.data ?? [];
        const metadata = await fetchBoardMetadata(tasks.map((task) => task.id));
        setTaskTagsByTaskId(Object.fromEntries(metadata.map((item) => [item.task_id, item.tags])));
        setTaskChecklistByTaskId(Object.fromEntries(metadata.map((item) => [item.task_id, item.checklist])));
      } catch {
        setTaskTagsByTaskId({});
        setTaskChecklistByTaskId({});
      }
    };
    void loadBoardMetadata();
  }, [tasksQuery.data]);

  useEffect(() => {
    if (!activeTaskId) return;
    setTaskChecklistByTaskId((prev) => ({
      ...prev,
      [activeTaskId]: taskChecklistQuery.data ?? [],
    }));
  }, [activeTaskId, taskChecklistQuery.data]);

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
        onSubmit={async ({ title, description, boardColumnId, status, priority, plannedReturnAt, deadlineAt }) => {
          await createTaskWithPayload({
            title,
            description,
            board_column_id: boardColumnId,
            status,
            priority,
            planned_return_at: plannedReturnAt,
            deadline_at: deadlineAt,
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
                await moveTask(taskId, columnId, position);
                await refreshBoardData();
              }}
              onAddComment={async (text) => {
                if (!activeTaskId) return;
                const tempId = -Date.now();
                const optimisticComment = {
                  id: tempId,
                  task_id: activeTaskId,
                  text,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  author: 'local_user',
                };
                const previous = queryClient.getQueryData(['task-comments', activeTaskId]) as typeof taskCommentsQuery.data;
                queryClient.setQueryData(['task-comments', activeTaskId], [...(previous ?? []), optimisticComment]);
                try {
                  const saved = await addTaskComment(activeTaskId, text);
                  queryClient.setQueryData(['task-comments', activeTaskId], (current: typeof taskCommentsQuery.data) =>
                    (current ?? []).map((item) => (item.id === tempId ? saved : item)),
                  );
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['history'] }),
                    queryClient.invalidateQueries({ queryKey: ['task-history', activeTaskId] }),
                  ]);
                } catch (error) {
                  queryClient.setQueryData(['task-comments', activeTaskId], previous ?? []);
                  throw error;
                }
              }}
              onToggleChecklist={async (itemId, isDone, taskId) => {
                const targetTaskId = taskId ?? activeTaskId;
                if (!targetTaskId) return;
                const previousChecklist = queryClient.getQueryData(['task-checklist', targetTaskId]) as typeof taskChecklistQuery.data;
                const applyChecklistPatch = (items: typeof taskChecklistQuery.data) =>
                  (items ?? []).map((item) => (item.id === itemId ? { ...item, is_done: isDone } : item));

                queryClient.setQueryData(['task-checklist', targetTaskId], applyChecklistPatch(previousChecklist));
                setTaskChecklistByTaskId((prev) => ({
                  ...prev,
                  [targetTaskId]: applyChecklistPatch(prev[targetTaskId] ?? []),
                }));

                try {
                  await patchChecklistItem(itemId, { is_done: isDone });
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['tasks'] }),
                    queryClient.invalidateQueries({ queryKey: ['task-history', targetTaskId] }),
                  ]);
                } catch (error) {
                  queryClient.setQueryData(['task-checklist', targetTaskId], previousChecklist ?? []);
                  setTaskChecklistByTaskId((prev) => ({
                    ...prev,
                    [targetTaskId]: previousChecklist ?? [],
                  }));
                  throw error;
                }
              }}
              onAddChecklist={async (title) => {
                if (!activeTaskId) return;
                const tempId = -Date.now();
                const previousChecklist = queryClient.getQueryData(['task-checklist', activeTaskId]) as typeof taskChecklistQuery.data;
                const tempItem = {
                  id: tempId,
                  task_id: activeTaskId,
                  title,
                  position: (previousChecklist ?? []).length,
                  is_done: false,
                };
                queryClient.setQueryData(['task-checklist', activeTaskId], [...(previousChecklist ?? []), tempItem]);
                setTaskChecklistByTaskId((prev) => ({
                  ...prev,
                  [activeTaskId]: [...(prev[activeTaskId] ?? []), tempItem],
                }));
                try {
                  const saved = await addChecklistItem(activeTaskId, title);
                  queryClient.setQueryData(['task-checklist', activeTaskId], (current: typeof taskChecklistQuery.data) =>
                    (current ?? []).map((item) => (item.id === tempId ? saved : item)),
                  );
                  setTaskChecklistByTaskId((prev) => ({
                    ...prev,
                    [activeTaskId]: (prev[activeTaskId] ?? []).map((item) => (item.id === tempId ? saved : item)),
                  }));
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['tasks'] }),
                    queryClient.invalidateQueries({ queryKey: ['task-history', activeTaskId] }),
                  ]);
                } catch (error) {
                  queryClient.setQueryData(['task-checklist', activeTaskId], previousChecklist ?? []);
                  setTaskChecklistByTaskId((prev) => ({
                    ...prev,
                    [activeTaskId]: previousChecklist ?? [],
                  }));
                  throw error;
                }
              }}
              onEditChecklist={async (itemId, title) => {
                if (!activeTaskId) return;
                const previousChecklist = queryClient.getQueryData(['task-checklist', activeTaskId]) as typeof taskChecklistQuery.data;
                const applyChecklistPatch = (items: typeof taskChecklistQuery.data) =>
                  (items ?? []).map((item) => (item.id === itemId ? { ...item, title } : item));
                queryClient.setQueryData(['task-checklist', activeTaskId], applyChecklistPatch(previousChecklist));
                setTaskChecklistByTaskId((prev) => ({
                  ...prev,
                  [activeTaskId]: applyChecklistPatch(prev[activeTaskId] ?? []),
                }));
                try {
                  await patchChecklistItem(itemId, { title });
                  await queryClient.invalidateQueries({ queryKey: ['task-history', activeTaskId] });
                } catch (error) {
                  queryClient.setQueryData(['task-checklist', activeTaskId], previousChecklist ?? []);
                  setTaskChecklistByTaskId((prev) => ({
                    ...prev,
                    [activeTaskId]: previousChecklist ?? [],
                  }));
                  throw error;
                }
              }}
              onDeleteChecklist={async (itemId) => {
                if (!activeTaskId) return;
                const previousChecklist = queryClient.getQueryData(['task-checklist', activeTaskId]) as typeof taskChecklistQuery.data;
                const nextChecklist = (previousChecklist ?? []).filter((item) => item.id !== itemId);
                queryClient.setQueryData(['task-checklist', activeTaskId], nextChecklist);
                setTaskChecklistByTaskId((prev) => ({
                  ...prev,
                  [activeTaskId]: (prev[activeTaskId] ?? []).filter((item) => item.id !== itemId),
                }));
                try {
                  await deleteChecklistItem(itemId);
                  await queryClient.invalidateQueries({ queryKey: ['task-history', activeTaskId] });
                } catch (error) {
                  queryClient.setQueryData(['task-checklist', activeTaskId], previousChecklist ?? []);
                  setTaskChecklistByTaskId((prev) => ({
                    ...prev,
                    [activeTaskId]: previousChecklist ?? [],
                  }));
                  throw error;
                }
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
              taskTagsByTaskId={taskTagsByTaskId}
              taskChecklistByTaskId={taskChecklistByTaskId}
              onArchiveTask={async () => {
                if (!activeTaskId) return;
                await archiveTask(activeTaskId);
                setActiveTaskId(null);
                await refreshBoardData();
              }}
            />
          </>
        )}

        {page === 'today' && <TodayPage today={todayQuery.data} />}
        {page === 'history' && <HistoryPage items={historyQuery.data ?? []} />}
        {page === 'archive' && <ArchivePage tasks={archivedQuery.data ?? []} onRestore={async (id) => { await restoreTask(id); await refreshBoardData(); }} />}
        {page === 'settings' && (
          <SettingsPage
            columns={columnsQuery.data ?? []}
            tags={tagsQuery.data ?? []}
            onCreateColumn={async (name) => {
              const pos = (columnsQuery.data ?? []).length;
              await createColumn(name, pos);
              await refreshBoardData();
            }}
            onRenameColumn={async (columnId, name) => {
              await patchColumn(columnId, { name });
              await refreshBoardData();
            }}
            onUpdateColumnColor={async (columnId, color) => {
              await patchColumn(columnId, { color });
              await refreshBoardData();
            }}
            onCreateTag={async (name, color) => {
              await createTag(name, color);
              await refreshBoardData();
            }}
            onUpdateTag={async (tagId, name, color) => {
              await patchTag(tagId, { name, color });
              await refreshBoardData();
            }}
          />
        )}
      </div>
    </div>
  );
}
