import { X, Info } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  secretLongPressDelay: number;
  onSecretLongPressDelayChange: (delay: number) => void;
}

export const SettingsModal = ({ 
  isOpen, 
  onClose, 
  secretLongPressDelay,
  onSecretLongPressDelayChange,
}: SettingsModalProps) => {
  const longPressOptions = [
    { value: 2000, label: '2s' },
    { value: 3000, label: '3s' },
    { value: 5000, label: '5s' },
    { value: 8000, label: '8s' },
  ];

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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-main">設定</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-text-sub" />
          </button>
        </div>

        <div className="space-y-2">
          {/* アプリ情報 */}
          <button
            className="w-full flex items-center gap-3 p-4 bg-bg-soft rounded-xl
              hover:bg-gray-100 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-text-muted/10 rounded-full flex items-center justify-center">
              <Info className="w-5 h-5 text-text-muted" />
            </div>
            <div>
              <div className="font-medium text-text-main">アプリについて</div>
              <div className="text-sm text-text-muted">バージョン 1.0.0</div>
            </div>
          </button>
        </div>

        <div className="mt-6 border-t border-border-light pt-4 space-y-4">
          <div>
            <div className="text-xs text-text-muted mb-2">長押し時間</div>
            <div className="grid grid-cols-4 gap-2">
              {longPressOptions.map((option) => {
                const isActive = secretLongPressDelay === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSecretLongPressDelayChange(option.value)}
                    className={`px-2 py-2 rounded-lg border text-sm font-medium
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
        </div>
      </div>
    </div>
  );
};
