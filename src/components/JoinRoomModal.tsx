import { useState, useRef, useEffect } from 'react';
import { X, Copy, Sparkles, Check } from 'lucide-react';
import { generateRoomKey, validateRoomKey } from '../services/roomKey';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (roomKey: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const JoinRoomModal = ({ 
  isOpen, 
  onClose, 
  onJoin, 
  isLoading = false,
  error = null 
}: JoinRoomModalProps) => {
  const [roomKey, setRoomKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoomKey('');
      setLocalError(null);
      setCopied(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 外部からのエラーを表示
  useEffect(() => {
    if (error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalError(error);
    }
  }, [error]);

  const handleGenerateKey = () => {
    const newKey = generateRoomKey();
    setRoomKey(newKey);
    setLocalError(null);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック
      const textArea = document.createElement('textarea');
      textArea.value = roomKey;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cooldown) return;
    
    const validation = validateRoomKey(roomKey);
    if (!validation.valid) {
      setLocalError(validation.error || 'キーが短いか、形式が違うみたい');
      return;
    }
    
    setLocalError(null);
    
    // 5秒クールダウン
    setCooldown(true);
    setTimeout(() => setCooldown(false), 5000);
    
    onJoin(roomKey);
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
          <h2 className="text-lg font-bold text-text-main">ルームに入る</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-text-sub" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ルームキー入力 */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={roomKey}
              onChange={(e) => {
                setRoomKey(e.target.value);
                setLocalError(null);
              }}
              placeholder="例) mint-piano-river-92"
              className={`w-full px-4 py-3 bg-bg-soft border rounded-xl
                text-text-main placeholder:text-text-muted
                focus:outline-none focus:ring-2 transition-all
                ${localError 
                  ? 'border-error focus:border-error focus:ring-error/20' 
                  : 'border-border-light focus:border-brand-mint focus:ring-brand-mint/20'
                }`}
            />
            {roomKey && (
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5
                  hover:bg-gray-200 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4 text-text-muted" />
                )}
              </button>
            )}
          </div>
          
          {/* ヘルパーテキスト / エラー */}
          <div className="mt-2 min-h-[20px]">
            {localError ? (
              <p className="text-sm text-error">{localError}</p>
            ) : (
              <p className="text-xs text-text-muted">10文字以上 / 英数記号</p>
            )}
          </div>

          {/* コピー完了メッセージ */}
          {copied && (
            <div className="mt-2 p-3 bg-success/10 rounded-xl">
              <p className="text-sm text-success font-medium">
                コピーしました！このキーを相手にも送ってね
              </p>
            </div>
          )}

          {/* ボタン群 */}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleGenerateKey}
              className="flex-1 flex items-center justify-center gap-2 py-3
                bg-bg-soft border border-border-light rounded-xl
                text-text-sub font-medium
                hover:bg-gray-100 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              キー生成
            </button>
            <button
              type="submit"
              disabled={!roomKey.trim() || isLoading || cooldown}
              className="flex-1 py-3 bg-brand-mint text-white font-bold rounded-xl
                hover:bg-main-deep transition-colors
                disabled:bg-border-light disabled:cursor-not-allowed"
            >
              {isLoading ? '接続中...' : cooldown ? '待機中...' : '入室 / 作成'}
            </button>
          </div>

          {/* 案内メッセージ */}
          <p className="mt-4 text-xs text-center text-text-muted">
            同じキーを入力した人同士でチャットできます
          </p>
        </form>
      </div>
    </div>
  );
};
