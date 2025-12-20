import { test, expect } from '@playwright/test';

/**
 * ToDo機能のE2Eテスト
 * 
 * テスト対象: 表モード（ToDoアプリ）の主要ユーザーフロー
 * - タスク追加
 * - タスク完了
 * - タスク削除
 * - ローカルストレージ永続化
 */

test.describe('ToDo機能', () => {
  
  test.beforeEach(async ({ page }) => {
    // 各テスト前にローカルストレージをクリア
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // ローディング完了を待機
    await expect(page.getByText('今日のやること')).toBeVisible({ timeout: 10000 });
  });

  // ========================================
  // 正常系テスト
  // ========================================

  test('初期表示: デフォルトタスクが表示される', async ({ page }) => {
    /**
     * 目的: アプリ初回起動時にデフォルトタスクが正しく表示されることを確認
     * 期待結果: 「Zoom会議」「ミルク買う」「レポート10分」が表示される
     */
    await expect(page.getByText('Zoom会議')).toBeVisible();
    await expect(page.getByText('ミルク買う')).toBeVisible();
    await expect(page.getByText('レポート10分')).toBeVisible();
  });

  test('タスク追加: 新しいタスクを追加できる', async ({ page }) => {
    /**
     * 目的: FABボタンからタスクを追加できることを確認
     * 期待結果: 入力したタスクがリストに表示される
     */
    // FABボタンをクリック
    await page.getByRole('button', { name: 'タスクを追加' }).click();
    
    // モーダルが表示されることを確認
    await expect(page.getByPlaceholder('例：牛乳を買う')).toBeVisible();
    
    // タスクを入力
    await page.getByPlaceholder('例：牛乳を買う').fill('テストタスク');
    
    // 追加ボタンをクリック
    await page.getByRole('button', { name: '追加する' }).click();
    
    // タスクがリストに表示されることを確認
    await expect(page.getByText('テストタスク')).toBeVisible();
  });

  test('タスク完了: タスクをクリックして完了状態にできる', async ({ page }) => {
    /**
     * 目的: タスクをクリックして完了状態にできることを確認
     * 期待結果: タスクに取り消し線が付き、トースト通知が表示される
     */
    // 「ミルク買う」タスクをクリック
    await page.getByText('ミルク買う').click();
    
    // トースト通知が表示されることを確認（ポジティブメッセージ）
    await expect(page.locator('.fixed.bottom-20')).toBeVisible({ timeout: 3000 });
    
    // タスクに取り消し線が付くことを確認（line-throughクラス）
    const taskElement = page.locator('text=ミルク買う');
    await expect(taskElement).toHaveClass(/line-through/);
  });

  test('タスク永続化: リロード後もタスクが保持される', async ({ page }) => {
    /**
     * 目的: タスクがローカルストレージに保存され、リロード後も保持されることを確認
     * 期待結果: 追加したタスクがリロード後も表示される
     */
    // タスクを追加
    await page.getByRole('button', { name: 'タスクを追加' }).click();
    await page.getByPlaceholder('例：牛乳を買う').fill('永続化テスト');
    await page.getByRole('button', { name: '追加する' }).click();
    
    // タスクが表示されることを確認
    await expect(page.getByText('永続化テスト')).toBeVisible();
    
    // ページをリロード
    await page.reload();
    
    // ローディング完了を待機
    await expect(page.getByText('今日のやること')).toBeVisible({ timeout: 10000 });
    
    // タスクが保持されていることを確認
    await expect(page.getByText('永続化テスト')).toBeVisible();
  });

  // ========================================
  // 異常系テスト
  // ========================================

  test('空のタスク追加: 空文字のタスクは追加できない', async ({ page }) => {
    /**
     * 目的: 空文字のタスクが追加されないことを確認
     * 期待結果: 追加ボタンが無効化されている
     */
    // FABボタンをクリック
    await page.getByRole('button', { name: 'タスクを追加' }).click();
    
    // 追加ボタンが無効化されていることを確認
    const addButton = page.getByRole('button', { name: '追加する' });
    await expect(addButton).toBeDisabled();
  });

  test('モーダルキャンセル: キャンセルボタンでモーダルを閉じられる', async ({ page }) => {
    /**
     * 目的: キャンセルボタンでモーダルを閉じられることを確認
     * 期待結果: モーダルが非表示になる
     */
    // FABボタンをクリック
    await page.getByRole('button', { name: 'タスクを追加' }).click();
    
    // モーダルが表示されることを確認
    await expect(page.getByPlaceholder('例：牛乳を買う')).toBeVisible();
    
    // キャンセルボタンをクリック
    await page.getByRole('button', { name: 'キャンセル' }).click();
    
    // モーダルが非表示になることを確認
    await expect(page.getByPlaceholder('例：牛乳を買う')).not.toBeVisible();
  });

  test('シークレットタスク保護: Zoom会議タスクは削除できない', async ({ page }) => {
    /**
     * 目的: 裏モード入口のZoom会議タスクが削除から保護されていることを確認
     * 期待結果: 長押ししても削除オプションが表示されない
     */
    // Zoom会議タスクを長押し（通常タスクの削除トリガー時間）
    const zoomTask = page.getByText('Zoom会議');
    await zoomTask.click({ delay: 600 }); // 500ms以上の長押し
    
    // 削除ボタンが表示されないことを確認
    await expect(page.getByRole('button', { name: '削除' })).not.toBeVisible();
  });
});
