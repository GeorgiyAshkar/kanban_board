import { useEffect, useMemo, useState } from 'react';
import type { ChecklistItem, HistoryItem, Task, TaskComment, TaskReminder } from '../../types/task';
import type { Tag } from '../../api/tasks';

interface Props {
  task?: Task;
  comments: TaskComment[];
  reminders: TaskReminder[];
  checklist: ChecklistItem[];
  history: HistoryItem[];
  taskTags: Tag[];
  allTags: Tag[];
  onAddComment: (text: string) => Promise<void>;
  onToggleChecklist: (itemId: number, isDone: boolean) => Promise<void>;
  onAddChecklist: (title: string) => Promise<void>;
  onSaveTask: (patch: Partial<Task>) => Promise<void>;
  onAddTag: (tagId: number) => Promise<void>;
  onRemoveTag: (tagId: number) => Promise<void>;
  onCreateTagAndAdd: (name: string) => Promise<void>;
  onArchiveTask: () => Promise<void>;
}

export function TaskDrawer({
  task,
  comments,
  reminders,
  checklist,
  history,
  taskTags,
  allTags,
  onAddComment,
  onToggleChecklist,
  onAddChecklist,
  onSaveTask,
  onAddTag,
  onRemoveTag,
  onCreateTagAndAdd,
  onArchiveTask,
}: Props) {
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'tags' | 'checklist' | 'comments' | 'history'>('tags');
  const [draftTitle, setDraftTitle] = useState(task?.title ?? '');
  const [draftDescription, setDraftDescription] = useState(task?.description ?? '');
  const [draftStatus, setDraftStatus] = useState(task?.status ?? 'inbox');
  const [draftPriority, setDraftPriority] = useState(task?.priority ?? 'normal');

  const freeTags = useMemo(() => allTags.filter((tag) => !taskTags.some((tt) => tt.id === tag.id)), [allTags, taskTags]);

  useEffect(() => {
    if (!task) return;
    setDraftTitle(task.title);
    setDraftDescription(task.description);
    setDraftStatus(task.status);
    setDraftPriority(task.priority);
  }, [task]);

  if (!task) {
    return <aside className="drawer"><div className="section"><h4>Выберите задачу</h4></div></aside>;
  }

  return (
    <aside className="drawer">
      <div className="drawer-header">
        <h2 className="drawer-title">{task.title}</h2>
        <div className="badges">
          <span className="badge" style={{ background: '#3b82f6' }}>{task.status}</span>
          <span className="badge" style={{ background: '#ec4899' }}>{task.priority}</span>
          {task.deadline_at && <span className="muted">Дедлайн: {new Date(task.deadline_at).toLocaleDateString()}</span>}
        </div>
      </div>

      <section className="section">
        <h4>Редактирование</h4>
        <div className="editor-grid">
          <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Название" />
          <textarea value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} placeholder="Описание" rows={3} />
          <div className="row-fields">
            <select className="select-styled" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}>
              <option value="inbox">Входящие</option>
              <option value="todo">К выполнению</option>
              <option value="in_progress">В работе</option>
              <option value="paused">На паузе</option>
              <option value="done">Готово</option>
            </select>
            <select className="select-styled" value={draftPriority} onChange={(e) => setDraftPriority(e.target.value)}>
              <option value="low">Низкий</option>
              <option value="normal">Обычный</option>
              <option value="high">Высокий</option>
              <option value="critical">Критический</option>
            </select>
          </div>
          <button
            className="small-btn"
            onClick={async () => {
              await onSaveTask({ title: draftTitle, description: draftDescription, status: draftStatus, priority: draftPriority as Task['priority'] });
            }}
          >
            Сохранить изменения
          </button>
          <button className="small-btn" onClick={() => void onArchiveTask()}>
            Архивировать задачу
          </button>
        </div>
      </section>

      <section className="section tabs-section">
        <div className="tabs-head">
          <button className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')}>Теги</button>
          <button className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`} onClick={() => setActiveTab('checklist')}>Чек-лист</button>
          <button className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>Комментарии</button>
          <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>История</button>
        </div>

        {activeTab === 'tags' && (
          <div className="tab-body">
            <div className="badges">
              {taskTags.map((tag) => (
                <button key={tag.id} className="badge" style={{ background: tag.color }} onClick={() => onRemoveTag(tag.id)}>
                  {tag.name} ×
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <select
                className="select-styled"
                onChange={async (e) => {
                  const tagId = Number(e.target.value);
                  if (!tagId) return;
                  await onAddTag(tagId);
                  e.currentTarget.value = '';
                }}
              >
                <option value="">Добавить тег...</option>
                {freeTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
              <button
                className="small-btn"
                style={{ marginLeft: 8 }}
                onClick={async () => {
                  const name = window.prompt('Название нового тега');
                  if (!name) return;
                  await onCreateTagAndAdd(name);
                }}
              >
                + Новый тег
              </button>
            </div>
          </div>
        )}

        {activeTab === 'checklist' && (
          <div className="tab-body">
            <ul>
              {checklist.map((item) => (
                <li key={item.id}>
                  <label>
                    <input type="checkbox" checked={item.is_done} onChange={() => onToggleChecklist(item.id, !item.is_done)} /> {item.title}
                  </label>
                </li>
              ))}
            </ul>
            <button className="small-btn" onClick={async () => { const title = window.prompt('Новый пункт чек-листа'); if (title) await onAddChecklist(title); }}>
              Добавить пункт
            </button>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="tab-body">
            {comments.map((comment) => (
              <p key={comment.id}><b>{comment.author}:</b> {comment.text}</p>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="tab-body">
            {history.map((item) => (
              <p key={item.id}>{new Date(item.created_at).toLocaleString()} — {item.action_type}</p>
            ))}
          </div>
        )}
      </section>

      <div className="comment-input">
        <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Добавить комментарий..." />
        <button className="primary-btn" onClick={async () => { if (!commentText.trim()) return; await onAddComment(commentText); setCommentText(''); }}>
          Отправить
        </button>
      </div>
    </aside>
  );
}
