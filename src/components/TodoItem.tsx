import { useState } from 'react';
import { Check, Trash2, Video } from 'lucide-react';
import type { Todo } from '../types/todo';
import { useLongPress } from '../hooks/useLongPress';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSecretLongPress?: () => void;
  secretLongPressDelay?: number;
}

export const TodoItem = ({ 
  todo, 
  onToggle, 
  onDelete, 
  onSecretLongPress,
  secretLongPressDelay,
}: TodoItemProps) => {
  const [showDelete, setShowDelete] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const shouldTriggerEntry = Boolean(onSecretLongPress) && !todo.isSecret;

  // 裏モード入口の長押しハンドラー
  const secretLongPress = useLongPress({
    onLongPress: () => {
      if (onSecretLongPress) {
        // 振動フィードバック（対応デバイスのみ）
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        onSecretLongPress();
      }
    },
    onClick: () => {
      if (todo.isSecret) {
        onToggle(todo.id);
      }
    },
    delay: secretLongPressDelay ?? 5000, // 裏モード入口: 5秒長押し
  });

  // 通常タスクの長押しハンドラー（削除メニュー表示）
  const normalLongPress = useLongPress({
    onLongPress: () => {
      if (!todo.isSecret) {
        setShowDelete(true);
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    },
    onClick: () => {
      if (!todo.isSecret) {
        onToggle(todo.id);
      }
    },
    delay: 500,
  });

  const longPressHandlers = todo.isSecret ? secretLongPress : normalLongPress;

  const handleTouchStart = () => {
    setIsPressed(true);
    if (shouldTriggerEntry) {
      secretLongPress.onTouchStart();
    }
    longPressHandlers.onTouchStart();
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (shouldTriggerEntry) {
      secretLongPress.onTouchEnd();
    }
    longPressHandlers.onTouchEnd();
  };

  const handleMouseDown = () => {
    setIsPressed(true);
    if (shouldTriggerEntry) {
      secretLongPress.onMouseDown();
    }
    longPressHandlers.onMouseDown();
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    if (shouldTriggerEntry) {
      secretLongPress.onMouseUp();
    }
    longPressHandlers.onMouseUp();
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
    if (shouldTriggerEntry) {
      secretLongPress.onMouseLeave();
    }
    longPressHandlers.onMouseLeave();
  };

  return (
    <div className="relative">
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={longPressHandlers.onClick}
        className={`
          flex items-center gap-3 p-4 bg-card-white rounded-xl
          border border-border-light shadow-sm
          transition-all duration-200 cursor-pointer select-none
          ${isPressed ? 'scale-[0.98] bg-gray-50' : ''}
          ${todo.completed ? 'opacity-60' : ''}
        `}
      >
        {/* チェックボックス */}
        <div
          className={`
            w-6 h-6 rounded-lg border-2 flex items-center justify-center
            transition-all duration-200
            ${todo.completed 
              ? 'bg-brand-mint border-brand-mint' 
              : 'border-border-light hover:border-brand-mint'
            }
          `}
        >
          {todo.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </div>

        {/* タスクテキスト */}
        <div className="flex-1 flex items-center gap-2">
          {todo.isSecret && (
            <Video className="w-4 h-4 text-text-muted" />
          )}
          <span
            className={`
              text-[15px] font-medium
              ${todo.completed ? 'line-through text-text-muted' : 'text-text-main'}
            `}
          >
            {todo.text}
          </span>
        </div>
      </div>

      {/* 削除確認オーバーレイ */}
      {showDelete && !todo.isSecret && (
        <div 
          className="absolute inset-0 bg-error/10 rounded-xl flex items-center justify-end px-4"
          onClick={() => setShowDelete(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todo.id);
              setShowDelete(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-lg
              font-medium text-sm hover:bg-accent-deep transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            削除
          </button>
        </div>
      )}
    </div>
  );
};
