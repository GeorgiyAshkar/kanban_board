# Personal Kanban Board (MVP)

Локальное приложение для личного управления задачами в формате Kanban-доски с журналом изменений и напоминаниями.

## Стек

- **Frontend:** React + TypeScript + Vite + Zustand + TanStack Query
- **Backend:** FastAPI + SQLAlchemy
- **DB:** SQLite (`kanban.db`)

## Реализовано в текущем MVP

- доска с системными колонками: `Входящие`, `К выполнению`, `В работе`, `На паузе`, `Готово`;
- создание/редактирование/удаление/архивация/восстановление/завершение задач;
- перемещение задач между колонками через `POST /tasks/{id}/move`;
- журнал изменений (`task_history`) для ключевых действий;
- комментарии к задачам;
- напоминания по задачам;
- экран `Сегодня` (`GET /today`) с блоками внимания;
- глобальная история (`GET /history`) и история по задаче (`GET /tasks/{id}/history`);
- задел под теги и управляемые колонки.

## Структура

```text
backend/
  app/
    api/
    db/
    models/
    schemas/
    services/
    main.py
frontend/
  src/
    pages/
    components/
    api/
    store/
    types/
```

## Запуск backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Запуск frontend

```bash
cd frontend
npm install
npm run dev
```

## Основные API эндпоинты

- `GET /tasks`, `POST /tasks`, `GET /tasks/{id}`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}`
- `POST /tasks/{id}/archive`, `POST /tasks/{id}/restore`, `POST /tasks/{id}/complete`, `POST /tasks/{id}/move`
- `GET /tasks/{id}/history`, `GET /history`
- `GET /tasks/{id}/comments`, `POST /tasks/{id}/comments`, `PATCH /comments/{id}`, `DELETE /comments/{id}`
- `GET /tasks/{id}/reminders`, `POST /tasks/{id}/reminders`, `PATCH /reminders/{id}`, `DELETE /reminders/{id}`, `POST /reminders/{id}/complete`
- `GET /tags`, `POST /tags`, `PATCH /tags/{id}`, `DELETE /tags/{id}`
- `GET /columns`, `POST /columns`, `PATCH /columns/{id}`, `DELETE /columns/{id}`
- `GET /today`

## Дальнейшие шаги

- полноценный drag-and-drop UI (`dnd-kit`) с persist `position`;
- чек-листы и связь задача-тег в UI;
- архивный экран с восстановлением;
- браузерные уведомления;
- бэкап/импорт/экспорт;
- аналитика и отчеты.
