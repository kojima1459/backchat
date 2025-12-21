import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export type TodoCreateType = 'normal' | 'workPlan' | 'meetingMaterials' | 'familyEvent';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (text: string, type: TodoCreateType) => void;
}

export const AddTodoModal = ({ isOpen, onClose, onAdd }: AddTodoModalProps) => {
  const [text, setText] = useState('');
  const [taskType, setTaskType] = useState<TodoCreateType>('normal');
  const inputRef = useRef<HTMLInputElement>(null);
  const typeOptions: Array<{ value: TodoCreateType; label: string }> = [
    { value: 'normal', label: '通常' },
    { value: 'workPlan', label: '仕事の段取り' },
    { value: 'meetingMaterials', label: '打ち合わせ資料' },
    { value: 'familyEvent', label: '家族イベント' },
  ];

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText('');
      setTaskType('normal');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim(), taskType);
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
          <div className="mb-4">
            <div className="text-xs text-text-muted mb-2">種類</div>
            <div className="grid grid-cols-2 gap-2">
              {typeOptions.map((option) => {
                const isActive = taskType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTaskType(option.value)}
                    className={`min-h-[44px] px-3 py-2 rounded-lg border text-sm font-medium
                      transition-colors
                      ${isActive
                        ? 'bg-brand-mint/15 border-brand-mint text-brand-mint'
                        : 'bg-bg-soft border-border-light text-text-sub hover:bg-gray-100'
                      }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
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
