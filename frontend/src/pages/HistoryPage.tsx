import { HistoryFeed } from '../components/history/HistoryFeed';
import type { HistoryItem } from '../types/task';

export function HistoryPage({ items }: { items: HistoryItem[] }) {
  return <HistoryFeed items={items} />;
}
