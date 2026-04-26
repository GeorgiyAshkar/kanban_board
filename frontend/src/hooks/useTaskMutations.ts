import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  addChecklistItem,
  addTaskComment,
  addTaskTag,
  archiveTask,
  createColumn,
  createTag,
  createTaskWithPayload,
  deleteChecklistItem,
  moveTask,
  patchChecklistItem,
  patchColumn,
  patchTag,
  patchTask,
  removeTaskTag,
  restoreTask,
  type TaskDetailsResponse,
} from '../api/tasks';
import type { ChecklistItem, Task } from '../types/task';

type UseTaskMutationsParams = {
  activeTaskId: number | null;
  setActiveTaskId: (taskId: number | null) => void;
};

const emptyTaskDetails: TaskDetailsResponse = {
  comments: [],
  reminders: [],
  checklist: [],
  history: [],
  tags: [],
};

export const useTaskMutations = ({ activeTaskId, setActiveTaskId }: UseTaskMutationsParams) => {
  const queryClient = useQueryClient();

  const refreshBoardData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['board'] }),
      queryClient.invalidateQueries({ queryKey: ['today'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks', 'archived'] }),
      queryClient.invalidateQueries({ queryKey: ['task-details', activeTaskId] }),
      queryClient.invalidateQueries({ queryKey: ['tags'] }),
    ]);
  }, [queryClient, activeTaskId]);

  const onCreateTask = useCallback(
    async ({
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
    [refreshBoardData],
  );

  const onMoveTask = useCallback(
    async (taskId: number, columnId: number, position?: number) => {
      await moveTask(taskId, columnId, position);
      await refreshBoardData();
    },
    [refreshBoardData],
  );

  const onAddComment = useCallback(
    async (text: string) => {
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
      const previous = queryClient.getQueryData<TaskDetailsResponse>(['task-details', activeTaskId]);
      queryClient.setQueryData<TaskDetailsResponse>(['task-details', activeTaskId], {
        ...(previous ?? emptyTaskDetails),
        comments: [...(previous?.comments ?? []), optimisticComment],
      });

      try {
        const saved = await addTaskComment(activeTaskId, text);
        queryClient.setQueryData<TaskDetailsResponse>(['task-details', activeTaskId], (current) => ({
          ...(current ?? emptyTaskDetails),
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
    [activeTaskId, queryClient],
  );

  const onToggleChecklist = useCallback(
    async (itemId: number, isDone: boolean, taskId?: number) => {
      const targetTaskId = taskId ?? activeTaskId;
      if (!targetTaskId) return;

      const previousDetails = queryClient.getQueryData<TaskDetailsResponse>(['task-details', targetTaskId]);
      const previousChecklist = previousDetails?.checklist ?? [];
      const applyChecklistPatch = (items: ChecklistItem[]) => items.map((item) => (item.id === itemId ? { ...item, is_done: isDone } : item));

      queryClient.setQueryData<TaskDetailsResponse>(['task-details', targetTaskId], {
        ...(previousDetails ?? emptyTaskDetails),
        checklist: applyChecklistPatch(previousChecklist),
      });

      try {
        await patchChecklistItem(itemId, { is_done: isDone });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['board'] }),
          queryClient.invalidateQueries({ queryKey: ['task-details', targetTaskId] }),
        ]);
      } catch (error) {
        queryClient.setQueryData(['task-details', targetTaskId], previousDetails);
        throw error;
      }
    },
    [activeTaskId, queryClient],
  );

  const onAddChecklist = useCallback(
    async (title: string) => {
      if (!activeTaskId) return;
      const tempId = -Date.now();
      const previousDetails = queryClient.getQueryData<TaskDetailsResponse>(['task-details', activeTaskId]);
      const previousChecklist = previousDetails?.checklist ?? [];
      const tempItem: ChecklistItem = {
        id: tempId,
        task_id: activeTaskId,
        title,
        position: previousChecklist.length,
        is_done: false,
      };

      queryClient.setQueryData<TaskDetailsResponse>(['task-details', activeTaskId], {
        ...(previousDetails ?? emptyTaskDetails),
        checklist: [...previousChecklist, tempItem],
      });

      try {
        const saved = await addChecklistItem(activeTaskId, title);
        queryClient.setQueryData<TaskDetailsResponse>(['task-details', activeTaskId], (current) => ({
          ...(current ?? emptyTaskDetails),
          checklist: (current?.checklist ?? []).map((item) => (item.id === tempId ? saved : item)),
        }));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['board'] }),
          queryClient.invalidateQueries({ queryKey: ['task-details', activeTaskId] }),
        ]);
      } catch (error) {
        queryClient.setQueryData(['task-details', activeTaskId], previousDetails);
        throw error;
      }
    },
    [activeTaskId, queryClient],
  );

  const onEditChecklist = useCallback(
    async (itemId: number, title: string) => {
      if (!activeTaskId) return;
      const previousDetails = queryClient.getQueryData<TaskDetailsResponse>(['task-details', activeTaskId]);
      const previousChecklist = previousDetails?.checklist ?? [];
      const applyChecklistPatch = (items: ChecklistItem[]) => items.map((item) => (item.id === itemId ? { ...item, title } : item));

      queryClient.setQueryData<TaskDetailsResponse>(['task-details', activeTaskId], {
        ...(previousDetails ?? emptyTaskDetails),
        checklist: applyChecklistPatch(previousChecklist),
      });

      try {
        await patchChecklistItem(itemId, { title });
        await queryClient.invalidateQueries({ queryKey: ['task-details', activeTaskId] });
      } catch (error) {
        queryClient.setQueryData(['task-details', activeTaskId], previousDetails);
        throw error;
      }
    },
    [activeTaskId, queryClient],
  );

  const onDeleteChecklist = useCallback(
    async (itemId: number) => {
      if (!activeTaskId) return;
      const previousDetails = queryClient.getQueryData<TaskDetailsResponse>(['task-details', activeTaskId]);
      const nextChecklist = (previousDetails?.checklist ?? []).filter((item) => item.id !== itemId);

      queryClient.setQueryData<TaskDetailsResponse>(['task-details', activeTaskId], {
        ...(previousDetails ?? emptyTaskDetails),
        checklist: nextChecklist,
      });

      try {
        await deleteChecklistItem(itemId);
        await queryClient.invalidateQueries({ queryKey: ['task-details', activeTaskId] });
      } catch (error) {
        queryClient.setQueryData(['task-details', activeTaskId], previousDetails);
        throw error;
      }
    },
    [activeTaskId, queryClient],
  );

  const onSaveTask = useCallback(
    async (patch: Partial<Task>) => {
      if (!activeTaskId) return;
      await patchTask(activeTaskId, patch);
      await refreshBoardData();
    },
    [activeTaskId, refreshBoardData],
  );

  const onAddTag = useCallback(
    async (tagId: number) => {
      if (!activeTaskId) return;
      await addTaskTag(activeTaskId, tagId);
      await refreshBoardData();
    },
    [activeTaskId, refreshBoardData],
  );

  const onRemoveTag = useCallback(
    async (tagId: number) => {
      if (!activeTaskId) return;
      await removeTaskTag(activeTaskId, tagId);
      await refreshBoardData();
    },
    [activeTaskId, refreshBoardData],
  );

  const onCreateTagAndAdd = useCallback(
    async (name: string) => {
      if (!activeTaskId) return;
      const tag = await createTag(name);
      await addTaskTag(activeTaskId, tag.id);
      await refreshBoardData();
    },
    [activeTaskId, refreshBoardData],
  );

  const onArchiveTask = useCallback(async () => {
    if (!activeTaskId) return;
    await archiveTask(activeTaskId);
    setActiveTaskId(null);
    await refreshBoardData();
  }, [activeTaskId, setActiveTaskId, refreshBoardData]);

  const onRestoreTask = useCallback(
    async (taskId: number) => {
      await restoreTask(taskId);
      await refreshBoardData();
    },
    [refreshBoardData],
  );

  const onCreateColumn = useCallback(
    async (name: string, position: number) => {
      await createColumn(name, position);
      await refreshBoardData();
    },
    [refreshBoardData],
  );

  const onRenameColumn = useCallback(
    async (columnId: number, name: string) => {
      await patchColumn(columnId, { name });
      await refreshBoardData();
    },
    [refreshBoardData],
  );

  const onUpdateColumnColor = useCallback(
    async (columnId: number, color: string) => {
      await patchColumn(columnId, { color });
      await refreshBoardData();
    },
    [refreshBoardData],
  );

  const onCreateTag = useCallback(
    async (name: string, color: string) => {
      await createTag(name, color);
      await refreshBoardData();
    },
    [refreshBoardData],
  );

  const onUpdateTag = useCallback(
    async (tagId: number, name: string, color: string) => {
      await patchTag(tagId, { name, color });
      await refreshBoardData();
    },
    [refreshBoardData],
  );

  return {
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
  };
};
