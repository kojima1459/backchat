import { useEffect, useState, useCallback } from 'react';

interface ToastProps {
  message: string;
  duration?: number | null;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}

export const Toast = ({ 
  message, 
  duration = 2000, 
  actionLabel, 
  onAction,
  onClose 
}: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300); // アニメーション後に削除
  }, [onClose]);

  useEffect(() => {
    if (duration === null) return;

    const timer = setTimeout(dismiss, duration);

    return () => clearTimeout(timer);
  }, [duration, dismiss]);

  return (
    <div
      className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 
        bg-text-main text-white px-4 py-2 rounded-full text-sm font-medium
        shadow-lg transition-all duration-300 z-50 flex items-center gap-2
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      <span>{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={() => {
            onAction();
            dismiss();
          }}
          className="px-3 py-1 text-xs font-semibold text-white
            bg-white/20 rounded-full hover:bg-white/30 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// 完了時のポジティブメッセージ
const POSITIVE_MESSAGES = [
  '今日えらい！',
  'いいね！',
  'やったね！',
  'すごい！',
  'Good job!',
  'ナイス！',
  '完璧！',
];

// eslint-disable-next-line react-refresh/only-export-components
export const getRandomPositiveMessage = () => {
  return POSITIVE_MESSAGES[Math.floor(Math.random() * POSITIVE_MESSAGES.length)];
};
