# しれっとToDo Chat

**「ただのToDoアプリ」に見せかけた、秘密のチャットPWA**

[![CI](https://github.com/kojima1459/backchat/actions/workflows/ci.yml/badge.svg)](https://github.com/kojima1459/backchat/actions/workflows/ci.yml)

## 概要

「しれっとToDo Chat」は、表向きはシンプルなToDoアプリですが、特定の操作（「Zoom会議」タスクの5秒長押し）で秘密のチャット機能にアクセスできるPWAです。

**デモ**: https://shiretto-todo-chat.web.app

## 主な機能

### 表モード（ToDo）
- タスクの追加・完了・削除
- ローカルストレージによるデータ永続化
- 完了時のポジティブなトースト通知

### 裏モード（Chat）
- 共有キーによるルーム作成・参加
- リアルタイムメッセージング（Firestore）
- 両者既読でメッセージ自動削除
- 3日後のTTL自動削除

## 技術スタック

| カテゴリ | 技術 |
|:--|:--|
| フロントエンド | React 19 + TypeScript + Vite 7 |
| スタイリング | TailwindCSS v4 |
| バックエンド | Firebase (Authentication, Firestore) |
| PWA | vite-plugin-pwa |
| テスト | Playwright |
| CI/CD | GitHub Actions |

## セットアップ

### 依存関係のインストール

```bash
npm install
```

### 環境変数の設定

`.env.example` をコピーして `.env` を作成し、Firebase の設定値を入力します。

```bash
cp .env.example .env
```

### 開発サーバーの起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

### テスト実行

```bash
# Playwrightブラウザのインストール（初回のみ）
npx playwright install chromium

# テスト実行
npm run test
```

## Firebase設定

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. **Authentication** → **Sign-in method** で「匿名」を有効化
3. **Firestore Database** を作成（ロケーション: `asia-northeast1` 推奨）
4. `.env` ファイルに設定値を入力

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // rooms: list禁止、getはsignedInに許可
    match /rooms/{roomId} {
      allow get: if request.auth != null;
      allow list: if false;
      allow create: if request.auth != null;
      allow update: if request.auth != null 
        && request.auth.uid in resource.data.participantUids;
    }
    
    // messages: 参加者のみlist/get/create/update/delete許可
    match /rooms/{roomId}/messages/{messageId} {
      allow read, write: if request.auth != null
        && request.auth.uid in get(/databases/$(database)/documents/rooms/$(roomId)).data.participantUids;
    }
  }
}
```

## デプロイ

### 手動デプロイ

```bash
npm run build
firebase deploy
```

### 自動デプロイ（GitHub Actions）

`main` ブランチへの push 時に自動デプロイされます。

詳細は [CI_SETUP.md](./CI_SETUP.md) を参照してください。

## プロジェクト構成

```
src/
├── components/     # UIコンポーネント
├── contexts/       # React Context（認証）
├── hooks/          # カスタムフック
├── services/       # Firebase操作
└── types/          # 型定義

e2e/                # E2Eテスト
.github/workflows/  # GitHub Actions
```

## ドキュメント

| ファイル | 説明 |
|:--|:--|
| [CODE_REVIEW.md](./CODE_REVIEW.md) | コードレビュー結果（優先度S/A/B/C付き） |
| [REFACTORING.md](./REFACTORING.md) | リファクタリング変更点の説明 |
| [CI_SETUP.md](./CI_SETUP.md) | CI/CDセットアップガイド |

## ライセンス

MIT License

## 作者

kojima1459
