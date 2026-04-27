import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addChecklistItem,
  addTaskComment,
  addTaskTag,
  archiveTask,
  createColumn,
  createTag,
  createTaskWithPayload,
  deleteChecklistItem,
  fetchAnalyticsReport,
  fetchArchivedTasks,
  fetchBoardData,
  fetchHistory,
  fetchTags,
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
} from '../api/tasks';
import { useUIStore } from '../store/uiStore';
import type { ChecklistItem, Task } from '../types/task';
import { useNotifications } from './useNotifications';
import { useTaskDetails } from './useTaskDetails';

export type Page = 'board' | 'today' | 'history' | 'archive' | 'reports' | 'settings';
export type SavedBoardFilter = { id: string; name: string; query: string; filters: BoardFilters };

const SAVED_FILTERS_KEY = 'kanban.saved-filters.v1';

export const defaultBoardFilters: BoardFilters = {
  archiveScope: 'active',
  completedScope: 'all',
  tagIds: [],
  columnIds: [],
  assignee: '',
  dateField: 'deadline_at',
};

export const useBoardController = () => {
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

  const { taskTagsByTaskId, taskChecklistByTaskId, setTaskChecklistByTaskId } = useTaskDetails({
    metadata: boardQuery.data?.metadata ?? [],
    activeTaskId,
    activeTaskChecklist: taskDetailsQuery.data?.checklist ?? [],
  });

  useNotifications();

  useEffect(() => {
    window.localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(savedFilters));
  }, [savedFilters]);

  const refreshBoardData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['board'] }),
      queryClient.invalidateQueries({ queryKey: ['today'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks', 'archived'] }),
      queryClient.invalidateQueries({ queryKey: ['task-details', activeTaskId] }),
      queryClient.invalidateQueries({ queryKey: ['tags'] }),
    ]);
  };

  return {
    state: {
      page,
      setPage,
      query,
      setQuery,
      filters,
      setFilters,
      savedFilters,
      setSavedFilters,
      isCreateOpen,
      setIsCreateOpen,
      reportDays,
      setReportDays,
      reportBucket,
      setReportBucket,
      activeTaskId,
      setActiveTaskId,
    },
    queries: {
      boardQuery,
      archivedQuery,
      historyQuery,
      todayQuery,
      tagsQuery,
      analyticsQuery,
      taskDetailsQuery,
      taskTagsByTaskId,
      taskChecklistByTaskId,
    },
    actions: {
      openCreateTask: () => setIsCreateOpen(true),
      applySavedFilter: (filterId: string) => {
        const selected = savedFilters.find((item) => item.id === filterId);
        if (!selected) return;
        setQuery(selected.query);
        setFilters(selected.filters);
      },
      saveCurrentFilter: (name: string) => {
        setSavedFilters((prev) => [
          { id: `${Date.now()}`, name, query, filters: { ...filters } },
          ...prev,
        ]);
      },
      deleteSavedFilter: (filterId: string) => {
        setSavedFilters((prev) => prev.filter((item) => item.id !== filterId));
      },
      createTask: async ({
        title,
        description,
        boardColumnId,
        status,
        priority,
        plannedReturnAt,
        deadlineAt,
      }: {
        title: string;
        description: string;
        boardColumnId: number;
        status: Task['status'];
        priority: Task['priority'];
        plannedReturnAt: string | null;
        deadlineAt: string | null;
      }) => {
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
      },
      moveTask: async (taskId: number, columnId: number, position: number) => {
        await moveTask(taskId, columnId, position);
        await refreshBoardData();
      },
      addComment: async (text: string) => {
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
      },
      toggleChecklist: async (itemId: number, isDone: boolean, taskId?: number) => {
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
      },
      addChecklist: async (title: string) => {
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
      },
      editChecklist: async (itemId: number, title: string) => {
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
      },
      deleteChecklist: async (itemId: number) => {
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
      },
      saveTask: async (patch: Partial<Task>) => {
        if (!activeTaskId) return;
        await patchTask(activeTaskId, patch);
        await refreshBoardData();
      },
      addTag: async (tagId: number) => {
        if (!activeTaskId) return;
        await addTaskTag(activeTaskId, tagId);
        await refreshBoardData();
      },
      removeTag: async (tagId: number) => {
        if (!activeTaskId) return;
        await removeTaskTag(activeTaskId, tagId);
        await refreshBoardData();
      },
      createTagAndAdd: async (name: string) => {
        if (!activeTaskId) return;
        const tag = await createTag(name);
        await addTaskTag(activeTaskId, tag.id);
        await refreshBoardData();
      },
      archiveActiveTask: async () => {
        if (!activeTaskId) return;
        await archiveTask(activeTaskId);
        setActiveTaskId(null);
        await refreshBoardData();
      },
      restoreTaskFromArchive: async (id: number) => {
        await restoreTask(id);
        await refreshBoardData();
      },
      createColumn: async (name: string) => {
        const pos = (boardQuery.data?.columns ?? []).length;
        await createColumn(name, pos);
        await refreshBoardData();
      },
      renameColumn: async (columnId: number, name: string) => {
        await patchColumn(columnId, { name });
        await refreshBoardData();
      },
      updateColumnColor: async (columnId: number, color: string) => {
        await patchColumn(columnId, { color });
        await refreshBoardData();
      },
      updateColumnWipLimit: async (columnId: number, value: number | null) => {
        await patchColumn(columnId, { wip_limit: value });
        await refreshBoardData();
      },
      updateColumnSlaHours: async (columnId: number, value: number | null) => {
        await patchColumn(columnId, { sla_hours: value });
        await refreshBoardData();
      },
      createTag: async (name: string, color: string) => {
        await createTag(name, color);
        await refreshBoardData();
      },
      updateTag: async (tagId: number, name: string, color: string) => {
        await patchTag(tagId, { name, color });
        await refreshBoardData();
      },
    },
  };
};
