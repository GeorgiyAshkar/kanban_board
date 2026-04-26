import { useState } from 'react';
import type { BoardColumn } from '../types/task';
import { downloadBackupArchive, downloadBackupCsv, fetchBackupJson, importBackup, type BackupPayload, type BackupImportResponse, type Tag } from '../api/tasks';

interface Props {
  columns: BoardColumn[];
  tags: Tag[];
  onCreateColumn: (name: string) => Promise<void>;
  onRenameColumn: (columnId: number, name: string) => Promise<void>;
  onUpdateColumnColor: (columnId: number, color: string) => Promise<void>;
  onCreateTag: (name: string, color: string) => Promise<void>;
  onUpdateTag: (tagId: number, name: string, color: string) => Promise<void>;
  onBackupImported: () => Promise<void>;
}

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export function SettingsPage({
  columns,
  tags,
  onCreateColumn,
  onRenameColumn,
  onUpdateColumnColor,
  onCreateTag,
  onUpdateTag,
  onBackupImported,
}: Props) {
  const [newColumn, setNewColumn] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#64748b');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [importResult, setImportResult] = useState<BackupImportResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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

        <div className="settings-card">
          <h4>Импорт / экспорт / бэкап</h4>
          <div className="settings-row">
            <button
              className="small-btn"
              onClick={async () => {
                const backup = await fetchBackupJson();
                saveBlob(
                  new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' }),
                  `kanban_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`,
                );
              }}
            >
              Экспорт JSON
            </button>
            <button
              className="small-btn"
              onClick={async () => {
                const blob = await downloadBackupCsv();
                saveBlob(blob, `kanban_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`);
              }}
            >
              Экспорт CSV
            </button>
            <button
              className="small-btn"
              onClick={async () => {
                const blob = await downloadBackupArchive();
                saveBlob(blob, `kanban_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.zip`);
              }}
            >
              Скачать архив
            </button>
          </div>
          <div className="settings-row">
            <input
              className="settings-input"
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setImportFile(file);
              }}
            />
            <label className="settings-hint">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} /> dry-run
            </label>
            <button
              className="small-btn"
              onClick={async () => {
                setImportError(null);
                setImportResult(null);
                if (!importFile) return;
                try {
                  const text = await importFile.text();
                  const parsed = JSON.parse(text) as BackupPayload;
                  const result = await importBackup(parsed, dryRun);
                  setImportResult(result);
                  if (!dryRun) {
                    await onBackupImported();
                  }
                } catch (error) {
                  setImportError(error instanceof Error ? error.message : 'Ошибка импорта');
                }
              }}
            >
              Импортировать
            </button>
          </div>
          {importResult && (
            <p className="settings-hint">
              {importResult.dry_run ? 'Dry-run:' : 'Импорт:'} задач {importResult.tasks_to_import}, новых колонок{' '}
              {importResult.dry_run ? importResult.columns_to_create : importResult.created_columns}, новых тегов{' '}
              {importResult.dry_run ? importResult.tags_to_create : importResult.created_tags}.
            </p>
          )}
          {importError && <p className="settings-hint">Ошибка: {importError}</p>}
        </div>
      </div>
    </section>
  );
}
