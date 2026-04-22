# Personal Kanban Board (MVP+)

Локальное приложение для управления задачами в формате Kanban с журналом изменений, комментариями, чек-листом и напоминаниями.

## Текущий стек

- **Frontend:** React + TypeScript + Vite + Zustand + TanStack Query
- **Backend:** FastAPI + SQLAlchemy
- **Migrations:** Alembic (автоматический `upgrade head` при старте backend)
- **DB:** SQLite (`kanban.db`)

## Что реализовано по ТЗ

### Backend

- Базовые сущности: `tasks`, `task_history`, `task_comments`, `task_reminders`, `tags`, `task_tags`, `task_checklist_items`, `board_columns`.
- Эндпоинты задач: `GET/POST/PATCH/DELETE /tasks`, `archive/restore/complete/move`.
- История: `GET /history`, `GET /tasks/{id}/history`.
- Комментарии: `GET/POST/PATCH/DELETE`.
- Напоминания: `GET/POST/PATCH/DELETE`, `complete`.
- Чек-лист: `GET/POST /tasks/{id}/checklist`, `PATCH/DELETE /checklist/{id}`.
- Теги: `GET/POST/PATCH/DELETE /tags`, привязка/отвязка тегов к задаче.
- Колонки: `GET/POST/PATCH/DELETE /columns`.
- `GET /today` с блоками: просроченные, дедлайн сегодня, возврат сегодня, напоминания, без движения.
- При изменениях создаются записи в `task_history`.

### Frontend

- Интерфейс в стиле образца: верхняя синяя панель, канбан-колонки и правая панель задачи.
- Переход на доску — по клику на заголовок «Мои задачи».
- Кнопка «Новая задача» размещена в верхней панели рядом с поиском.
- Колонки и правая панель задачи растянуты по высоте рабочей области страницы.
- Создание задачи через модальное окно с полями: название, описание, колонка, приоритет.
- Экран «Сегодня», «История», «Архив», «Настройки».
- В карточке задачи: описание, поля, чек-лист, комментарии, история по задаче, добавление/удаление/создание тегов.
- При создании и редактировании задачи поддерживается диапазон дат (начало/конец) через календарный date-picker.
- На карточках доски: цветовой полупрозрачный фон по приоритету и отображение тегов (вместо плашки статуса).
- На desktop карточка в колонке компактная (заголовок), а детали раскрываются по hover (комбинированный «domino»-эффект).
- В правой панели после редактирования используются вкладки: Теги / Чек-лист / Комментарии / История.
- Размеры шрифтов централизованы в `frontend/src/font_config.json` и применяются через CSS variables.
- Добавлена адаптивная шкала интерфейса: размер карточек/шрифтов и сетка колонок автоматически подстраиваются под экран (desktop/tablet/mobile).
- Быстрые операции: создание задачи со статусом/приоритетом/тегами, добавление комментария, добавление/чек чек-листа, восстановление из архива.
- В карточке задачи доступно архивирование, а во вкладке `Архив` — восстановление.
- Раздел `Настройки` поддерживает управление колонками (добавление/переименование) и тегами (добавление/редактирование цвета/названия).
- В `Настройках` добавлено редактирование цвета колонок.
- Раздел `Сегодня` показывает списки задач/напоминаний по блокам (просроченные, дедлайн сегодня, вернуть сегодня, без движения, напоминания).
- Базовый drag-and-drop задач между колонками с обновлением статуса через `/tasks/{id}/move`.

## Запуск backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Для доступа к backend из локальной сети используйте:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Для безопасного CORS задайте allowlist через env:

```bash
export ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080"
```

## Запуск frontend

```bash
cd frontend
npm install
npm run dev
```

`Vite` dev-server настроен с proxy `/api -> http://localhost:8000`, поэтому frontend в dev-режиме корректно ходит в backend без CORS-проблем.
`Vite` также запущен с `host: 0.0.0.0`, поэтому приложение доступно по внешнему IP вашей машины: `http://<YOUR_LAN_IP>:5173`.

## Docker запуск

### 1) Локальный запуск через Docker Compose

```bash
# опционально: cp .env.example .env и задайте свои mirror-образы
docker compose up --build -d
```

После запуска:
- frontend: `http://localhost:8080`
- backend API: `http://localhost:8080/api/...` (через nginx-proxy)

`docker-compose` прокидывает `ALLOWED_ORIGINS` в backend; при необходимости задайте его в `.env`.

### 2) Сборка и упаковка Docker-образов в tar.gz

```bash
./build_and_package_docker.sh
```

> Важно: `bash -n build_and_package_docker.sh` проверяет только синтаксис скрипта и **не запускает** сборку.

Скрипт:
- собирает `kanban-backend:latest` и `kanban-frontend:latest`;
- упаковывает их в архив `kanban_docker_images_YYYYMMDD_HHMMSS.tar.gz`.
- поддерживает `--offline` (пропустить build и упаковать уже существующие локальные образы).

#### Если есть ошибка вида `failed to resolve source metadata ... i/o timeout`

Это проблема сети/DNS до Docker Hub на вашей машине (часто `registry-1.docker.io` недоступен).

Варианты решения:

```bash
# 1) Использовать зеркало/приватный registry:
export PYTHON_IMAGE=<mirror>/python:3.11-slim
export NODE_IMAGE=<mirror>/node:20-alpine
export NGINX_IMAGE=<mirror>/nginx:1.27-alpine
./build_and_package_docker.sh
```

```bash
# 2) Если нужные образы уже есть локально:
./build_and_package_docker.sh --offline
```

### 3) Разворачивание архива на удаленном сервере

```bash
gunzip -c kanban_docker_images_YYYYMMDD_HHMMSS.tar.gz | docker load
docker compose up -d
```

## Что еще осталось до «полного» соответствия ТЗ

- Перевести текущий базовый drag-and-drop на `dnd-kit` с расширенными сценариями reorder.
- Полноценные формы редактирования всех полей задачи в UI.
- Фильтры по всем параметрам из ТЗ на UI (в backend часть уже есть).
- Экспорт/импорт/бэкап и уведомления браузера.
- Аналитика/отчеты из раздела 15.
