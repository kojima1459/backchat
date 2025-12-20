# CI/CD セットアップガイド

## 概要

このプロジェクトでは、GitHub Actions を使用して継続的インテグレーション（CI）と継続的デプロイ（CD）を実現しています。

## ワークフロー

### トリガー

- `main` ブランチへの **push**
- `main` ブランチへの **Pull Request**

### 実行内容

1. **依存ライブラリのインストール** (`npm ci`)
2. **TypeScriptのビルド** (`npm run build`)
3. **ESLintによる静的解析** (`npm run lint`)
4. **Playwrightによるe2eテスト** (`npm run test`)
5. **Firebase Hostingへのデプロイ** (mainブランチへのpush時のみ)

### テスト失敗時の動作

- テストが失敗した場合、デプロイは実行されません
- 失敗したテストのレポートは GitHub Artifacts としてアップロードされます

---

## GitHub Secrets の設定

CI/CD を動作させるには、以下の Secrets を GitHub リポジトリに設定する必要があります。

### 設定手順

1. GitHub リポジトリの **Settings** を開く
2. 左メニューから **Secrets and variables** → **Actions** を選択
3. **New repository secret** をクリック
4. 以下の Secrets を追加

### 必要な Secrets

| Secret名 | 説明 | 値の例 |
|:--|:--|:--|
| `VITE_FIREBASE_API_KEY` | Firebase API Key | `AIzaSyBx_5d5BoUiCtV65VfismAVF0qnYP7sgcE` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `shiretto-todo-chat.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `shiretto-todo-chat` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | `shiretto-todo-chat.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | `964149329302` |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | `1:964149329302:web:6638065f19fec2493bb1b7` |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase サービスアカウントJSON | (後述) |

### Firebase サービスアカウントの取得

1. [Firebase Console](https://console.firebase.google.com/) を開く
2. プロジェクト設定 → **サービスアカウント** タブを選択
3. **新しい秘密鍵を生成** をクリック
4. ダウンロードされた JSON ファイルの内容全体を `FIREBASE_SERVICE_ACCOUNT` Secret に設定

---

## ローカルでのテスト実行

```bash
# 依存ライブラリのインストール
npm install

# Playwrightブラウザのインストール
npx playwright install chromium

# ビルド
npm run build

# テスト実行
npm run test

# テストレポートの表示
npm run test:report
```

---

## トラブルシューティング

### ビルドが失敗する場合

1. 環境変数が正しく設定されているか確認
2. `npm ci` で依存関係を再インストール

### テストが失敗する場合

1. ローカルで `npm run test` を実行して再現を確認
2. `playwright-report/` ディレクトリのレポートを確認
3. スクリーンショットやトレースを確認

### デプロイが失敗する場合

1. `FIREBASE_SERVICE_ACCOUNT` が正しく設定されているか確認
2. Firebase Hosting が有効になっているか確認
3. Firebase Console でエラーログを確認

---

## 参考リンク

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Firebase Hosting GitHub Action](https://github.com/FirebaseExtended/action-hosting-deploy)
