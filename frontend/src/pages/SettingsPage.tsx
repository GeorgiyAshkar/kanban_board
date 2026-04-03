import { useState } from 'react';
import type { BoardColumn } from '../types/task';
import type { Tag } from '../api/tasks';

interface Props {
  columns: BoardColumn[];
  tags: Tag[];
  onCreateColumn: (name: string) => Promise<void>;
  onRenameColumn: (columnId: number, name: string) => Promise<void>;
  onUpdateColumnColor: (columnId: number, color: string) => Promise<void>;
  onCreateTag: (name: string, color: string) => Promise<void>;
  onUpdateTag: (tagId: number, name: string, color: string) => Promise<void>;
}

export function SettingsPage({ columns, tags, onCreateColumn, onRenameColumn, onUpdateColumnColor, onCreateTag, onUpdateTag }: Props) {
  const [newColumn, setNewColumn] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#64748b');

  return (
    <section className="settings-page">
      <h3>Настройки</h3>

      <div className="settings-grid">
        <div className="settings-card">
          <h4>Колонки доски</h4>
          {columns.map((col) => (
            <div key={col.id} className="settings-row">
              <input
                className="settings-input"
                defaultValue={col.name}
                onBlur={async (e) => {
                  const name = e.target.value.trim();
                  if (name && name !== col.name) await onRenameColumn(col.id, name);
                }}
              />
              <input
                type="color"
                value={col.color ?? '#e2e8f0'}
                onChange={async (e) => {
                  await onUpdateColumnColor(col.id, e.target.value);
                }}
              />
              <span className="settings-hint">{col.is_system ? 'system' : 'custom'}</span>
            </div>
          ))}

          <div className="settings-row">
            <input className="settings-input" value={newColumn} onChange={(e) => setNewColumn(e.target.value)} placeholder="Новая колонка" />
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

        <div className="settings-card">
          <h4>Теги</h4>
          {tags.map((tag) => (
            <div key={tag.id} className="settings-row">
              <input
                className="settings-input"
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

          <div className="settings-row">
            <input className="settings-input" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Новый тег" />
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
      </div>
    </section>
  );
}
