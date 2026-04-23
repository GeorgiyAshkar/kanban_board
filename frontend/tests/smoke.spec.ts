import { expect, test } from '@playwright/test';

test('smoke: create task from modal and show it on board', async ({ page }) => {
  const columns = [
    { id: 1, name: 'Входящие', position: 0, color: '#e2e8f0', is_system: true },
    { id: 2, name: 'К выполнению', position: 1, color: '#e2e8f0', is_system: true },
  ];

  const tasks: Array<Record<string, unknown>> = [];
  let taskId = 1;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');

    if (method === 'GET' && path === '/tasks') {
      const archived = url.searchParams.get('archived') === 'true';
      const payload = tasks.filter((task) => Boolean(task.is_archived) === archived);
      await route.fulfill({ json: payload });
      return;
    }

    if (method === 'POST' && path === '/tasks') {
      const body = request.postDataJSON() as Record<string, string | number | null>;
      const now = new Date().toISOString();
      const createdTask = {
        id: taskId++,
        title: String(body.title ?? 'Untitled'),
        description: String(body.description ?? ''),
        status: String(body.status ?? 'inbox'),
        priority: String(body.priority ?? 'normal'),
        board_column_id: Number(body.board_column_id ?? columns[0].id),
        position: 0,
        is_archived: false,
        is_done: false,
        created_at: now,
        updated_at: now,
        deadline_at: null,
        planned_return_at: null,
      };
      tasks.push(createdTask);
      await route.fulfill({ status: 201, json: createdTask });
      return;
    }

    if (method === 'GET' && path === '/columns') {
      await route.fulfill({ json: columns });
      return;
    }

    if (method === 'GET' && path === '/tasks/board-metadata') {
      const ids = url.searchParams.getAll('task_ids').map((item) => Number(item));
      await route.fulfill({ json: ids.map((task_id) => ({ task_id, tags: [], checklist: [] })) });
      return;
    }

    if (method === 'GET' && ['/history', '/today', '/tags'].includes(path)) {
      await route.fulfill({ json: path === '/today' ? {
        overdue_tasks: [],
        due_today_tasks: [],
        return_today_tasks: [],
        stale_tasks: [],
        reminders: [],
      } : [] });
      return;
    }

    await route.fulfill({ status: 200, json: [] });
  });

  await page.goto('/');

  await expect(page.getByRole('button', { name: '+ Новая задача' })).toBeVisible();
  await page.getByRole('button', { name: '+ Новая задача' }).click();
  await page.getByPlaceholder('Введите название').fill('Smoke task');
  await page.getByRole('button', { name: 'Создать' }).click();

  await expect(page.getByText('Smoke task')).toBeVisible();
});
