import { test, expect } from '@playwright/test';

const openShareModal = async (page: import('@playwright/test').Page) => {
  const title = page.getByText('しれっとToDo');
  await title.click({ delay: 2100 });
  await expect(page.getByText('共有に同期する')).toBeVisible({ timeout: 10000 });
};

test.describe('共有モーダル（裏入口）', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('secretLongPressDelay', '2000');
    });
    await page.goto('/');
    await expect(page.getByPlaceholder('インボックスに追加（改行で複数）')).toBeVisible({ timeout: 10000 });
  });

  test('長押しで共有モーダルを開ける', async ({ page }) => {
    await openShareModal(page);
  });

  test('共有コード作成で英数字キーが生成される', async ({ page }) => {
    await openShareModal(page);
    await page.getByRole('button', { name: '共有コード作成' }).click();
    const input = page.getByPlaceholder('例) mint-piano-river-92');
    const value = await input.inputValue();
    expect(value).toHaveLength(16);
    expect(value).toMatch(/^[A-Za-z0-9]+$/);
  });

  test('キー入力後に同期ボタンが有効化される', async ({ page }) => {
    await openShareModal(page);
    const joinButton = page.getByRole('button', { name: '同期 / 作成' });
    await expect(joinButton).toBeDisabled();
    await page.getByPlaceholder('例) mint-piano-river-92').fill('TestRoomKey12345');
    await expect(joinButton).toBeEnabled();
  });

  test('コピーでトーストが表示される', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openShareModal(page);
    await page.getByRole('button', { name: '共有コード作成' }).click();
    const input = page.getByPlaceholder('例) mint-piano-river-92');
    const generatedKey = await input.inputValue();
    await page.getByRole('button', { name: 'コピー' }).click();
    await expect(page.getByText('コピーしました')).toBeVisible();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(generatedKey);
  });

  test('短すぎるキーでは同期できない', async ({ page }) => {
    await openShareModal(page);
    await page.getByPlaceholder('例) mint-piano-river-92').fill('ShortKey9');
    const joinButton = page.getByRole('button', { name: '同期 / 作成' });
    await expect(joinButton).toBeDisabled();
  });

  test('無効な文字を含むキーでは同期できない', async ({ page }) => {
    await openShareModal(page);
    await page.getByPlaceholder('例) mint-piano-river-92').fill('テストキー12345');
    const joinButton = page.getByRole('button', { name: '同期 / 作成' });
    await expect(joinButton).toBeDisabled();
  });
});

test.describe('設定画面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('インボックスに追加（改行で複数）')).toBeVisible({ timeout: 10000 });
  });

  test('設定モーダルが正しく表示される', async ({ page }) => {
    await page.getByRole('button', { name: '設定' }).click();
    await expect(page.getByText('表示')).toBeVisible();
    await expect(page.getByText('操作')).toBeVisible();
    await expect(page.getByText('データ')).toBeVisible();
    await expect(page.getByText('情報')).toBeVisible();
  });

  test('設定モーダルを閉じられる', async ({ page }) => {
    await page.getByRole('button', { name: '設定' }).click();
    await expect(page.getByText('設定')).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByText('設定')).not.toBeVisible();
  });
});
