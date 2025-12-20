import { useState, useCallback } from 'react';
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

type Screen = 'home' | 'chat';

function App() {
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
        setToast('ルームを作成しました');
      }
    } else {
      setJoinError(result.error);
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
    setToast('ルームを削除しました');
  }, []);

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
      />
    );
  }

  // ホーム画面（ToDo）
  return (
    <div className="min-h-screen bg-bg-soft">
      <Header onSettingsClick={() => setShowSettingsModal(true)} />
      
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
              onSecretLongPress={handleSecretLongPress}
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
        onJoinRoom={() => setShowJoinModal(true)}
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
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
