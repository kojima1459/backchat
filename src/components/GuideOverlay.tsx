import { useEffect } from 'react';
import type { Language } from '../i18n';

const SHOW_GUIDE_SHORTCUT = false;

const GUIDE_CONTENT = {
  ja: {
    title: '使い方',
    back: '← 戻る',
    sections: [
      {
        title: 'すぐ使う',
        items: [
          '上の入力欄に書いて追加（複数行ならまとめて追加）',
          'タスクをタップで完了、長押しで削除',
        ],
      },
      {
        title: '今日（最大3つ）',
        items: [
          '今日は3つだけ。終わらせることが目的です',
          '各タスクの「今日」切替で入れ替えできます',
        ],
      },
      {
        title: '編集・並び替え',
        items: [
          'タスクは複数行で編集できます',
          'バックログは ↑↓ で並び替えできます',
        ],
      },
      {
        title: 'スヌーズ',
        items: [
          '「明日」「来週」で一旦隠して、期日になったら戻ります',
        ],
      },
      {
        title: '締切と自動優先',
        items: [
          '締切があるものは期限が近いほど上に来ます（自動優先ON時）',
        ],
      },
      {
        title: '返信/支払い',
        items: [
          '忘れやすい系は自動でTodayに1件入ることがあります',
        ],
      },
      {
        title: 'タイマー（集中しすぎ防止）',
        items: [
          '5分着手→集中→休憩。終わりは「休憩」が基本で、続けるには一手間あります',
        ],
      },
      {
        title: 'AI 段取り分解',
        items: [
          'Gemini APIキーを設定すると、1タスクを手順に分解してサブToDoにできます',
          'キーも含めてデータは端末内保存です',
        ],
      },
      {
        title: '表示',
        items: [
          'テーマ（ライト/ダーク/自動）、言語（日本語/英語）を切替できます',
        ],
      },
      {
        title: 'プライバシー',
        items: [
          'データは基本この端末内（localStorage）に保存されます',
        ],
      },
    ],
    shortcut: {
      title: 'ショートカット',
      items: ['上部タイトルを長押しで共有メモ'],
    },
  },
  en: {
    title: 'Guide',
    back: '← Back',
    sections: [
      {
        title: 'Quick start',
        items: [
          'Type in the inbox and add tasks (multi-line = multiple tasks)',
          'Tap a task to complete, long-press to delete',
        ],
      },
      {
        title: 'Today (max 3)',
        items: [
          'Keep only 3 items for today to avoid overload',
          'Toggle “Today” on each task to move it',
        ],
      },
      {
        title: 'Edit & Reorder',
        items: [
          'Edit supports multi-line',
          'Reorder Backlog with ↑ ↓',
        ],
      },
      {
        title: 'Snooze',
        items: [
          '“Tomorrow / Next week” hides items until the date',
        ],
      },
      {
        title: 'Deadlines & Auto priority',
        items: [
          'When Auto Priority is ON, closer deadlines bubble up',
        ],
      },
      {
        title: 'Reply / Pay',
        items: [
          'One reply/payment may be forced into Today to prevent forgetting',
        ],
      },
      {
        title: 'Stop-first Timer',
        items: [
          '5-min start → Focus → Break. Default is rest/stop; continue needs extra friction',
        ],
      },
      {
        title: 'AI Breakdown',
        items: [
          'Add your Gemini API key to break a task into steps and add sub-todos',
          'Everything stays on-device (localStorage)',
        ],
      },
      {
        title: 'Display',
        items: [
          'Theme (Light/Dark/System) + Language (JP/EN)',
        ],
      },
      {
        title: 'Privacy',
        items: [
          'Data is stored locally on this device',
        ],
      },
    ],
    shortcut: {
      title: 'Shortcut',
      items: ['Long-press the title to open shared notes'],
    },
  },
} as const;

interface GuideOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const GuideOverlay = ({ isOpen, onClose, language }: GuideOverlayProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = GUIDE_CONTENT[language];

  return (
    <div className="fixed inset-0 h-[100dvh] bg-bg-soft flex flex-col z-50">
      <header className="bg-card-white border-b border-border-light safe-area-top">
        <div className="grid min-h-[60px] grid-cols-[auto,1fr,auto] items-center gap-2 px-4 py-4">
          <button
            onClick={onClose}
            className="tap-target text-[16px] font-semibold text-text-sub hover:text-text-main transition-colors"
          >
            {content.back}
          </button>
          <h2 className="text-[17px] font-semibold text-text-main text-center">
            {content.title}
          </h2>
          <div />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 safe-area-bottom">
        <div className="max-w-lg mx-auto space-y-6">
          {content.sections.map((section) => (
            <section key={section.title} className="space-y-2">
              <h3 className="text-sm font-bold text-text-sub">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <p key={item} className="text-sm text-text-main leading-relaxed">
                    {item}
                  </p>
                ))}
              </div>
            </section>
          ))}
          {SHOW_GUIDE_SHORTCUT && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-text-sub">
                {content.shortcut.title}
              </h3>
              <div className="space-y-2">
                {content.shortcut.items.map((item) => (
                  <p key={item} className="text-sm text-text-main leading-relaxed">
                    {item}
                  </p>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};
