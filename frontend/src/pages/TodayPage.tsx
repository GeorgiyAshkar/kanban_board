import { TodayBlocks } from '../components/reminders/TodayBlocks';
import type { TodayResponse } from '../types/task';

export function TodayPage({ today }: { today?: TodayResponse }) {
  if (!today) return <p>Загрузка...</p>;
  return <TodayBlocks today={today} />;
}
