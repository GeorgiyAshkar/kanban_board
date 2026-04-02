import { useState } from 'react';
import type { BoardColumn } from '../types/task';
import type { Tag } from '../api/tasks';

interface Props {
  columns: BoardColumn[];
  tags: Tag[];
  onCreateColumn: (name: string) => Promise<void>;
  onRenameColumn: (columnId: number, name: string) => Promise<void>;
  onCreateTag: (name: string, color: string) => Promise<void>;
  onUpdateTag: (tagId: number, name: string, color: string) => Promise<void>;
}

export function SettingsPage({ columns, tags, onCreateColumn, onRenameColumn, onCreateTag, onUpdateTag }: Props) {
  const [newColumn, setNewColumn] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#64748b');

  return (
    <section className="history-panel">
      <h3>Настройки</h3>

      <div className="history-row">
        <h4>Колонки</h4>
        {columns.map((col) => (
          <div key={col.id} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input
              defaultValue={col.name}
              onBlur={async (e) => {
                const name = e.target.value.trim();
                if (name && name !== col.name) await onRenameColumn(col.id, name);
              }}
            />
            <span>{col.is_system ? 'system' : 'custom'}</span>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input value={newColumn} onChange={(e) => setNewColumn(e.target.value)} placeholder="Новая колонка" />
          <button
            className="small-btn"
            onClick={async () => {
              if (!newColumn.trim()) return;
              await onCreateColumn(newColumn.trim());
              setNewColumn('');
            }}
          >
            Добавить
          </button>
        </div>
      </div>

      <div className="history-row">
        <h4>Теги</h4>
        {tags.map((tag) => (
          <div key={tag.id} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input
              defaultValue={tag.name}
              onBlur={async (e) => {
                const name = e.target.value.trim();
                if (name && name !== tag.name) await onUpdateTag(tag.id, name, tag.color);
              }}
            />
            <input
              type="color"
              defaultValue={tag.color}
              onBlur={async (e) => {
                const color = e.target.value;
                if (color !== tag.color) await onUpdateTag(tag.id, tag.name, color);
              }}
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Новый тег" />
          <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} />
          <button
            className="small-btn"
            onClick={async () => {
              if (!newTagName.trim()) return;
              await onCreateTag(newTagName.trim(), newTagColor);
              setNewTagName('');
            }}
          >
            Добавить
          </button>
        </div>
      </div>
    </section>
  );
}
