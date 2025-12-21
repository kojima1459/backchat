import { useState, useEffect, useRef, useCallback } from 'react';
import { DoorOpen, MoreVertical, Send, Trash2, X } from 'lucide-react';
import type { MessageData } from '../services/message';
import { subscribeMessages, sendMessage, markAsRead } from '../services/message';
import { deleteRoom, leaveRoom } from '../services/room';

interface ChatRoomProps {
  roomId: string;
  uid: string;
  onBack: () => void;
  onRoomDeleted: () => void;
  onRoomLeft: () => void;
}

export const ChatRoom = ({ roomId, uid, onBack, onRoomDeleted, onRoomLeft }: ChatRoomProps) => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [inputText, setInputText] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // メッセージを購読
  useEffect(() => {
    const unsubscribe = subscribeMessages(roomId, (newMessages) => {
      setMessages(newMessages);
      
      // 未読メッセージを既読にする
      newMessages.forEach((msg) => {
        if (!msg.readBy.includes(uid) && msg.senderUid !== uid) {
          markAsRead(roomId, msg.id, uid, msg.readBy);
        }
      });
    });
    
    return () => unsubscribe();
  }, [roomId, uid]);

  // 新しいメッセージが来たら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    
    setIsSending(true);
    const text = inputText.trim();
    setInputText('');
    
    const success = await sendMessage(roomId, uid, text);
    if (!success) {
      setInputText(text); // 失敗したら復元
    }
    
    setIsSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openActions = () => {
    setActionError(null);
    setShowDeleteConfirm(false);
    setShowActions(true);
  };

  const closeActions = () => {
    setShowActions(false);
    setShowDeleteConfirm(false);
    setActionError(null);
  };

  const handleExit = useCallback(() => {
    closeActions();
    onBack();
  }, [onBack]);

  const handleLeaveRoom = async () => {
    if (isLeaving || isDeleting) return;
    setIsLeaving(true);
    setActionError(null);

    const success = await leaveRoom(roomId, uid);

    setIsLeaving(false);

    if (success) {
      closeActions();
      onRoomLeft();
      return;
    }

    setActionError('退出できませんでした。ルームが削除されている可能性があります。');
  };

  const handleDeleteRoom = async () => {
    if (isLeaving || isDeleting) return;
    setIsDeleting(true);
    setActionError(null);

    const success = await deleteRoom(roomId);

    setIsDeleting(false);

    if (success) {
      closeActions();
      onRoomDeleted();
      return;
    }

    setActionError('削除に失敗しました。もう一度試してください。');
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExit]);

  return (
    <div className="fixed inset-0 h-[100dvh] bg-bg-soft flex flex-col z-50">
      {/* ヘッダー */}
      <header className="bg-card-white border-b border-border-light safe-area-top">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={handleExit}
            className="text-sm font-semibold text-text-sub hover:text-text-main transition-colors"
          >
            ← 戻る
          </button>
          
          <div className="flex-1" />
          
          <div className="relative">
            <button
              onClick={openActions}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical className="w-6 h-6 text-text-sub" />
            </button>
          </div>
        </div>
      </header>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-muted text-sm">
              メッセージを送ってみよう
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              isMine={msg.senderUid === uid} 
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="bg-card-white border-t border-border-light p-3 safe-area-bottom">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-2.5 bg-bg-soft border border-border-light rounded-full
              text-text-main placeholder:text-text-muted
              focus:outline-none focus:border-brand-mint focus:ring-2 focus:ring-brand-mint/20
              transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="p-2.5 bg-brand-mint rounded-full
              hover:bg-main-deep transition-colors
              disabled:bg-border-light disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {showActions && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={closeActions}
        >
          <div
            className="w-full max-w-lg bg-card-white rounded-t-2xl p-6 safe-area-bottom
              animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-text-main">ルーム操作</h2>
              <button
                onClick={closeActions}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-text-sub" />
              </button>
            </div>

            <div className="bg-bg-soft rounded-xl p-4 text-sm text-text-sub">
              <p>一時退出はあなたのみ退室し、ルームとキーは残ります。</p>
              <p className="mt-2">完全削除はルーム自体を消去し、復元できません。</p>
            </div>

            <div className="mt-4 space-y-3">
              <button
                onClick={handleLeaveRoom}
                disabled={isLeaving || isDeleting}
                className="w-full flex items-center justify-center gap-2 py-3
                  bg-brand-mint text-white font-bold rounded-xl
                  hover:bg-main-deep transition-colors
                  disabled:bg-border-light disabled:cursor-not-allowed"
              >
                <DoorOpen className="w-4 h-4" />
                {isLeaving ? '退出中...' : '一時退出（キーは残る）'}
              </button>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setActionError(null);
                    setShowDeleteConfirm(true);
                  }}
                  disabled={isLeaving || isDeleting}
                  className="w-full flex items-center justify-center gap-2 py-3
                    bg-error/10 text-error font-bold rounded-xl border border-error/20
                    hover:bg-error/20 transition-colors
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  完全削除（復元不可）
                </button>

                {showDeleteConfirm && (
                  <div className="rounded-xl border border-error/20 bg-error/5 p-4">
                    <p className="text-sm text-error font-medium">
                      本当に完全削除しますか？この操作は戻せません。
                    </p>
                    <button
                      onClick={handleDeleteRoom}
                      disabled={isLeaving || isDeleting}
                      className="w-full mt-3 flex items-center justify-center gap-2 py-2.5
                        bg-error text-white font-bold rounded-xl
                        hover:bg-error/90 transition-colors
                        disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeleting ? '削除中...' : '完全削除を実行'}
                    </button>
                  </div>
                )}
              </div>

              {actionError && (
                <p className="text-sm text-error">{actionError}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// メッセージバブルコンポーネント
interface MessageBubbleProps {
  message: MessageData;
  isMine: boolean;
}

const MessageBubble = ({ message, isMine }: MessageBubbleProps) => {
  const time = message.createdAt?.toDate?.();
  const timeStr = time ? 
    `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}` 
    : '';

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
          isMine
            ? 'bg-brand-mint text-white rounded-br-md'
            : 'bg-card-white border border-border-light text-text-main rounded-bl-md'
        }`}
      >
        <p className="text-[15px] whitespace-pre-wrap break-words">
          {message.text}
        </p>
        <p className={`text-[10px] mt-1 ${
          isMine ? 'text-white/70' : 'text-text-muted'
        }`}>
          {timeStr}
        </p>
      </div>
    </div>
  );
};
