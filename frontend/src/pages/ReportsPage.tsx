import type { AnalyticsReport } from '../api/tasks';

interface Props {
  report?: AnalyticsReport;
  loading: boolean;
  days: number;
  bucket: 'day' | 'week';
  onDaysChange: (days: number) => void;
  onBucketChange: (bucket: 'day' | 'week') => void;
}

const fmt = (value?: number | null) => (value == null ? '—' : `${value.toFixed(1)} ч`);

const serviceClassLabels: Record<string, string> = {
  standard: 'Стандартный',
  fixed_date: 'Фиксированная дата',
  expedite: 'Срочный',
  intangible: 'Улучшение',
};

const workTypeLabels: Record<string, string> = {
  feature: 'Фича',
  bug: 'Баг',
  support: 'Поддержка',
  ops: 'Операции',
  research: 'Исследование',
};

export function ReportsPage({ report, loading, days, bucket, onDaysChange, onBucketChange }: Props) {
  const maxCompleted = Math.max(...(report?.trend.map((item) => item.completed_tasks) ?? [1]));
  const maxFlow = Math.max(...(report?.trend.flatMap((item) => [item.created_tasks, item.completed_tasks, item.wip_open_tasks, item.overdue_open_tasks]) ?? [1]));

  return (
    <section className="reports-page">
      <div className="reports-head">
        <h3>Аналитика и отчеты</h3>
        <label>
          Период
          <select value={days} onChange={(e) => onDaysChange(Number(e.target.value))}>
            <option value={14}>14 дней</option>
            <option value={30}>30 дней</option>
            <option value={60}>60 дней</option>
            <option value={90}>90 дней</option>
          </select>
        </label>
        <label>
          Гранулярность
          <select value={bucket} onChange={(e) => onBucketChange(e.target.value as 'day' | 'week')}>
            <option value="day">По дням</option>
            <option value="week">По неделям</option>
          </select>
        </label>
      </div>

      {loading && <p className="muted">Загружаем аналитику…</p>}

      {report && (
        <>
          <div className="reports-grid">
            <article className="settings-card">
              <h4>Время выполнения</h4>
              <p>{fmt(report.summary.avg_lead_time_hours)}</p>
            </article>
            <article className="settings-card">
              <h4>Время в работе</h4>
              <p>{fmt(report.summary.avg_cycle_time_hours)}</p>
            </article>
            <article className="settings-card">
              <h4>Незавершенная работа</h4>
              <p>{report.summary.wip_open_tasks}</p>
            </article>
            <article className="settings-card">
              <h4>Просрочки</h4>
              <p>{report.summary.overdue_open_tasks}</p>
            </article>
            <article className="settings-card">
              <h4>Блокировки</h4>
              <p>{report.summary.blocked_open_tasks}</p>
            </article>
            <article className="settings-card">
              <h4>Эффективность потока</h4>
              <p>{report.summary.flow_efficiency_percent == null ? '—' : `${report.summary.flow_efficiency_percent.toFixed(1)}%`}</p>
            </article>
            <article className="settings-card">
              <h4>Скорость завершения</h4>
              <p>{report.summary.velocity_per_period.toFixed(2)} / период</p>
            </article>
          </div>

          <div className="settings-card reports-chart">
            <h4>Распределение активного WIP</h4>
            <div className="report-breakdown">
              <div>
                <strong>Классы обслуживания</strong>
                {Object.entries(report.summary.service_class_counts ?? {}).map(([name, count]) => (
                  <p key={`sc-${name}`}><span className="badge">{serviceClassLabels[name] ?? name}</span> {count}</p>
                ))}
              </div>
              <div>
                <strong>Типы работ</strong>
                {Object.entries(report.summary.work_type_counts ?? {}).map(([name, count]) => (
                  <p key={`wt-${name}`}><span className="badge">{workTypeLabels[name] ?? name}</span> {count}</p>
                ))}
              </div>
            </div>
          </div>


          <div className="settings-card reports-chart">
            <h4>Накопительный поток и загрузка</h4>
            <div className="flow-list">
              {report.trend.map((item) => (
                <div key={`flow-${item.period_start}`} className="flow-row">
                  <div className="trend-label">
                    {new Date(item.period_start).toLocaleDateString()} — {new Date(item.period_end).toLocaleDateString()}
                  </div>
                  <div className="flow-bars">
                    <span className="flow-bar created" style={{ width: `${(item.created_tasks / maxFlow) * 100}%` }} title={`Создано: ${item.created_tasks}`} />
                    <span className="flow-bar completed" style={{ width: `${(item.completed_tasks / maxFlow) * 100}%` }} title={`Завершено: ${item.completed_tasks}`} />
                    <span className="flow-bar wip" style={{ width: `${(item.wip_open_tasks / maxFlow) * 100}%` }} title={`WIP: ${item.wip_open_tasks}`} />
                    <span className="flow-bar overdue" style={{ width: `${(item.overdue_open_tasks / maxFlow) * 100}%` }} title={`Просрочено: ${item.overdue_open_tasks}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="report-legend">
              <span className="legend-dot created" /> Создано
              <span className="legend-dot completed" /> Завершено
              <span className="legend-dot wip" /> WIP
              <span className="legend-dot overdue" /> Просрочки
            </div>
          </div>

          <div className="settings-card reports-chart">
            <h4>Тренд velocity (завершенные задачи)</h4>
            <div className="trend-list">
              {report.trend.map((item) => (
                <div key={item.period_start} className="trend-row">
                  <div className="trend-label">
                    {new Date(item.period_start).toLocaleDateString()} — {new Date(item.period_end).toLocaleDateString()}
                  </div>
                  <div className="trend-bar-wrap">
                    <div className="trend-bar" style={{ width: `${(item.completed_tasks / maxCompleted) * 100}%` }} />
                  </div>
                  <div className="trend-value">{item.completed_tasks}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
