import { useState } from 'react';
import type { ChecklistItem, HistoryItem, Task, TaskComment, TaskReminder } from '../../types/task';

interface Props {
  task?: Task;
  comments: TaskComment[];
  reminders: TaskReminder[];
  checklist: ChecklistItem[];
  history: HistoryItem[];
  onAddComment: (text: string) => Promise<void>;
  onToggleChecklist: (itemId: number, isDone: boolean) => Promise<void>;
  onAddChecklist: (title: string) => Promise<void>;
}

export function TaskDrawer({
  task,
  comments,
  reminders,
  checklist,
  history,
  onAddComment,
  onToggleChecklist,
  onAddChecklist,
}: Props) {
  const [commentText, setCommentText] = useState('');

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
        <h4>Описание</h4>
        <p>{task.description || 'Нужно добавить описание задачи.'}</p>
      </section>

      <section className="section">
        <h4>Поля</h4>
        <p><b>Приоритет:</b> {task.priority}</p>
        <p><b>Дедлайн:</b> {task.deadline_at ? new Date(task.deadline_at).toLocaleString() : '—'}</p>
        <p><b>Напоминания:</b> {reminders.length}</p>
      </section>

      <section className="section">
        <h4>Чек-лист</h4>
        <ul>
          {checklist.map((item) => (
            <li key={item.id}>
              <label>
                <input
                  type="checkbox"
                  checked={item.is_done}
                  onChange={() => onToggleChecklist(item.id, !item.is_done)}
                />{' '}
                {item.title}
              </label>
            </li>
          ))}
        </ul>
        <button
          className="small-btn"
          onClick={async () => {
            const title = window.prompt('Новый пункт чек-листа');
            if (!title) return;
            await onAddChecklist(title);
          }}
        >
          Добавить пункт
        </button>
      </section>

      <section className="section">
        <h4>Комментарии</h4>
        {comments.map((comment) => (
          <p key={comment.id}><b>{comment.author}:</b> {comment.text}</p>
        ))}
      </section>

      <section className="section">
        <h4>История задачи</h4>
        {history.slice(0, 4).map((item) => (
          <p key={item.id}>{new Date(item.created_at).toLocaleString()} — {item.action_type}</p>
        ))}
      </section>

      <div className="comment-input">
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Добавить комментарий..."
        />
        <button
          className="primary-btn"
          onClick={async () => {
            if (!commentText.trim()) return;
            await onAddComment(commentText);
            setCommentText('');
          }}
        >
          Отправить
        </button>
      </div>
    </aside>
  );
}
