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

export function ReportsPage({ report, loading, days, bucket, onDaysChange, onBucketChange }: Props) {
  const maxCompleted = Math.max(...(report?.trend.map((item) => item.completed_tasks) ?? [1]));

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
              <h4>Lead time</h4>
              <p>{fmt(report.summary.avg_lead_time_hours)}</p>
            </article>
            <article className="settings-card">
              <h4>Cycle time</h4>
              <p>{fmt(report.summary.avg_cycle_time_hours)}</p>
            </article>
            <article className="settings-card">
              <h4>WIP</h4>
              <p>{report.summary.wip_open_tasks}</p>
            </article>
            <article className="settings-card">
              <h4>Просрочки</h4>
              <p>{report.summary.overdue_open_tasks}</p>
            </article>
            <article className="settings-card">
              <h4>Velocity</h4>
              <p>{report.summary.velocity_per_period.toFixed(2)} / период</p>
            </article>
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
