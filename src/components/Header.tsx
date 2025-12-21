import { Settings } from 'lucide-react';
import { useLongPress } from '../hooks/useLongPress';

interface HeaderProps {
  onSettingsClick: () => void;
  onSecretLongPress: () => void;
  secretLongPressDelay: number;
}

export const Header = ({ onSettingsClick, onSecretLongPress, secretLongPressDelay }: HeaderProps) => {
  const titleLongPress = useLongPress({
    onLongPress: onSecretLongPress,
    delay: secretLongPressDelay,
  });

  return (
    <header className="sticky top-0 z-40 bg-bg-soft/80 backdrop-blur-md safe-area-top">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 
          className="text-xl font-bold text-text-main select-none"
          onTouchStart={titleLongPress.onTouchStart}
          onTouchEnd={titleLongPress.onTouchEnd}
          onMouseDown={titleLongPress.onMouseDown}
          onMouseUp={titleLongPress.onMouseUp}
          onMouseLeave={titleLongPress.onMouseLeave}
          onClick={titleLongPress.onClick}
        >
          しれっとToDo
        </h1>
        <button
          onClick={onSettingsClick}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="設定"
        >
          <Settings className="w-6 h-6 text-text-sub" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
};
