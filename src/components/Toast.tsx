import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

export const Toast = ({ message, duration = 2000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // アニメーション後に削除
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 
        bg-text-main text-white px-4 py-2 rounded-full text-sm font-medium
        shadow-lg transition-all duration-300 z-50
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      {message}
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

export const getRandomPositiveMessage = () => {
  return POSITIVE_MESSAGES[Math.floor(Math.random() * POSITIVE_MESSAGES.length)];
};
