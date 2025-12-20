import { X, DoorOpen, Info } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: () => void;
}

export const SettingsModal = ({ isOpen, onClose, onJoinRoom }: SettingsModalProps) => {
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
          {/* ルームに入る（裏モード入口） */}
          <button
            onClick={() => {
              onClose();
              onJoinRoom();
            }}
            className="w-full flex items-center gap-3 p-4 bg-bg-soft rounded-xl
              hover:bg-gray-100 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-brand-mint/10 rounded-full flex items-center justify-center">
              <DoorOpen className="w-5 h-5 text-brand-mint" />
            </div>
            <div>
              <div className="font-medium text-text-main">ルームに入る</div>
              <div className="text-sm text-text-muted">共有キーでルームに参加</div>
            </div>
          </button>

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
      </div>
    </div>
  );
};
