import { test, expect } from '@playwright/test';

const waitForHome = async (page: import('@playwright/test').Page) => {
  await expect(page.getByText('今日3つ')).toBeVisible({ timeout: 10000 });
};

const addInboxTasks = async (page: import('@playwright/test').Page, text: string) => {
  await page.getByPlaceholder('インボックスに追加（改行で複数）').fill(text);
  await page.getByRole('button', { name: '追加' }).click();
};

const getTodoRow = (page: import('@playwright/test').Page, title: string) => {
  return page
    .locator('div', { has: page.getByText(title, { exact: true }) })
    .filter({ has: page.getByRole('button', { name: '今日' }) })
    .first();
};

test.describe('ADHDモード主要フロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await waitForHome(page);
  });

  test('Inboxの複数行追加で複数タスクが作成される', async ({ page }) => {
    await addInboxTasks(page, '複数追加A\n複数追加B');
    await expect(page.getByText('複数追加A')).toBeVisible();
    await expect(page.getByText('複数追加B')).toBeVisible();
  });

  test('今日タスクは最大3件まで', async ({ page }) => {
    await addInboxTasks(page, '今日枠1\n今日枠2\n今日枠3\n今日枠4');
    await getTodoRow(page, '今日枠1').getByRole('button', { name: '今日' }).click();
    await getTodoRow(page, '今日枠2').getByRole('button', { name: '今日' }).click();
    await getTodoRow(page, '今日枠3').getByRole('button', { name: '今日' }).click();
    await getTodoRow(page, '今日枠4').getByRole('button', { name: '今日' }).click();
    await expect(page.getByText('今日は3つまで')).toBeVisible();
  });

  test('バックログの並び替えが矢印でできる', async ({ page }) => {
    await addInboxTasks(page, '並び1\n並び2\n並び3');
    const backlogList = page.locator('main .space-y-2').nth(1);
    const getBacklogTexts = async () =>
      backlogList.locator('span', { hasText: /並び/ }).allTextContents();

    const before = await getBacklogTexts();
    expect(before.join(' ')).toContain('並び1');
    await getTodoRow(page, '並び2').getByRole('button', { name: '↑' }).click();
    const after = await getBacklogTexts();
    expect(after.indexOf('並び2')).toBeLessThan(after.indexOf('並び1'));
  });

  test('複数行タイトルの編集が保存/キャンセルできる', async ({ page }) => {
    await addInboxTasks(page, '編集テスト');
    const row = getTodoRow(page, '編集テスト');
    await row.getByRole('button', { name: '編集' }).click();
    await row.getByRole('textbox').fill('行1\n行2');
    await row.getByRole('button', { name: '保存' }).click();

    await row.getByRole('button', { name: '編集' }).click();
    await expect(row.getByRole('textbox')).toHaveValue('行1\n行2');
    await row.getByRole('button', { name: 'キャンセル' }).click();
  });

  test('スヌーズで非表示になり、期限到来で復帰する', async ({ page }) => {
    await addInboxTasks(page, 'スヌーズテスト');
    const row = getTodoRow(page, 'スヌーズテスト');
    await row.getByRole('button', { name: '明日' }).click();
    await expect(page.getByText('スヌーズテスト')).not.toBeVisible();
    await expect(page.getByText(/スヌーズ中/)).toBeVisible();

    await page.evaluate(() => {
      const key = 'shiretto-todos';
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      const today = new Date();
      const todayKey = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
      ].join('-');
      const updated = stored.map((todo: { text?: string; snoozeUntil?: string }) =>
        todo.text === 'スヌーズテスト' ? { ...todo, snoozeUntil: todayKey } : todo
      );
      localStorage.setItem(key, JSON.stringify(updated));
    });
    await page.reload();
    await waitForHome(page);
    await expect(page.getByText('スヌーズテスト')).toBeVisible();
  });

  test('自動優先ONで並び替えボタンが非表示になる', async ({ page }) => {
    await addInboxTasks(page, '優先A\n優先B');
    await expect(page.getByRole('button', { name: '↑' }).first()).toBeVisible();
    await page.getByRole('button', { name: '自動優先（推奨）' }).click();
    await expect(page.getByRole('button', { name: '↑' })).toHaveCount(0);
  });

  test('返信/支払いのバッジ表示と強制Today枠', async ({ page }) => {
    await addInboxTasks(page, '返信: 返信タスク\n支払い: 支払いタスク');
    await expect(page.getByText('返信')).toBeVisible();
    await expect(page.getByText('支払い')).toBeVisible();
    const todaySection = page.locator('.todaySticky');
    const todayText = (await todaySection.textContent()) || '';
    expect(todayText.includes('返信タスク') || todayText.includes('支払いタスク')).toBeTruthy();
  });

  test('タイマーは再読込後も状態が保持される', async ({ page }) => {
    await addInboxTasks(page, 'タイマーテスト');
    await getTodoRow(page, 'タイマーテスト').getByRole('button', { name: '今日' }).click();
    await getTodoRow(page, 'タイマーテスト')
      .getByRole('button', { name: '▶︎ 5分着手' })
      .click();

    const todoId = await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('shiretto-todos') || '[]');
      return stored.find((todo: { text?: string }) => todo.text === 'タイマーテスト')?.id ?? null;
    });
    expect(todoId).not.toBeNull();

    await page.evaluate((id) => {
      const payload = { todoId: id, endsAt: Date.now() - 1000, phase: 'start' };
      localStorage.setItem('todoTimer', JSON.stringify(payload));
    }, todoId);

    await page.reload();
    await waitForHome(page);
    await expect(page.getByText('次はどうする？')).toBeVisible();

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('続けますか');
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: '続ける' }).click();
    await expect(page.getByText('次はどうする？')).toBeVisible();
  });
});
