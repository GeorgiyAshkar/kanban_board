import { TodayBlocks } from '../components/reminders/TodayBlocks';
import type { TodayResponse } from '../types/task';

export function TodayPage({ today }: { today?: TodayResponse }) {
  return (
    <section className="history-panel">
      <h3>Сегодня / Требует внимания</h3>
      {!today ? <p>Загрузка...</p> : <TodayBlocks today={today} />}
    </section>
  );
}
