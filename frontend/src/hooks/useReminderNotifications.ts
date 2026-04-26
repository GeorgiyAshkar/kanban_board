import { useEffect } from 'react';
import { ackReminderNotificationEvent, pullReminderNotificationEvents } from '../api/tasks';

export const useReminderNotifications = () => {
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }

    let afterId = 0;
    const timer = window.setInterval(async () => {
      try {
        const events = await pullReminderNotificationEvents(afterId);
        for (const event of events) {
          afterId = Math.max(afterId, event.id);
          if (Notification.permission === 'granted') {
            new Notification(event.title, { body: event.body ?? 'Есть напоминание по задаче' });
          }
          await ackReminderNotificationEvent(event.id);
        }
      } catch {
        // no-op: polling is best effort
      }
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);
};
