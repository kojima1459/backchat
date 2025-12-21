import { useState } from 'react';
import { HelpCircle, Settings } from 'lucide-react';
import { useLongPress } from '../hooks/useLongPress';

interface HeaderProps {
  onHelpClick: () => void;
  onSettingsClick: () => void;
  onSecretLongPress: () => void;
  secretLongPressDelay: number;
}

export const Header = ({
  onHelpClick,
  onSettingsClick,
  onSecretLongPress,
  secretLongPressDelay,
}: HeaderProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const titleLongPress = useLongPress({
    onLongPress: onSecretLongPress,
    delay: secretLongPressDelay,
  });

  const handleTouchStart = () => {
    setIsPressed(true);
    titleLongPress.onTouchStart();
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    titleLongPress.onTouchEnd();
  };

  const handleMouseDown = () => {
    setIsPressed(true);
    titleLongPress.onMouseDown();
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    titleLongPress.onMouseUp();
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
    titleLongPress.onMouseLeave();
  };

  return (
    <header className="sticky top-0 z-40 bg-bg-soft/80 backdrop-blur-md safe-area-top">
      <div className="flex items-center justify-between px-4 py-4 min-h-[60px]">
        <h1 
          className={`text-[18px] font-bold text-text-main select-none transition-transform transition-opacity duration-150
            ${isPressed ? 'opacity-90 scale-[0.98]' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={titleLongPress.onClick}
        >
          The To Do
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onHelpClick}
            className="tap-target p-2 hover:bg-gray-100 transition-colors"
            aria-label="ヘルプ"
          >
            <HelpCircle className="w-6 h-6 text-text-sub" strokeWidth={1.75} />
          </button>
          <button
            onClick={onSettingsClick}
            className="tap-target p-2 hover:bg-gray-100 transition-colors"
            aria-label="設定"
          >
            <Settings className="w-6 h-6 text-text-sub" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
};
