# しれっとToDo Chat

**「ただのToDoアプリ」に見せかけた、秘密のチャットPWA**

## 概要

「しれっとToDo Chat」は、表向きはシンプルなToDoアプリですが、特定の操作（「Zoom会議」タスクの長押し）で秘密のチャット機能にアクセスできるPWAです。

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

- **フロントエンド**: React 18 + TypeScript + Vite
- **スタイリング**: TailwindCSS v4
- **バックエンド**: Firebase (Authentication, Firestore)
- **PWA**: vite-plugin-pwa

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build
```

## Firebase設定

1. Firebase Consoleでプロジェクトを作成
2. 匿名認証を有効化
3. Firestoreデータベースを作成（asia-northeast1推奨）
4. `src/services/firebase.ts`の設定を更新

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

```bash
# Firebase CLIでデプロイ
firebase deploy
```

## ライセンス

MIT License

## 作者

kojima1459
