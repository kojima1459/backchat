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
import { AddTodoModal, type TodoCreateType } from './components/AddTodoModal';
import { SettingsModal } from './components/SettingsModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { ChatRoom } from './components/ChatRoom';
import { Toast, getRandomPositiveMessage } from './components/Toast';
import { useTodos } from './hooks/useTodos';
import { useAuth } from './contexts/AuthContext';
import { joinRoom, getRoom } from './services/room';
import type { JoinRoomErrorCode } from './services/room';
import { setRoomLabel } from './services/roomLabel';
import type { Language } from './i18n';

type Screen = 'home' | 'chat';
type ThemeSetting = 'system' | 'light' | 'dark';

const JOIN_ROOM_ERROR_MESSAGES: Record<JoinRoomErrorCode, string> = {
  deleted: 'この共有は削除されました',
  full: 'この共有、もう満員やった🥲',
  unknown: 'うまく同期できなかった',
};

const THEME_STORAGE_KEY = 'theme';
const LANGUAGE_STORAGE_KEY = 'language';
const LONG_PRESS_STORAGE_KEY = 'secretLongPressDelay';
const LAST_ROOM_STORAGE_KEY = 'lastRoomId';
const LONG_PRESS_OPTIONS = [2000, 3000, 5000, 8000];
const TIMER_STORAGE_KEY = 'todoTimer';
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const WORK_PLAN_STEPS = [
  '① 完了条件を書く（5分）',
  '② 素材を集める（10分）',
  '③ ドラフトを作る（15分）',
  '④ 清書して提出（15分）',
];
const MEETING_MATERIALS_STEPS = [
  '① 目的・結論を1行で書く（5分）',
  '② 相手の論点を3つ予測する（5分）',
  '③ 必要な材料を集める（10分）',
  '④ 1枚ドラフト（15分）',
  '⑤ 送付・共有（5分）',
];
const FAMILY_EVENT_STEPS = [
  '① 日時を確定して連絡（5分）',
  '② 予約・チケット（10分）',
  '③ 持ち物チェック（5分）',
  '④ 移動・集合確認（5分）',
  '⑤ 当日リマインド文を作る（5分）',
];

const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const resolveThemeSetting = (): ThemeSetting => {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  if (stored === 'mint' || stored === 'mono') {
    return 'light';
  }
  return 'system';
};

const resolveSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const resolveLanguage = (): Language => {
  if (typeof window === 'undefined') return 'ja';
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'ja' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
};

const resolveLongPressDelay = (): number => {
  if (typeof window === 'undefined') return 5000;
  const stored = Number(localStorage.getItem(LONG_PRESS_STORAGE_KEY));
  return LONG_PRESS_OPTIONS.includes(stored) ? stored : 5000;
};

const resolveLastRoomId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_ROOM_STORAGE_KEY);
};

const formatTimeAgo = (date: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) return '—';

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `${hours}時間前`;

  const days = Math.floor(diffMs / 86400000);
  return `${days}日前`;
};

function App() {
  // [リファクタ A-3] AuthContextから認証状態を直接取得
  const { uid, isLoading, isOnline } = useAuth();
  const { todos, addTodo, addTodos, toggleTodo, setTodoToday, deleteTodo, isLoaded } = useTodos();
  
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
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>(resolveThemeSetting);
  const [language, setLanguage] = useState<Language>(resolveLanguage);
  const [secretLongPressDelay, setSecretLongPressDelay] = useState(resolveLongPressDelay);
  const [lastRoomId, setLastRoomId] = useState(resolveLastRoomId);
  const [lastActivityAt, setLastActivityAt] = useState<Date | null>(null);
  const [activeTimer, setActiveTimer] = useState<{ todoId: string; endsAt: number } | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [showTimerPrompt, setShowTimerPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyTheme = (resolved: 'light' | 'dark') => {
      document.documentElement.dataset.theme = resolved;
    };

    const resolvedTheme = themeSetting === 'system' ? resolveSystemTheme() : themeSetting;
    applyTheme(resolvedTheme);
    localStorage.setItem(THEME_STORAGE_KEY, themeSetting);

    if (themeSetting !== 'system' || !window.matchMedia) return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme(media.matches ? 'dark' : 'light');
    };

    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [themeSetting]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem(LONG_PRESS_STORAGE_KEY, String(secretLongPressDelay));
  }, [secretLongPressDelay]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as { todoId?: string; endsAt?: number };
      if (parsed.todoId && typeof parsed.endsAt === 'number') {
        setActiveTimer({ todoId: parsed.todoId, endsAt: parsed.endsAt });
      }
    } catch {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!activeTimer) {
      localStorage.removeItem(TIMER_STORAGE_KEY);
      return;
    }
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(activeTimer));
  }, [activeTimer]);

  useEffect(() => {
    if (!activeTimer) {
      setRemainingMs(0);
      setShowTimerPrompt(false);
      return;
    }

    const updateRemaining = () => {
      const diff = activeTimer.endsAt - Date.now();
      if (diff <= 0) {
        setRemainingMs(0);
        setShowTimerPrompt(true);
        return true;
      }
      setRemainingMs(diff);
      return false;
    };

    if (updateRemaining()) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (updateRemaining()) {
        window.clearInterval(intervalId);
      }
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeTimer]);

  useEffect(() => {
    if (!activeTimer) return;
    const target = todos.find((todo) => todo.id === activeTimer.todoId);
    if (!target || target.completed) {
      setActiveTimer(null);
      setShowTimerPrompt(false);
    }
  }, [activeTimer, todos]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!lastRoomId || currentScreen !== 'home') {
      setLastActivityAt(null);
      return;
    }

    let isActive = true;
    getRoom(lastRoomId)
      .then((room) => {
        if (!isActive) return;
        if (!room) {
          setLastActivityAt(null);
          return;
        }

        const updatedAt = room.updatedAt?.toDate?.() ?? null;
        const lastMessageAt = room.lastMessageAt?.toDate?.() ?? null;
        setLastActivityAt(updatedAt || lastMessageAt);
      })
      .catch(() => {
        if (isActive) {
          setLastActivityAt(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [lastRoomId, currentScreen]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const handleToggleToday = useCallback((id: string) => {
    const target = todos.find((todo) => todo.id === id);
    if (!target) return;
    const nextValue = !target.isToday;
    if (nextValue) {
      const todayCount = todos.filter((todo) => todo.isToday).length;
      if (todayCount >= 3) {
        setToast('今日は3つまで');
        return;
      }
    }
    setTodoToday(id, nextValue);
  }, [setTodoToday, setToast, todos]);

  const handleStartTimer = useCallback((id: string) => {
    setActiveTimer({ todoId: id, endsAt: Date.now() + FIVE_MINUTES_MS });
    setShowTimerPrompt(false);
  }, []);

  const handleStopTimer = useCallback(() => {
    setActiveTimer(null);
    setShowTimerPrompt(false);
  }, []);

  const handleCompleteFromTimer = useCallback(() => {
    if (!activeTimer) return;
    const target = todos.find((todo) => todo.id === activeTimer.todoId);
    if (target && !target.completed) {
      toggleTodo(target.id);
    }
    setActiveTimer(null);
    setShowTimerPrompt(false);
  }, [activeTimer, todos, toggleTodo]);

  const handleContinueTimer = useCallback(() => {
    if (!activeTimer) return;
    setActiveTimer({ todoId: activeTimer.todoId, endsAt: Date.now() + TEN_MINUTES_MS });
    setShowTimerPrompt(false);
  }, [activeTimer]);

  const handleStopFromPrompt = useCallback(() => {
    setActiveTimer(null);
    setShowTimerPrompt(false);
  }, []);

  const handleAddTodo = useCallback((text: string, type: TodoCreateType) => {
    if (type === 'workPlan') {
      addTodos([text, ...WORK_PLAN_STEPS]);
      return;
    }
    if (type === 'meetingMaterials') {
      addTodos([text, ...MEETING_MATERIALS_STEPS]);
      return;
    }
    if (type === 'familyEvent') {
      addTodos([text, ...FAMILY_EVENT_STEPS]);
      return;
    }
    addTodo(text);
  }, [addTodo, addTodos]);

  // 裏モード入口（長押し）
  const handleSecretLongPress = useCallback(() => {
    setShowJoinModal(true);
  }, []);

  // ルーム参加
  // [リファクタ B-3] 依存配列にisOnlineを追加して常に最新の状態で判定
  const handleJoinRoom = useCallback(async (roomKey: string, label: string) => {
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
      setLastRoomId(result.roomId);
      localStorage.setItem(LAST_ROOM_STORAGE_KEY, result.roomId);
      if (label) {
        setRoomLabel(result.roomId, label);
      }
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

  const todayTodos = todos.filter((todo) => todo.isToday);
  const backlogTodos = todos.filter((todo) => !todo.isToday);
  const hasVisibleTodos = todos.some((todo) => !todo.isSecret);
  const activeTimerTodo = activeTimer
    ? todos.find((todo) => todo.id === activeTimer.todoId) ?? null
    : null;

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
        <div className="todaySticky">
          <div className="flex items-end justify-between mb-2 mt-2">
            <h2 className="text-sm font-bold text-text-sub">
              今日3つ
            </h2>
            <p className="text-xs text-text-muted">
              最終更新: {formatTimeAgo(lastActivityAt)}
            </p>
          </div>

          <div className="space-y-2">
            {todayTodos.length > 0 ? (
              todayTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={handleToggle}
                  onToggleToday={handleToggleToday}
                  onStartTimer={handleStartTimer}
                  onDelete={deleteTodo}
                  secretLongPressDelay={secretLongPressDelay}
                />
              ))
            ) : hasVisibleTodos ? (
              <p className="text-sm text-text-muted py-2">今日のタスクはありません</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 mb-2">
          <h2 className="text-sm font-bold text-text-sub">
            バックログ
          </h2>
        </div>

        <div className="space-y-2">
          {backlogTodos.length > 0 ? (
            backlogTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onToggleToday={handleToggleToday}
                onStartTimer={handleStartTimer}
                onDelete={deleteTodo}
                secretLongPressDelay={secretLongPressDelay}
              />
            ))
          ) : hasVisibleTodos ? (
            <p className="text-sm text-text-muted py-2">バックログは空です</p>
          ) : null}
        </div>
        
        {!hasVisibleTodos && (
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
        onAdd={handleAddTodo}
      />
      
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        secretLongPressDelay={secretLongPressDelay}
        onSecretLongPressDelayChange={setSecretLongPressDelay}
        themeSetting={themeSetting}
        onThemeSettingChange={setThemeSetting}
        language={language}
        onLanguageChange={setLanguage}
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

      {activeTimer && activeTimerTodo && (
        <div className="fixed bottom-0 left-0 right-0 bg-card-white border-t border-border-light
          px-4 py-3 safe-area-bottom z-40"
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-main truncate">
                {activeTimerTodo.text}
              </p>
              <p className="text-xs text-text-muted">
                {formatCountdown(remainingMs)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStopTimer}
                className="min-h-[44px] px-4 rounded-full border border-border-light
                  text-sm font-semibold text-text-sub hover:bg-gray-100 transition-colors"
              >
                停止
              </button>
              <button
                type="button"
                onClick={handleCompleteFromTimer}
                className="min-h-[44px] px-4 rounded-full bg-brand-mint text-white
                  text-sm font-semibold hover:bg-main-deep transition-colors"
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}

      {showTimerPrompt && activeTimer && activeTimerTodo && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div
            className="w-full max-w-lg bg-card-white rounded-t-2xl p-6 safe-area-bottom
              animate-slide-up"
          >
            <div className="mb-4">
              <p className="text-sm text-text-muted">5分経ちました</p>
              <h2 className="text-lg font-bold text-text-main">
                次はどうする？
              </h2>
            </div>
            <p className="text-sm text-text-sub mb-4 truncate">
              {activeTimerTodo.text}
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleContinueTimer}
                className="w-full py-3 bg-brand-mint text-white font-bold rounded-xl
                  hover:bg-main-deep transition-colors"
              >
                続ける（10分）
              </button>
              <button
                type="button"
                onClick={handleStopFromPrompt}
                className="w-full py-3 bg-bg-soft border border-border-light rounded-xl
                  text-text-sub font-medium hover:bg-gray-100 transition-colors"
              >
                次へ移る
              </button>
              <button
                type="button"
                onClick={handleStopFromPrompt}
                className="w-full py-3 bg-bg-soft border border-border-light rounded-xl
                  text-text-sub font-medium hover:bg-gray-100 transition-colors"
              >
                いったん終了
              </button>
            </div>
          </div>
        </div>
      )}
      
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
