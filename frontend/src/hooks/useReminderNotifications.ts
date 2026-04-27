import { useEffect } from 'react';
import { ackReminderNotificationEvent } from '../api/tasks';

export const useReminderNotifications = () => {
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL ?? '/api';
    const normalizedBase = apiBase.startsWith('http')
      ? apiBase
      : new URL(apiBase, window.location.origin).toString();
    const streamUrl = `${normalizedBase.replace(/\/$/, '')}/notifications/stream`;
    const source = new EventSource(streamUrl);

    source.addEventListener('reminder', (raw) => {
      void (async () => {
        try {
          const event = JSON.parse(raw.data) as { id: number; title: string; body?: string };
          if (Notification.permission === 'granted') {
            new Notification(event.title, { body: event.body ?? 'Есть напоминание по задаче' });
          }
          await ackReminderNotificationEvent(event.id);
        } catch {
          // no-op: SSE delivery is best effort
        }
      })();
    });

    source.onerror = () => {
      // no-op: EventSource reconnects automatically
    };

    return () => source.close();
  }, []);
};
