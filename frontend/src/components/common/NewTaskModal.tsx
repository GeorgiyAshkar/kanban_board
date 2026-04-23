import { useEffect, useState } from 'react';
import type { BoardColumn } from '../../types/task';

interface Props {
  open: boolean;
  columns: BoardColumn[];
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description: string;
    boardColumnId: number;
    status: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    plannedReturnAt: string | null;
    deadlineAt: string | null;
  }) => Promise<void>;
}

export function NewTaskModal({ open, columns, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState<number>(columns[0]?.id ?? 0);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [plannedReturnAt, setPlannedReturnAt] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');

  useEffect(() => {
    if (!open) return;
    setColumnId(columns[0]?.id ?? 0);
  }, [open, columns]);

  if (!open) return null;

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
          <select className="select-styled" value={columnId} onChange={(e) => setColumnId(Number(e.target.value))}>
            {columns.map((col) => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>

          <label>Приоритет</label>
          <select className="select-styled" value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high' | 'critical')}>
            <option value="low">Низкий</option>
            <option value="normal">Обычный</option>
            <option value="high">Высокий</option>
            <option value="critical">Критический</option>
          </select>

          <label>Начало диапазона</label>
          <input type="date" value={plannedReturnAt} onChange={(e) => setPlannedReturnAt(e.target.value)} />

          <label>Конец диапазона</label>
          <input type="date" value={deadlineAt} onChange={(e) => setDeadlineAt(e.target.value)} />
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
                status: selectedColumn?.canonical_status ?? 'inbox',
                priority,
                plannedReturnAt: plannedReturnAt ? new Date(plannedReturnAt).toISOString() : null,
                deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : null,
              });
              setTitle('');
              setDescription('');
              setPriority('normal');
              setPlannedReturnAt('');
              setDeadlineAt('');
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
