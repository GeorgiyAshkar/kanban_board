import { useMemo, useState } from 'react';
import { BoardView } from '../components/board/BoardView';
import { TaskDrawer } from '../components/task/TaskDrawer';
import type { BoardColumn, ChecklistItem, HistoryItem, Task, TaskComment, TaskReminder } from '../types/task';
import type { Tag } from '../api/tasks';


const getAssigneeName = (task: Task): string => {
  const fullName = [task.assignee_last_name, task.assignee_first_name, task.assignee_middle_name].filter(Boolean).join(' ').trim();
  return fullName || task.assignee_email || task.assignee_org || 'Без исполнителя';
};

interface Props {
  columns: BoardColumn[];
  tasks: Task[];
  query: string;
  activeTaskId: number | null;
  setActiveTaskId: (taskId: number | null) => void;
  comments: TaskComment[];
  reminders: TaskReminder[];
  checklist: ChecklistItem[];
  taskHistory: HistoryItem[];
  onAddComment: (text: string) => Promise<void>;
  onToggleChecklist: (itemId: number, isDone: boolean, taskId?: number) => Promise<void>;
  onAddChecklist: (title: string) => Promise<void>;
  onEditChecklist: (itemId: number, title: string) => Promise<void>;
  onDeleteChecklist: (itemId: number) => Promise<void>;
  onMoveTask: (taskId: number, columnId: number, position: number) => Promise<void>;
  onSaveTask: (patch: Partial<Task>) => Promise<void>;
  taskTags: Tag[];
  allTags: Tag[];
  onAddTag: (tagId: number) => Promise<void>;
  onRemoveTag: (tagId: number) => Promise<void>;
  onCreateTagAndAdd: (name: string) => Promise<void>;
  taskTagsByTaskId: Record<number, Tag[]>;
  taskChecklistByTaskId: Record<number, ChecklistItem[]>;
  onArchiveTask: () => Promise<void>;
}

export function BoardPage({
  columns,
  tasks,
  query,
  activeTaskId,
  setActiveTaskId,
  comments,
  reminders,
  checklist,
  taskHistory,
  onAddComment,
  onToggleChecklist,
  onAddChecklist,
  onEditChecklist,
  onDeleteChecklist,
  onMoveTask,
  onSaveTask,
  taskTags,
  allTags,
  onAddTag,
  onRemoveTag,
  onCreateTagAndAdd,
  taskTagsByTaskId,
  taskChecklistByTaskId,
  onArchiveTask,
}: Props) {
  const [laneMode, setLaneMode] = useState<'none' | 'priority' | 'assignee' | 'project' | 'blocked' | 'serviceClass' | 'workType'>('none');
  const [viewMode, setViewMode] = useState<'board' | 'table' | 'calendar'>('board');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');

  const searchedTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }, [tasks, query]);

  const projectOptions = useMemo(
    () => Array.from(new Set(searchedTasks.map((task) => task.project_id?.trim()).filter((project): project is string => Boolean(project)))).sort((a, b) => a.localeCompare(b, 'ru')),
    [searchedTasks],
  );

  const assigneeOptions = useMemo(
    () => Array.from(new Set(searchedTasks.map(getAssigneeName))).sort((a, b) => a.localeCompare(b, 'ru')),
    [searchedTasks],
  );

  const visibleTasks = useMemo(() => searchedTasks.filter((task) => {
    const projectName = task.project_id?.trim() || '';
    const assigneeName = getAssigneeName(task);
    return (!selectedProject || projectName === selectedProject) && (!selectedAssignee || assigneeName === selectedAssignee);
  }), [searchedTasks, selectedProject, selectedAssignee]);

  const projectAssignees = useMemo(() => {
    if (!selectedProject) return [];
    return Array.from(new Set(searchedTasks
      .filter((task) => (task.project_id?.trim() || '') === selectedProject)
      .map(getAssigneeName)))
      .sort((a, b) => a.localeCompare(b, 'ru'));
  }, [searchedTasks, selectedProject]);

  const assigneeProjects = useMemo(() => {
    if (!selectedAssignee) return [];
    return Array.from(new Set(searchedTasks
      .filter((task) => getAssigneeName(task) === selectedAssignee)
      .map((task) => task.project_id?.trim() || 'Без проекта')))
      .sort((a, b) => a.localeCompare(b, 'ru'));
  }, [searchedTasks, selectedAssignee]);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <div className="board-layout">
      <BoardView
        columns={columns}
        laneMode={laneMode}
        onLaneModeChange={setLaneMode}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedProject={selectedProject}
        onSelectedProjectChange={setSelectedProject}
        projectOptions={projectOptions}
        selectedAssignee={selectedAssignee}
        onSelectedAssigneeChange={setSelectedAssignee}
        assigneeOptions={assigneeOptions}
        projectAssignees={projectAssignees}
        assigneeProjects={assigneeProjects}
        totalTasksCount={searchedTasks.length}
        tasks={visibleTasks}
        onOpenTask={setActiveTaskId}
        onMoveTask={onMoveTask}
        onToggleChecklist={onToggleChecklist}
        taskTagsByTaskId={taskTagsByTaskId}
        taskChecklistByTaskId={taskChecklistByTaskId}
      />
      <TaskDrawer
        task={activeTask}
        comments={comments}
        reminders={reminders}
        checklist={checklist}
        history={taskHistory}
        onAddComment={onAddComment}
        onToggleChecklist={onToggleChecklist}
        onAddChecklist={onAddChecklist}
        onEditChecklist={onEditChecklist}
        onDeleteChecklist={onDeleteChecklist}
        onSaveTask={onSaveTask}
        taskTags={taskTags}
        allTags={allTags}
        projectOptions={projectOptions}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onCreateTagAndAdd={onCreateTagAndAdd}
        onArchiveTask={onArchiveTask}
      />
    </div>
  );
}
