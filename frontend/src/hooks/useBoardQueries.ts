import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchArchivedTasks,
  fetchBoardData,
  fetchHistory,
  fetchTags,
  fetchTaskDetails,
  fetchToday,
  type Tag,
} from '../api/tasks';
import type { ChecklistItem } from '../types/task';

export const useBoardQueries = (query: string, activeTaskId: number | null) => {
  const boardQuery = useQuery({ queryKey: ['board', query], queryFn: () => fetchBoardData(query) });
  const archivedQuery = useQuery({ queryKey: ['tasks', 'archived'], queryFn: fetchArchivedTasks });
  const historyQuery = useQuery({ queryKey: ['history'], queryFn: fetchHistory });
  const todayQuery = useQuery({ queryKey: ['today'], queryFn: fetchToday });
  const tagsQuery = useQuery({ queryKey: ['tags'], queryFn: fetchTags });

  const taskDetailsQuery = useQuery({
    queryKey: ['task-details', activeTaskId],
    queryFn: () => fetchTaskDetails(activeTaskId!),
    enabled: Boolean(activeTaskId),
  });

  const taskTagsByTaskId = useMemo<Record<number, Tag[]>>(() => {
    const metadata = boardQuery.data?.metadata ?? [];
    return Object.fromEntries(metadata.map((item) => [item.task_id, item.tags]));
  }, [boardQuery.data?.metadata]);

  const taskChecklistByTaskId = useMemo<Record<number, ChecklistItem[]>>(() => {
    const metadata = boardQuery.data?.metadata ?? [];
    const map = Object.fromEntries(metadata.map((item) => [item.task_id, item.checklist]));
    if (activeTaskId) {
      map[activeTaskId] = taskDetailsQuery.data?.checklist ?? [];
    }
    return map;
  }, [boardQuery.data?.metadata, activeTaskId, taskDetailsQuery.data?.checklist]);

  return {
    boardQuery,
    archivedQuery,
    historyQuery,
    todayQuery,
    tagsQuery,
    taskDetailsQuery,
    taskTagsByTaskId,
    taskChecklistByTaskId,
  };
};
