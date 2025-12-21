import { useState } from 'react';
import { Check, Trash2, Video } from 'lucide-react';
import type { Todo } from '../types/todo';
import { useLongPress } from '../hooks/useLongPress';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  secretLongPressDelay?: number;
}

export const TodoItem = ({ 
  todo, 
  onToggle, 
  onDelete,
  secretLongPressDelay,
}: TodoItemProps) => {
  const [showDelete, setShowDelete] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isWorkStep = /^[①②③④]/.test(todo.text);

  // シークレットタスク用の長押しハンドラー（クリック抑止のために維持）
  const secretLongPress = useLongPress({
    onLongPress: () => {},
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
    longPressHandlers.onTouchStart();
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    longPressHandlers.onTouchEnd();
  };

  const handleMouseDown = () => {
    setIsPressed(true);
    longPressHandlers.onMouseDown();
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    longPressHandlers.onMouseUp();
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
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
          flex items-center gap-4 p-4 min-h-[60px] bg-card-white rounded-xl
          border border-border-light shadow-sm
          transition-all duration-200 cursor-pointer select-none
          ${isPressed ? 'scale-[0.98] bg-gray-50' : ''}
          ${todo.completed ? 'opacity-60' : ''}
          ${isWorkStep ? 'ml-3' : ''}
        `}
      >
        {/* チェックボックス */}
        <div
          className={`
            w-7 h-7 rounded-lg border-2 flex items-center justify-center
            transition-all duration-200
            ${todo.completed 
              ? 'bg-brand-mint border-brand-mint' 
              : 'border-border-light hover:border-brand-mint'
            }
          `}
        >
          {todo.completed && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
        </div>

        {/* タスクテキスト */}
        <div className="flex-1 flex items-center gap-2">
          {todo.isSecret && (
            <Video className="w-4 h-4 text-text-muted" />
          )}
          <span
            className={`
              text-[17px] leading-relaxed font-medium
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
