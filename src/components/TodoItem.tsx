import { useState } from 'react';
import { Check, Trash2, Video } from 'lucide-react';
import type { Todo } from '../types/todo';
import { useLongPress } from '../hooks/useLongPress';
import type { Language } from '../i18n';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleToday: (id: string) => void;
  onStartTimer?: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSnoozeTomorrow?: () => void;
  onSnoozeNextWeek?: () => void;
  language: Language;
  secretLongPressDelay?: number;
}

export const TodoItem = ({ 
  todo, 
  onToggle, 
  onDelete,
  onToggleToday,
  onStartTimer,
  onEdit,
  onMoveUp,
  onMoveDown,
  onSnoozeTomorrow,
  onSnoozeNextWeek,
  language,
  secretLongPressDelay,
}: TodoItemProps) => {
  const [showDelete, setShowDelete] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const isWorkStep = /^[①②③④⑤]/.test(todo.text);
  const isToday = Boolean(todo.isToday);
  const showStartTimer = !todo.completed && Boolean(onStartTimer);
  const showReorder = !todo.completed && (onMoveUp || onMoveDown);
  const showSnooze = !todo.completed && (onSnoozeTomorrow || onSnoozeNextWeek);
  const kindBadge = todo.kind === 'reply'
    ? (language === 'en' ? 'Reply' : '返信')
    : todo.kind === 'payment'
      ? (language === 'en' ? 'Pay' : '支払い')
      : null;
  const deadlineLabel = (() => {
    if (!todo.deadlineAt) return null;
    const match = todo.deadlineAt.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[2]}/${match[3]}`;
    }
    const parsed = new Date(todo.deadlineAt);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
  })();

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const startEditing = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    setEditText(todo.text);
    setIsEditing(true);
  };

  const cancelEditing = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    setIsEditing(false);
    setEditText('');
  };

  const saveEditing = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    const trimmed = editText.trim();
    if (trimmed) {
      onEdit(todo.id, trimmed);
    }
    setIsEditing(false);
    setEditText('');
  };

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
    if (isEditing) return;
    setIsPressed(true);
    longPressHandlers.onTouchStart();
  };

  const handleTouchEnd = () => {
    if (isEditing) return;
    setIsPressed(false);
    longPressHandlers.onTouchEnd();
  };

  const handleMouseDown = () => {
    if (isEditing) return;
    setIsPressed(true);
    longPressHandlers.onMouseDown();
  };

  const handleMouseUp = () => {
    if (isEditing) return;
    setIsPressed(false);
    longPressHandlers.onMouseUp();
  };

  const handleMouseLeave = () => {
    if (isEditing) return;
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
        onClick={isEditing ? undefined : longPressHandlers.onClick}
        className={`
          flex gap-4 p-4 min-h-[60px] bg-card-white rounded-xl
          border border-border-light shadow-sm
          transition-all duration-200 cursor-pointer select-none
          ${isPressed ? 'scale-[0.98] bg-gray-50' : ''}
          ${todo.completed ? 'opacity-60' : ''}
          ${isWorkStep ? 'ml-3' : ''}
          ${isEditing ? 'items-start' : 'items-center'}
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
          {isEditing ? (
            <div className="w-full">
              <textarea
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                rows={2}
                className="w-full text-[16px] leading-relaxed text-text-main bg-bg-soft
                  border border-border-light rounded-lg px-3 py-2 resize-none
                  focus:outline-none focus:border-brand-mint focus:ring-2 focus:ring-brand-mint/20"
                onClick={stopPropagation}
                onTouchStart={stopPropagation}
                onMouseDown={stopPropagation}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="min-h-[36px] px-3 rounded-full border border-border-light
                    text-xs font-semibold text-text-sub hover:bg-gray-100 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={saveEditing}
                  className="min-h-[36px] px-3 rounded-full bg-brand-mint text-white
                    text-xs font-semibold hover:bg-main-deep transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <span
                className={`
                  text-[17px] leading-relaxed font-medium
                  ${todo.completed ? 'line-through text-text-muted' : 'text-text-main'}
                `}
              >
                {todo.text}
              </span>
              {deadlineLabel && (
                <div className="mt-1 text-xs text-text-muted">
                  期限 {deadlineLabel}
                </div>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2">
            {showReorder && (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveUp?.();
                  }}
                  disabled={!onMoveUp}
                  className="min-h-[32px] min-w-[32px] rounded-md border border-border-light
                    text-xs text-text-sub hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveDown?.();
                  }}
                  disabled={!onMoveDown}
                  className="min-h-[32px] min-w-[32px] rounded-md border border-border-light
                    text-xs text-text-sub hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                  ↓
                </button>
              </div>
            )}
            {showSnooze && (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSnoozeTomorrow?.();
                  }}
                  disabled={!onSnoozeTomorrow}
                  className="min-h-[32px] min-w-[44px] rounded-md border border-border-light
                    text-xs text-text-sub hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                  明日
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSnoozeNextWeek?.();
                  }}
                  disabled={!onSnoozeNextWeek}
                  className="min-h-[32px] min-w-[44px] rounded-md border border-border-light
                    text-xs text-text-sub hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                  来週
                </button>
              </div>
            )}
            {kindBadge && (
              <span className="px-2 py-1 text-[12px] font-semibold rounded-full border
                bg-bg-soft border-border-light text-text-sub"
              >
                {kindBadge}
              </span>
            )}
            <button
              type="button"
              onClick={startEditing}
              className="min-h-[36px] px-3 rounded-full border border-border-light
                text-xs font-semibold text-text-sub hover:bg-gray-100 transition-colors"
            >
              編集
            </button>
            <button
              type="button"
              aria-pressed={isToday}
              onClick={(event) => {
                event.stopPropagation();
                onToggleToday(todo.id);
              }}
              onTouchStart={stopPropagation}
              onMouseDown={stopPropagation}
              className={`tap-target px-3 text-xs font-semibold rounded-full border
                ${isToday
                  ? 'bg-brand-mint/15 border-brand-mint text-brand-mint'
                  : 'bg-bg-soft border-border-light text-text-sub hover:bg-gray-100'
                }`}
            >
              今日
            </button>
            {showStartTimer && onStartTimer && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onStartTimer(todo.id);
                }}
                onTouchStart={stopPropagation}
                onMouseDown={stopPropagation}
                className="tap-target px-3 text-xs font-semibold rounded-full border
                  bg-bg-soft border-border-light text-text-sub hover:bg-gray-100"
              >
                ▶︎ 5分着手
              </button>
            )}
          </div>
        )}
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
