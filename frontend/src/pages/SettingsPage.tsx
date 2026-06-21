import { useState } from 'react';
import type { AssigneeProfile, BoardColumn } from '../types/task';
import type { BackupImportResponse, BackupPayload, Tag } from '../api/tasks';

interface Props {
  columns: BoardColumn[];
  tags: Tag[];
  onCreateColumn: (name: string) => Promise<void>;
  onRenameColumn: (columnId: number, name: string) => Promise<void>;
  onUpdateColumnColor: (columnId: number, color: string) => Promise<void>;
  onUpdateColumnWipLimit: (columnId: number, value: number | null) => Promise<void>;
  onUpdateColumnSlaHours: (columnId: number, value: number | null) => Promise<void>;
  onCreateTag: (name: string, color: string) => Promise<void>;
  onUpdateTag: (tagId: number, name: string, color: string) => Promise<void>;
  onExportBackup: (kind: 'json' | 'csv' | 'archive') => Promise<void>;
  onImportBackup: (backup: BackupPayload, mode: 'merge' | 'replace_all') => Promise<BackupImportResponse>;
  onDryRunBackupImport: (backup: BackupPayload, mode: 'merge' | 'replace_all') => Promise<BackupImportResponse>;
  assigneeProfiles: AssigneeProfile[];
  onCreateAssigneeProfile: (profile: Omit<AssigneeProfile, 'id'>) => void;
  onUpdateAssigneeProfile: (profileId: string, profile: Omit<AssigneeProfile, 'id'>) => void;
  onDeleteAssigneeProfile: (profileId: string) => void;
}

export function SettingsPage({
  columns,
  tags,
  onCreateColumn,
  onRenameColumn,
  onUpdateColumnColor,
  onUpdateColumnWipLimit,
  onUpdateColumnSlaHours,
  onCreateTag,
  onUpdateTag,
  onExportBackup,
  onImportBackup,
  onDryRunBackupImport,
  assigneeProfiles,
  onCreateAssigneeProfile,
  onUpdateAssigneeProfile,
  onDeleteAssigneeProfile,
}: Props) {
  const [newColumn, setNewColumn] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#64748b');
  const [importMode, setImportMode] = useState<'merge' | 'replace_all'>('merge');
  const [backupPreview, setBackupPreview] = useState<BackupImportResponse | null>(null);
  const [loadedBackup, setLoadedBackup] = useState<BackupPayload | null>(null);
  const [newAssignee, setNewAssignee] = useState<Omit<AssigneeProfile, 'id'>>({
    last_name: '',
    first_name: '',
    middle_name: '',
    phone: '',
    email: '',
    org: '',
  });

  const updateNewAssigneeField = (field: keyof Omit<AssigneeProfile, 'id'>, value: string) => {
    setNewAssignee((prev) => ({ ...prev, [field]: value }));
  };

  const normalizeAssignee = (profile: Omit<AssigneeProfile, 'id'>): Omit<AssigneeProfile, 'id'> => ({
    last_name: profile.last_name.trim(),
    first_name: profile.first_name.trim(),
    middle_name: profile.middle_name.trim(),
    phone: profile.phone.trim(),
    email: profile.email.trim(),
    org: profile.org.trim(),
  });

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
              <input
                className="settings-input"
                type="number"
                min={1}
                max={999}
                defaultValue={col.wip_limit ?? ''}
                placeholder="WIP"
                onBlur={async (e) => {
                  const raw = e.target.value.trim();
                  const next = raw ? Number(raw) : null;
                  if (!raw) {
                    if (col.wip_limit != null) await onUpdateColumnWipLimit(col.id, null);
                    return;
                  }
                  if (next == null || Number.isNaN(next) || next < 1 || next > 999 || next === col.wip_limit) return;
                  await onUpdateColumnWipLimit(col.id, next);
                }}
              />
              <input
                className="settings-input"
                type="number"
                min={1}
                max={720}
                defaultValue={col.sla_hours ?? ''}
                placeholder="Срок, ч"
                onBlur={async (e) => {
                  const raw = e.target.value.trim();
                  const next = raw ? Number(raw) : null;
                  if (!raw) {
                    if (col.sla_hours != null) await onUpdateColumnSlaHours(col.id, null);
                    return;
                  }
                  if (next == null || Number.isNaN(next) || next < 1 || next > 720 || next === col.sla_hours) return;
                  await onUpdateColumnSlaHours(col.id, next);
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
          <h4>Резервные копии и восстановление</h4>
          <div className="settings-row">
            <button className="small-btn" onClick={() => void onExportBackup('json')}>Экспорт JSON</button>
            <button className="small-btn" onClick={() => void onExportBackup('csv')}>Экспорт CSV</button>
            <button className="small-btn" onClick={() => void onExportBackup('archive')}>Скачать архив</button>
          </div>
          <div className="settings-row">
            <label className="settings-hint">
              Режим импорта:
              <select
                className="select-styled"
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace_all')}
              >
                <option value="merge">Merge (добавить)</option>
                <option value="replace_all">Replace all (полное восстановление)</option>
              </select>
            </label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const backup = JSON.parse(text) as BackupPayload;
                setLoadedBackup(backup);
                const preview = await onDryRunBackupImport(backup, importMode);
                setBackupPreview(preview);
              }}
            />
            <button
              className="small-btn"
              onClick={async () => {
                const input = window.prompt('Вставьте JSON бэкапа');
                if (!input?.trim()) return;
                const backup = JSON.parse(input) as BackupPayload;
                setLoadedBackup(backup);
                const preview = await onDryRunBackupImport(backup, importMode);
                setBackupPreview(preview);
              }}
            >
              Dry-run из JSON
            </button>
          </div>
          {backupPreview && (
            <div className="settings-hint settings-preview">
              Dry-run: tasks={backupPreview.tasks_to_import}, tags={backupPreview.tags_to_create}, columns={backupPreview.columns_to_create}
              <button
                className="small-btn"
                onClick={async () => {
                  if (!loadedBackup) return;
                  const result = await onImportBackup(loadedBackup, importMode);
                  setBackupPreview(result);
                }}
                disabled={!loadedBackup}
              >
                Выполнить импорт
              </button>
            </div>
          )}
        </div>

        <div className="settings-card settings-card-wide">
          <h4>Исполнители</h4>
          <p className="settings-hint">Составьте справочник исполнителей: эти данные можно выбрать при создании новой задачи.</p>
          {assigneeProfiles.map((profile) => (
            <div key={profile.id} className="settings-assignee-row">
              <input
                className="settings-input"
                defaultValue={profile.last_name}
                onBlur={(e) => onUpdateAssigneeProfile(profile.id, { ...profile, last_name: e.target.value.trim() })}
                placeholder="Фамилия"
              />
              <input
                className="settings-input"
                defaultValue={profile.first_name}
                onBlur={(e) => onUpdateAssigneeProfile(profile.id, { ...profile, first_name: e.target.value.trim() })}
                placeholder="Имя"
              />
              <input
                className="settings-input"
                defaultValue={profile.middle_name}
                onBlur={(e) => onUpdateAssigneeProfile(profile.id, { ...profile, middle_name: e.target.value.trim() })}
                placeholder="Отчество"
              />
              <input
                className="settings-input"
                defaultValue={profile.phone}
                onBlur={(e) => onUpdateAssigneeProfile(profile.id, { ...profile, phone: e.target.value.trim() })}
                placeholder="Мобильный телефон"
              />
              <input
                className="settings-input"
                defaultValue={profile.email}
                onBlur={(e) => onUpdateAssigneeProfile(profile.id, { ...profile, email: e.target.value.trim() })}
                placeholder="Email"
              />
              <input
                className="settings-input"
                defaultValue={profile.org}
                onBlur={(e) => onUpdateAssigneeProfile(profile.id, { ...profile, org: e.target.value.trim() })}
                placeholder="Организация"
              />
              <button className="small-btn" onClick={() => onDeleteAssigneeProfile(profile.id)} aria-label="Удалить исполнителя">Удалить</button>
            </div>
          ))}

          <div className="settings-assignee-row settings-assignee-new">
            <input className="settings-input" value={newAssignee.last_name} onChange={(e) => updateNewAssigneeField('last_name', e.target.value)} placeholder="Фамилия" />
            <input className="settings-input" value={newAssignee.first_name} onChange={(e) => updateNewAssigneeField('first_name', e.target.value)} placeholder="Имя" />
            <input className="settings-input" value={newAssignee.middle_name} onChange={(e) => updateNewAssigneeField('middle_name', e.target.value)} placeholder="Отчество" />
            <input className="settings-input" value={newAssignee.phone} onChange={(e) => updateNewAssigneeField('phone', e.target.value)} placeholder="Мобильный телефон" />
            <input className="settings-input" value={newAssignee.email} onChange={(e) => updateNewAssigneeField('email', e.target.value)} placeholder="Email" />
            <input className="settings-input" value={newAssignee.org} onChange={(e) => updateNewAssigneeField('org', e.target.value)} placeholder="Организация" />
            <button
              className="small-btn"
              onClick={() => {
                const normalized = normalizeAssignee(newAssignee);
                if (!Object.values(normalized).some(Boolean)) return;
                onCreateAssigneeProfile(normalized);
                setNewAssignee({ last_name: '', first_name: '', middle_name: '', phone: '', email: '', org: '' });
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
