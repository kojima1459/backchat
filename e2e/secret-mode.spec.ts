import { test, expect } from '@playwright/test';

/**
 * 裏モード入口とJoin機能のE2Eテスト
 * 
 * テスト対象: 裏モード（チャット機能）へのアクセスと入室フロー
 * - 長押しによる裏モード入口
 * - 設定画面からの裏モード入口
 * - ルームキー生成
 * - 入室フロー
 */

test.describe('裏モード入口', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByText('今日のやること')).toBeVisible({ timeout: 10000 });
  });

  // ========================================
  // 正常系テスト
  // ========================================

  test('設定画面からJoinモーダルを開ける', async ({ page }) => {
    /**
     * 目的: 設定画面の「ルームに入る」からJoinモーダルを開けることを確認
     * 期待結果: Joinモーダルが表示される
     */
    // 設定アイコンをクリック
    await page.getByRole('button', { name: '設定' }).click();
    
    // 設定モーダルが表示されることを確認
    await expect(page.getByText('ルームに入る')).toBeVisible();
    
    // 「ルームに入る」をクリック
    await page.getByText('ルームに入る').click();
    
    // Joinモーダルが表示されることを確認
    await expect(page.getByPlaceholder('キーを入力')).toBeVisible();
  });

  test('キー生成ボタンで16文字の英数字キーが生成される', async ({ page }) => {
    /**
     * 目的: キー生成ボタンで正しい形式のキーが生成されることを確認
     * 期待結果: 16文字の英数字キーが入力欄に設定される
     */
    // 設定画面からJoinモーダルを開く
    await page.getByRole('button', { name: '設定' }).click();
    await page.getByText('ルームに入る').click();
    
    // キー生成ボタンをクリック
    await page.getByRole('button', { name: 'キー生成' }).click();
    
    // 入力欄に16文字のキーが設定されていることを確認
    const input = page.getByPlaceholder('キーを入力');
    const value = await input.inputValue();
    
    expect(value).toHaveLength(16);
    expect(value).toMatch(/^[A-Za-z0-9]+$/);
  });

  test('キー入力後に入室ボタンが有効化される', async ({ page }) => {
    /**
     * 目的: 有効なキーを入力すると入室ボタンが有効化されることを確認
     * 期待結果: 入室ボタンがクリック可能になる
     */
    // Joinモーダルを開く
    await page.getByRole('button', { name: '設定' }).click();
    await page.getByText('ルームに入る').click();
    
    // 初期状態では入室ボタンが無効
    const joinButton = page.getByRole('button', { name: '入室 / 作成' });
    await expect(joinButton).toBeDisabled();
    
    // キーを入力
    await page.getByPlaceholder('キーを入力').fill('TestRoomKey12345');
    
    // 入室ボタンが有効化されることを確認
    await expect(joinButton).toBeEnabled();
  });

  test('コピーボタンでキーをクリップボードにコピーできる', async ({ page, context }) => {
    /**
     * 目的: コピーボタンでキーをクリップボードにコピーできることを確認
     * 期待結果: クリップボードにキーがコピーされる
     */
    // クリップボードの権限を付与
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Joinモーダルを開く
    await page.getByRole('button', { name: '設定' }).click();
    await page.getByText('ルームに入る').click();
    
    // キーを生成
    await page.getByRole('button', { name: 'キー生成' }).click();
    
    // 入力欄の値を取得
    const input = page.getByPlaceholder('キーを入力');
    const generatedKey = await input.inputValue();
    
    // コピーボタンをクリック
    await page.getByRole('button', { name: 'コピー' }).click();
    
    // トースト通知が表示されることを確認
    await expect(page.getByText('コピーしました')).toBeVisible();
    
    // クリップボードの内容を確認
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(generatedKey);
  });

  // ========================================
  // 異常系テスト
  // ========================================

  test('短すぎるキーでは入室できない', async ({ page }) => {
    /**
     * 目的: 10文字未満のキーでは入室できないことを確認
     * 期待結果: 入室ボタンが無効のまま
     */
    // Joinモーダルを開く
    await page.getByRole('button', { name: '設定' }).click();
    await page.getByText('ルームに入る').click();
    
    // 9文字のキーを入力
    await page.getByPlaceholder('キーを入力').fill('ShortKey9');
    
    // 入室ボタンが無効のままであることを確認
    const joinButton = page.getByRole('button', { name: '入室 / 作成' });
    await expect(joinButton).toBeDisabled();
  });

  test('無効な文字を含むキーでは入室できない', async ({ page }) => {
    /**
     * 目的: ASCII printable以外の文字を含むキーでは入室できないことを確認
     * 期待結果: 入室ボタンが無効のまま
     */
    // Joinモーダルを開く
    await page.getByRole('button', { name: '設定' }).click();
    await page.getByText('ルームに入る').click();
    
    // 日本語を含むキーを入力
    await page.getByPlaceholder('キーを入力').fill('テストキー12345');
    
    // 入室ボタンが無効のままであることを確認
    const joinButton = page.getByRole('button', { name: '入室 / 作成' });
    await expect(joinButton).toBeDisabled();
  });

  test('Joinモーダルをキャンセルで閉じられる', async ({ page }) => {
    /**
     * 目的: Joinモーダルをキャンセルボタンで閉じられることを確認
     * 期待結果: モーダルが非表示になる
     */
    // Joinモーダルを開く
    await page.getByRole('button', { name: '設定' }).click();
    await page.getByText('ルームに入る').click();
    
    // モーダルが表示されていることを確認
    await expect(page.getByPlaceholder('キーを入力')).toBeVisible();
    
    // キャンセルボタンをクリック
    await page.getByRole('button', { name: 'キャンセル' }).click();
    
    // モーダルが非表示になることを確認
    await expect(page.getByPlaceholder('キーを入力')).not.toBeVisible();
  });

  test('クールダウン中は連続入室試行ができない', async ({ page }) => {
    /**
     * 目的: 5秒のクールダウン中は連続入室試行ができないことを確認
     * 期待結果: クールダウン中はボタンが無効化される
     */
    // Joinモーダルを開く
    await page.getByRole('button', { name: '設定' }).click();
    await page.getByText('ルームに入る').click();
    
    // キーを入力
    await page.getByPlaceholder('キーを入力').fill('TestRoomKey12345');
    
    // 入室ボタンをクリック（Firestoreエラーが発生する可能性があるが、クールダウンのテスト）
    const joinButton = page.getByRole('button', { name: '入室 / 作成' });
    await joinButton.click();
    
    // ボタンがローディング状態または無効化されていることを確認
    // （実際のFirestore接続がないため、ローディング状態を確認）
    await expect(joinButton).toBeDisabled();
  });
});

test.describe('設定画面', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('今日のやること')).toBeVisible({ timeout: 10000 });
  });

  test('設定モーダルが正しく表示される', async ({ page }) => {
    /**
     * 目的: 設定モーダルが正しく表示されることを確認
     * 期待結果: 「ルームに入る」と「アプリについて」が表示される
     */
    // 設定アイコンをクリック
    await page.getByRole('button', { name: '設定' }).click();
    
    // メニュー項目が表示されることを確認
    await expect(page.getByText('ルームに入る')).toBeVisible();
    await expect(page.getByText('アプリについて')).toBeVisible();
  });

  test('設定モーダルを閉じられる', async ({ page }) => {
    /**
     * 目的: 設定モーダルを閉じられることを確認
     * 期待結果: モーダルが非表示になる
     */
    // 設定アイコンをクリック
    await page.getByRole('button', { name: '設定' }).click();
    
    // モーダルが表示されていることを確認
    await expect(page.getByText('ルームに入る')).toBeVisible();
    
    // 閉じるボタンをクリック
    await page.getByRole('button', { name: '閉じる' }).click();
    
    // モーダルが非表示になることを確認
    await expect(page.getByText('ルームに入る')).not.toBeVisible();
  });
});
