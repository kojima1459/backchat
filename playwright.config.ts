import { defineConfig, devices } from '@playwright/test';

/**
 * E2Eテスト設定
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // テストファイルの場所
  testDir: './e2e',
  
  // 各テストのタイムアウト
  timeout: 30 * 1000,
  
  // テスト実行の期待値タイムアウト
  expect: {
    timeout: 5000,
  },
  
  // 並列実行
  fullyParallel: true,
  
  // CI環境では失敗時のリトライを無効化
  forbidOnly: !!process.env.CI,
  
  // リトライ回数
  retries: process.env.CI ? 2 : 0,
  
  // ワーカー数
  workers: process.env.CI ? 1 : undefined,
  
  // レポーター
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  
  // 共通設定
  use: {
    // ベースURL
    baseURL: 'http://localhost:4173',
    
    // トレース（失敗時のみ）
    trace: 'on-first-retry',
    
    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',
  },

  // プロジェクト（ブラウザ）設定
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 開発サーバー設定
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
