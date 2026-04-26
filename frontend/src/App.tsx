import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ackReminderNotificationEvent,
  archiveTask,
  addChecklistItem,
  deleteChecklistItem,
  addTaskTag,
  addTaskComment,
  createTag,
  createTaskWithPayload,
  createColumn,
  fetchBoardData,
  fetchAnalyticsReport,
  fetchTags,
  fetchArchivedTasks,
  fetchHistory,
  fetchTaskDetails,
  fetchToday,
  moveTask,
  patchChecklistItem,
  patchColumn,
  patchTag,
  patchTask,
  removeTaskTag,
  restoreTask,
  type BoardFilters,
  type Tag,
} from './api/tasks';
import { TopBar, type SavedBoardFilter } from './components/common/TopBar';
import { NewTaskModal } from './components/common/NewTaskModal';
import { BoardPage } from './pages/BoardPage';
import { HistoryPage } from './pages/HistoryPage';
import { TodayPage } from './pages/TodayPage';
import { ArchivePage } from './pages/ArchivePage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { useUIStore } from './store/uiStore';
import type { ChecklistItem } from './types/task';
import './styles.css';
import fontConfig from './font_config.json';

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
  const [taskTagsByTaskId, setTaskTagsByTaskId] = useState<Record<number, Tag[]>>({});
  const [taskChecklistByTaskId, setTaskChecklistByTaskId] = useState<Record<number, ChecklistItem[]>>({});
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
  const queryClient = useQueryClient();
  const { query, setQuery, activeTaskId, setActiveTaskId } = useUIStore();

  const boardQuery = useQuery({
    queryKey: ['board', query, filters],
    queryFn: () => fetchBoardData(query, filters),
  });
  const archivedQuery = useQuery({ queryKey: ['tasks', 'archived'], queryFn: fetchArchivedTasks });
  const historyQuery = useQuery({ queryKey: ['history'], queryFn: fetchHistory });
  const todayQuery = useQuery({ queryKey: ['today'], queryFn: fetchToday });
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: fetchTags });
  const analyticsQuery = useQuery({
    queryKey: ['analytics', reportDays, reportBucket],
    queryFn: () => fetchAnalyticsReport(reportDays, reportBucket),
  });

  const taskDetailsQuery = useQuery({
    queryKey: ['task-details', activeTaskId],
    queryFn: () => fetchTaskDetails(activeTaskId!),
    enabled: Boolean(activeTaskId),
  });

  useEffect(() => {
    window.localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(savedFilters));
  }, [savedFilters]);

  useEffect(() => {
    const metadata = boardQuery.data?.metadata ?? [];
    setTaskTagsByTaskId(Object.fromEntries(metadata.map((item) => [item.task_id, item.tags])));
    setTaskChecklistByTaskId(Object.fromEntries(metadata.map((item) => [item.task_id, item.checklist])));
  }, [boardQuery.data]);

  useEffect(() => {
    if (!activeTaskId) return;
    setTaskChecklistByTaskId((prev) => ({
      ...prev,
      [activeTaskId]: taskDetailsQuery.data?.checklist ?? [],
    }));
  }, [activeTaskId, taskDetailsQuery.data?.checklist]);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api';
    const normalizedBase = apiBase.startsWith('http')
      ? apiBase
      : new URL(apiBase, window.location.origin).toString();
    const streamUrl = `${normalizedBase.replace(/\/$/, '')}/notifications/stream`;
    const source = new EventSource(streamUrl);

    source.addEventListener('reminder', (raw) => {
      void (async () => {
        try {
          const event = JSON.parse(raw.data) as { id: number; title: string; body?: string };
          if (Notification.permission === 'granted') {
            new Notification(event.title, { body: event.body ?? 'Есть напоминание по задаче' });
          }
          await ackReminderNotificationEvent(event.id);
        } catch {
          // no-op: SSE delivery is best effort
        }
      })();
    });

    source.onerror = () => {
      // no-op: EventSource reconnects automatically
    };

    return () => source.close();
  }, []);

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
      queryClient.invalidateQueries({ queryKey: ['board'] }),
      queryClient.invalidateQueries({ queryKey: ['today'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks', 'archived'] }),
      queryClient.invalidateQueries({ queryKey: ['task-details', activeTaskId] }),
      queryClient.invalidateQueries({ queryKey: ['tags'] }),
    ]);
  };

  const handleCreateTask = () => setIsCreateOpen(true);

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
        onCreateTask={handleCreateTask}
      />
      <NewTaskModal
        open={isCreateOpen}
        columns={boardQuery.data?.columns ?? []}
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
              columns={boardQuery.data?.columns ?? []}
              tasks={boardQuery.data?.tasks ?? []}
              query={query}
              activeTaskId={activeTaskId}
              setActiveTaskId={setActiveTaskId}
              comments={taskDetailsQuery.data?.comments ?? []}
              reminders={taskDetailsQuery.data?.reminders ?? []}
              checklist={taskDetailsQuery.data?.checklist ?? []}
              taskHistory={taskDetailsQuery.data?.history ?? []}
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
                const previous = queryClient.getQueryData(['task-details', activeTaskId]) as typeof taskDetailsQuery.data;
                queryClient.setQueryData(['task-details', activeTaskId], {
                  ...(previous ?? { comments: [], reminders: [], checklist: [], history: [], tags: [] }),
                  comments: [...(previous?.comments ?? []), optimisticComment],
                });
                try {
                  const saved = await addTaskComment(activeTaskId, text);
                  queryClient.setQueryData(['task-details', activeTaskId], (current: typeof taskDetailsQuery.data) => ({
                    ...(current ?? { comments: [], reminders: [], checklist: [], history: [], tags: [] }),
                    comments: (current?.comments ?? []).map((item) => (item.id === tempId ? saved : item)),
                  }));
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['history'] }),
                    queryClient.invalidateQueries({ queryKey: ['task-details', activeTaskId] }),
                  ]);
                } catch (error) {
                  queryClient.setQueryData(['task-details', activeTaskId], previous);
                  throw error;
                }
              }}
              onToggleChecklist={async (itemId, isDone, taskId) => {
                const targetTaskId = taskId ?? activeTaskId;
                if (!targetTaskId) return;
                const previousDetails = queryClient.getQueryData(['task-details', targetTaskId]) as typeof taskDetailsQuery.data;
                const previousChecklist = previousDetails?.checklist ?? [];
                const applyChecklistPatch = (items: typeof previousChecklist) =>
                  (items ?? []).map((item) => (item.id === itemId ? { ...item, is_done: isDone } : item));

                queryClient.setQueryData(['task-details', targetTaskId], {
                  ...(previousDetails ?? { comments: [], reminders: [], checklist: [], history: [], tags: [] }),
                  checklist: applyChecklistPatch(previousChecklist),
                });
                setTaskChecklistByTaskId((prev) => ({
                  ...prev,
                  [targetTaskId]: applyChecklistPatch(prev[targetTaskId] ?? []),
                }));

                try {
                  await patchChecklistItem(itemId, { is_done: isDone });
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['board'] }),
                    queryClient.invalidateQueries({ queryKey: ['task-details', targetTaskId] }),
                  ]);
                } catch (error) {
                  queryClient.setQueryData(['task-details', targetTaskId], previousDetails);
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
                const previousDetails = queryClient.getQueryData(['task-details', activeTaskId]) as typeof taskDetailsQuery.data;
                const previousChecklist = previousDetails?.checklist ?? [];
                const tempItem = {
                  id: tempId,
                  task_id: activeTaskId,
                  title,
                  position: (previousChecklist ?? []).length,
                  is_done: false,
                };
                queryClient.setQueryData(['task-details', activeTaskId], {
                  ...(previousDetails ?? { comments: [], reminders: [], checklist: [], history: [], tags: [] }),
                  checklist: [...previousChecklist, tempItem],
                });
                setTaskChecklistByTaskId((prev) => ({
                  ...prev,
                  [activeTaskId]: [...(prev[activeTaskId] ?? []), tempItem],
                }));
                try {
                  const saved = await addChecklistItem(activeTaskId, title);
                  queryClient.setQueryData(['task-details', activeTaskId], (current: typeof taskDetailsQuery.data) => ({
                    ...(current ?? { comments: [], reminders: [], checklist: [], history: [], tags: [] }),
                    checklist: (current?.checklist ?? []).map((item) => (item.id === tempId ? saved : item)),
                  }));
                  setTaskChecklistByTaskId((prev) => ({
                    ...prev,
                    [activeTaskId]: (prev[activeTaskId] ?? ([] as ChecklistItem[])).map((item) => (item.id === tempId ? saved : item)),
                  }));
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['board'] }),
                    queryClient.invalidateQueries({ queryKey: ['task-details', activeTaskId] }),
                  ]);
                } catch (error) {
                  queryClient.setQueryData(['task-details', activeTaskId], previousDetails);
                  setTaskChecklistByTaskId((prev) => ({
                    ...prev,
                    [activeTaskId]: previousChecklist ?? [],
                  }));
                  throw error;
                }
              }}
              onEditChecklist={async (itemId, title) => {
                if (!activeTaskId) return;
                const previousDetails = queryClient.getQueryData(['task-details', activeTaskId]) as typeof taskDetailsQuery.data;
                const previousChecklist = previousDetails?.checklist ?? [];
                const applyChecklistPatch = (items: typeof previousChecklist) =>
                  (items ?? []).map((item) => (item.id === itemId ? { ...item, title } : item));
                queryClient.setQueryData(['task-details', activeTaskId], {
                  ...(previousDetails ?? { comments: [], reminders: [], checklist: [], history: [], tags: [] }),
                  checklist: applyChecklistPatch(previousChecklist),
                });
                setTaskChecklistByTaskId((prev) => ({
                  ...prev,
                  [activeTaskId]: applyChecklistPatch(prev[activeTaskId] ?? []),
                }));
                try {
                  await patchChecklistItem(itemId, { title });
                  await queryClient.invalidateQueries({ queryKey: ['task-details', activeTaskId] });
                } catch (error) {
                  queryClient.setQueryData(['task-details', activeTaskId], previousDetails);
                  setTaskChecklistByTaskId((prev) => ({
                    ...prev,
                    [activeTaskId]: previousChecklist ?? [],
                  }));
                  throw error;
                }
              }}
              onDeleteChecklist={async (itemId) => {
                if (!activeTaskId) return;
                const previousDetails = queryClient.getQueryData(['task-details', activeTaskId]) as typeof taskDetailsQuery.data;
                const previousChecklist = previousDetails?.checklist ?? [];
                const nextChecklist = (previousChecklist ?? []).filter((item) => item.id !== itemId);
                queryClient.setQueryData(['task-details', activeTaskId], {
                  ...(previousDetails ?? { comments: [], reminders: [], checklist: [], history: [], tags: [] }),
                  checklist: nextChecklist,
                });
                setTaskChecklistByTaskId((prev) => ({
                  ...prev,
                  [activeTaskId]: (prev[activeTaskId] ?? ([] as ChecklistItem[])).filter((item) => item.id !== itemId),
                }));
                try {
                  await deleteChecklistItem(itemId);
                  await queryClient.invalidateQueries({ queryKey: ['task-details', activeTaskId] });
                } catch (error) {
                  queryClient.setQueryData(['task-details', activeTaskId], previousDetails);
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
              taskTags={taskDetailsQuery.data?.tags ?? []}
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
            columns={boardQuery.data?.columns ?? []}
            tags={tagsQuery.data ?? []}
            onCreateColumn={async (name) => {
              const pos = (boardQuery.data?.columns ?? []).length;
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
