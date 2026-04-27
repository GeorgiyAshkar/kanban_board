import { useEffect, useState } from 'react';
import type { BoardTaskMetadata, Tag } from '../api/tasks';
import type { ChecklistItem } from '../types/task';

type UseTaskDetailsParams = {
  metadata: BoardTaskMetadata[];
  activeTaskId: number | null;
  activeTaskChecklist: ChecklistItem[];
};

export const useTaskDetails = ({ metadata, activeTaskId, activeTaskChecklist }: UseTaskDetailsParams) => {
  const [taskTagsByTaskId, setTaskTagsByTaskId] = useState<Record<number, Tag[]>>({});
  const [taskChecklistByTaskId, setTaskChecklistByTaskId] = useState<Record<number, ChecklistItem[]>>({});

  useEffect(() => {
    setTaskTagsByTaskId(Object.fromEntries(metadata.map((item) => [item.task_id, item.tags])));
    setTaskChecklistByTaskId(Object.fromEntries(metadata.map((item) => [item.task_id, item.checklist])));
  }, [metadata]);

  useEffect(() => {
    if (!activeTaskId) return;
    setTaskChecklistByTaskId((prev) => ({
      ...prev,
      [activeTaskId]: activeTaskChecklist ?? [],
    }));
  }, [activeTaskId, activeTaskChecklist]);

  return {
    taskTagsByTaskId,
    taskChecklistByTaskId,
    setTaskChecklistByTaskId,
  };
};
