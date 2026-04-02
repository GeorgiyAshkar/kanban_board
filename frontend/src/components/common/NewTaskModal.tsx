import { useEffect, useState } from 'react';
import type { BoardColumn } from '../../types/task';

interface Props {
  open: boolean;
  columns: BoardColumn[];
  onClose: () => void;
  onSubmit: (payload: { title: string; description: string; boardColumnId: number; status: string; priority: 'low' | 'normal' | 'high' | 'critical' }) => Promise<void>;
}

export function NewTaskModal({ open, columns, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState<number>(columns[0]?.id ?? 0);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');

  useEffect(() => {
    if (!open) return;
    setColumnId(columns[0]?.id ?? 0);
  }, [open, columns]);

  if (!open) return null;

  const mapStatusByColumn = (columnName: string) => {
    const name = columnName.toLowerCase();
    if (name.includes('вход')) return 'inbox';
    if (name.includes('выполн')) return 'todo';
    if (name.includes('работ')) return 'in_progress';
    if (name.includes('пауз')) return 'paused';
    if (name.includes('готов')) return 'done';
    return 'inbox';
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Новая задача</h3>
        <div className="modal-grid">
          <label>Название</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Введите название" />

          <label>Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Введите описание" />

          <label>Колонка</label>
          <select value={columnId} onChange={(e) => setColumnId(Number(e.target.value))}>
            {columns.map((col) => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>

          <label>Приоритет</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high' | 'critical')}>
            <option value="low">Низкий</option>
            <option value="normal">Обычный</option>
            <option value="high">Высокий</option>
            <option value="critical">Критический</option>
          </select>
        </div>

        <div className="modal-actions">
          <button className="small-btn" onClick={onClose}>Отмена</button>
          <button
            className="primary-btn"
            onClick={async () => {
              if (!title.trim()) return;
              const selectedColumn = columns.find((c) => c.id === columnId) ?? columns[0];
              await onSubmit({
                title: title.trim(),
                description: description.trim(),
                boardColumnId: selectedColumn?.id ?? 0,
                status: mapStatusByColumn(selectedColumn?.name ?? 'Входящие'),
                priority,
              });
              setTitle('');
              setDescription('');
              setPriority('normal');
              onClose();
            }}
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}
