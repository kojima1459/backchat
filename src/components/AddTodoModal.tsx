import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (text: string) => void;
}

export const AddTodoModal = ({ isOpen, onClose, onAdd }: AddTodoModalProps) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim());
      setText('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-card-white rounded-t-2xl p-6 safe-area-bottom
          animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-main">新しいタスク</h2>
          <button
            onClick={onClose}
            className="tap-target p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-text-sub" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="タスクを入力..."
            className="w-full px-4 py-3 bg-bg-soft border border-border-light rounded-xl
              text-text-main placeholder:text-text-muted
              focus:outline-none focus:border-brand-mint focus:ring-2 focus:ring-brand-mint/20
              transition-all"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="w-full mt-4 py-3 bg-brand-mint text-white font-bold rounded-xl
              hover:bg-main-deep transition-colors
              disabled:bg-border-light disabled:cursor-not-allowed"
          >
            追加する
          </button>
        </form>
      </div>
    </div>
  );
};
