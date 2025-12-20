import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MoreVertical, Send, Trash2 } from 'lucide-react';
import type { MessageData } from '../services/message';
import { subscribeMessages, sendMessage, markAsRead } from '../services/message';
import { deleteRoom } from '../services/room';

interface ChatRoomProps {
  roomId: string;
  uid: string;
  onBack: () => void;
  onRoomDeleted: () => void;
}

export const ChatRoom = ({ roomId, uid, onBack, onRoomDeleted }: ChatRoomProps) => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
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

  const handleDeleteRoom = async () => {
    if (confirm('本当にルームを削除しますか？')) {
      const success = await deleteRoom(roomId);
      if (success) {
        onRoomDeleted();
      }
    }
    setShowMenu(false);
  };

  // roomIdの最初の4文字を表示用に使用
  const displayRoomId = roomId.substring(0, 4).toUpperCase();

  return (
    <div className="fixed inset-0 bg-bg-soft flex flex-col z-50">
      {/* ヘッダー */}
      <header className="bg-card-white border-b border-border-light safe-area-top">
        <div className="flex items-center justify-between px-2 py-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-text-sub" />
          </button>
          
          <h1 className="text-base font-bold text-text-main">
            Room: {displayRoomId}
          </h1>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical className="w-6 h-6 text-text-sub" />
            </button>
            
            {/* ドロップダウンメニュー */}
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-card-white 
                  rounded-xl shadow-lg border border-border-light z-20 overflow-hidden">
                  <button
                    onClick={onBack}
                    className="w-full px-4 py-3 text-left text-text-main
                      hover:bg-gray-50 transition-colors"
                  >
                    Homeへ戻る
                  </button>
                  <button
                    onClick={handleDeleteRoom}
                    className="w-full px-4 py-3 text-left text-error
                      hover:bg-error/5 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    ルームを削除
                  </button>
                </div>
              </>
            )}
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
