import { test, expect } from '@playwright/test';

/**
 * PWA機能のE2Eテスト
 * 
 * テスト対象: PWAとしての基本機能
 * - マニフェストファイル
 * - Service Worker
 * - オフライン対応
 */

test.describe('PWA機能', () => {

  test('マニフェストファイルが正しく配信される', async ({ page }) => {
    /**
     * 目的: PWAマニフェストファイルが正しく配信されることを確認
     * 期待結果: マニフェストファイルが200で返され、必要なフィールドが含まれる
     */
    const response = await page.goto('/manifest.webmanifest');
    
    expect(response?.status()).toBe(200);
    
    const manifest = await response?.json();
    
    expect(manifest.name).toBe('The ToDo');
    expect(manifest.short_name).toBe('The ToDo');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('Service Workerが登録される', async ({ page }) => {
    /**
     * 目的: Service Workerが正しく登録されることを確認
     * 期待結果: Service Workerが登録状態になる
     */
    await page.goto('/');
    
    // Service Workerの登録を待機
    const swRegistration = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return registration.active !== null;
      }
      return false;
    });
    
    expect(swRegistration).toBe(true);
  });

  test('アプリがHTMLとして正しくレンダリングされる', async ({ page }) => {
    /**
     * 目的: アプリが正しくレンダリングされることを確認
     * 期待結果: 主要なUI要素が表示される
     */
    await page.goto('/');
    
    // ヘッダーが表示されることを確認
    await expect(page.getByText('今日3つ')).toBeVisible({ timeout: 10000 });
    
    // FABボタンが表示されることを確認
    await expect(page.getByRole('button', { name: 'タスクを追加' })).toBeVisible();
    
    // 設定ボタンが表示されることを確認
    await expect(page.getByRole('button', { name: '設定' })).toBeVisible();
  });

  test('ビューポートがモバイルに最適化されている', async ({ page }) => {
    /**
     * 目的: ビューポートがモバイルデバイスに最適化されていることを確認
     * 期待結果: viewport metaタグが正しく設定されている
     */
    await page.goto('/');
    
    const viewportContent = await page.getAttribute('meta[name="viewport"]', 'content');
    
    expect(viewportContent).toContain('width=device-width');
    expect(viewportContent).toContain('initial-scale=1');
  });

  test('テーマカラーが正しく設定されている', async ({ page }) => {
    /**
     * 目的: PWAのテーマカラーが正しく設定されていることを確認
     * 期待結果: theme-color metaタグが設定されている
     */
    await page.goto('/');
    
    const themeColor = await page.getAttribute('meta[name="theme-color"]', 'content');
    
    expect(themeColor).toBe('#2DD4BF');
  });
});

test.describe('オフライン対応', () => {

  test('オフライン時に警告が表示される', async ({ page, context }) => {
    /**
     * 目的: オフライン時に警告メッセージが表示されることを確認
     * 期待結果: 「ネットにつながってないみたい」が表示される
     */
    await page.goto('/');
    await expect(page.getByText('今日3つ')).toBeVisible({ timeout: 10000 });
    
    // オフラインモードをシミュレート
    await context.setOffline(true);
    
    // ページをリロード（キャッシュから読み込まれる）
    // 注: 実際のオフライン検出はnavigator.onLineイベントに依存
    // ここではUIの表示をテスト
    
    // オフライン警告が表示されることを確認
    await expect(page.getByText('ネットにつながってないみたい')).toBeVisible({ timeout: 5000 });
    
    // オンラインに戻す
    await context.setOffline(false);
    
    // 警告が消えることを確認
    await expect(page.getByText('ネットにつながってないみたい')).not.toBeVisible({ timeout: 5000 });
  });

  test('オフライン時もToDoリストが表示される', async ({ page, context }) => {
    /**
     * 目的: オフライン時もローカルストレージからToDoリストが表示されることを確認
     * 期待結果: タスクが表示される
     */
    // まずオンラインでページを読み込む
    await page.goto('/');
    await expect(page.getByText('今日3つ')).toBeVisible({ timeout: 10000 });
    
    // タスクを追加
    await page.getByRole('button', { name: 'タスクを追加' }).click();
    await page.getByPlaceholder('タスクを入力...').fill('オフラインテスト');
    await page.getByRole('button', { name: '追加する' }).click();
    await expect(page.getByText('オフラインテスト')).toBeVisible();
    
    // オフラインモードに切り替え
    await context.setOffline(true);
    
    // ページをリロード
    await page.reload();
    
    // タスクが表示されることを確認（ローカルストレージから）
    await expect(page.getByText('オフラインテスト')).toBeVisible({ timeout: 10000 });
    
    // オンラインに戻す
    await context.setOffline(false);
  });

  test('localStorageが利用できなくてもクラッシュしない', async ({ page }) => {
    await page.addInitScript(() => {
      // localStorageが例外を投げる環境を模擬
      Storage.prototype.getItem = () => { throw new Error('blocked'); };
      Storage.prototype.setItem = () => { throw new Error('blocked'); };
      Storage.prototype.removeItem = () => { throw new Error('blocked'); };
    });

    await page.goto('/');
    await expect(page.getByText('今日3つ')).toBeVisible({ timeout: 10000 });
  });
});
