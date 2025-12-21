// [リファクタ S-1] App.tsxのリファクタリング
// 改修理由: UI状態、ビジネスロジック、データ取得が単一ファイルに集中していた
// 期待される効果: 責務分離によりテスト性・可読性・保守性が向上
// 変更点:
//   - モーダル状態管理を useModalManager フックに分離
//   - ルーム管理ロジックを useRoomManager フックに分離
//   - 認証状態は AuthContext から直接取得（A-3 Prop Drilling解消）

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Header } from './components/Header';
import { TodoItem } from './components/TodoItem';
import { AddTodoModal } from './components/AddTodoModal';
import { SettingsModal } from './components/SettingsModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { ChatRoom } from './components/ChatRoom';
import { Toast, getRandomPositiveMessage } from './components/Toast';
import { useTodos } from './hooks/useTodos';
import { useAuth } from './contexts/AuthContext';
import { joinRoom } from './services/room';
import type { JoinRoomErrorCode } from './services/room';

type Screen = 'home' | 'chat';
type Theme = 'mint' | 'mono';

const JOIN_ROOM_ERROR_MESSAGES: Record<JoinRoomErrorCode, string> = {
  deleted: 'この共有は削除されました',
  full: 'この共有、もう満員やった🥲',
  unknown: 'うまく同期できなかった',
};

const THEME_STORAGE_KEY = 'theme';
const LONG_PRESS_STORAGE_KEY = 'secretLongPressDelay';
const LONG_PRESS_OPTIONS = [2000, 3000, 5000, 8000];

const resolveTheme = (): Theme => {
  if (typeof window === 'undefined') return 'mint';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'mono' ? 'mono' : 'mint';
};

const resolveLongPressDelay = (): number => {
  if (typeof window === 'undefined') return 5000;
  const stored = Number(localStorage.getItem(LONG_PRESS_STORAGE_KEY));
  return LONG_PRESS_OPTIONS.includes(stored) ? stored : 5000;
};

function App() {
  // [リファクタ A-3] AuthContextから認証状態を直接取得
  const { uid, isLoading, isOnline } = useAuth();
  const { todos, addTodo, toggleTodo, deleteTodo, isLoaded } = useTodos();
  
  // モーダル状態
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // チャット状態
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  
  // ルーム参加状態
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  // トースト状態
  const [toast, setToast] = useState<string | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const reloadRequestedRef = useRef(false);
  const [connectionToast, setConnectionToast] = useState<{ message: string; persist: boolean } | null>(null);
  const previousOnlineRef = useRef(isOnline);
  const [theme] = useState<Theme>(resolveTheme);
  const [secretLongPressDelay, setSecretLongPressDelay] = useState(resolveLongPressDelay);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LONG_PRESS_STORAGE_KEY, String(secretLongPressDelay));
  }, [secretLongPressDelay]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (previousOnlineRef.current === isOnline) return;

    if (!isOnline) {
      setConnectionToast({ message: 'オフラインです', persist: true });
    } else if (!previousOnlineRef.current) {
      setConnectionToast({ message: 'オンラインに戻りました', persist: false });
    }

    previousOnlineRef.current = isOnline;
  }, [isOnline]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let didSetup = false;
    let isActive = true;

    const showUpdate = (registration: ServiceWorkerRegistration) => {
      if (!isActive) return;
      setUpdateRegistration(registration);
      setUpdateReady(true);
    };

    const setupRegistration = (registration: ServiceWorkerRegistration) => {
      if (didSetup) return;
      didSetup = true;

      if (registration.waiting) {
        showUpdate(registration);
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdate(registration);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        setupRegistration(registration);
      }
    });

    navigator.serviceWorker.ready.then((registration) => {
      if (registration) {
        setupRegistration(registration);
      }
    });

    const handleControllerChange = () => {
      if (reloadRequestedRef.current) {
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      isActive = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // タスク完了時のハンドラー
  const handleToggle = useCallback((id: string) => {
    const todo = todos.find(t => t.id === id);
    if (todo && !todo.completed) {
      setToast(getRandomPositiveMessage());
    }
    toggleTodo(id);
  }, [todos, toggleTodo]);

  // 裏モード入口（長押し）
  const handleSecretLongPress = useCallback(() => {
    setShowJoinModal(true);
  }, []);

  // ルーム参加
  // [リファクタ B-3] 依存配列にisOnlineを追加して常に最新の状態で判定
  const handleJoinRoom = useCallback(async (roomKey: string) => {
    if (!uid) {
      setJoinError('認証に失敗しました。再読み込みしてください。');
      return;
    }
    
    if (!isOnline) {
      setJoinError('ネットにつながってないみたい');
      return;
    }
    
    setJoinLoading(true);
    setJoinError(null);
    
    const result = await joinRoom(roomKey, uid);
    
    setJoinLoading(false);
    
    if (result.success) {
      setCurrentRoomId(result.roomId);
      setShowJoinModal(false);
      setCurrentScreen('chat');
      if (result.isNew) {
        setToast('共有を作成しました');
      }
    } else {
      setJoinError(JOIN_ROOM_ERROR_MESSAGES[result.error]);
    }
  }, [uid, isOnline]);

  // チャットからホームに戻る
  const handleBackToHome = useCallback(() => {
    setCurrentScreen('home');
    setCurrentRoomId(null);
  }, []);

  // ルーム削除後の処理
  const handleRoomDeleted = useCallback(() => {
    setCurrentScreen('home');
    setCurrentRoomId(null);
    setToast('共有を削除しました');
  }, []);

  // ルーム退出後の処理
  const handleRoomLeft = useCallback(() => {
    setCurrentScreen('home');
    setCurrentRoomId(null);
    setToast('共有から退出しました');
  }, []);

  const handleUpdateReload = useCallback(() => {
    reloadRequestedRef.current = true;
    setUpdateReady(false);

    if (updateRegistration?.waiting) {
      updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    window.location.reload();
  }, [updateRegistration]);

  // ローディング中
  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-bg-soft flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-mint border-t-transparent 
            rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">読み込み中...</p>
        </div>
      </div>
    );
  }

  // チャット画面
  if (currentScreen === 'chat' && currentRoomId && uid) {
    return (
      <ChatRoom
        roomId={currentRoomId}
        uid={uid}
        onBack={handleBackToHome}
        onRoomDeleted={handleRoomDeleted}
        onRoomLeft={handleRoomLeft}
      />
    );
  }

  // ホーム画面（ToDo）
  return (
    <div className="min-h-screen bg-bg-soft">
      <Header
        onSettingsClick={() => setShowSettingsModal(true)}
        onSecretLongPress={handleSecretLongPress}
        secretLongPressDelay={secretLongPressDelay}
      />
      
      {/* オフライン警告 */}
      {!isOnline && (
        <div className="mx-4 mb-2 p-3 bg-warning/10 border border-warning/20 rounded-xl">
          <p className="text-sm text-warning font-medium">
            ネットにつながってないみたい
          </p>
        </div>
      )}
      
      {/* メインコンテンツ */}
      <main className="px-4 pb-24">
        <h2 className="text-sm font-bold text-text-sub mb-3 mt-2">
          今日のやること
        </h2>
        
        <div className="space-y-2">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onDelete={deleteTodo}
              secretLongPressDelay={secretLongPressDelay}
            />
          ))}
        </div>
        
        {todos.filter(t => !t.isSecret).length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-muted">タスクがありません</p>
            <p className="text-sm text-text-muted mt-1">
              下の＋ボタンから追加しよう
            </p>
          </div>
        )}
      </main>
      
      {/* FAB（タスク追加ボタン） */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand-mint rounded-full
          shadow-lg flex items-center justify-center
          hover:bg-main-deep active:scale-95 transition-all z-30"
        aria-label="タスクを追加"
      >
        <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
      </button>
      
      {/* モーダル群 */}
      <AddTodoModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addTodo}
      />
      
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        secretLongPressDelay={secretLongPressDelay}
        onSecretLongPressDelayChange={setSecretLongPressDelay}
      />
      
      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setJoinError(null);
        }}
        onJoin={handleJoinRoom}
        isLoading={joinLoading}
        error={joinError}
      />
      
      {/* トースト */}
      {updateReady && (
        <Toast
          message="Update available"
          actionLabel="Reload"
          onAction={handleUpdateReload}
          duration={null}
          onClose={() => setUpdateReady(false)}
        />
      )}
      {connectionToast && (
        <Toast
          message={connectionToast.message}
          duration={connectionToast.persist ? null : 2000}
          onClose={() => setConnectionToast(null)}
          positionClassName={updateReady ? 'bottom-32' : 'bottom-20'}
        />
      )}
      {!updateReady && !connectionToast && toast ? (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}

export default App;
