import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { Language } from '../i18n';

const SHOW_GUIDE_SHORTCUT = false;

const GUIDE_CONTENT = {
  ja: {
    title: '使い方',
    back: '← 戻る',
    sections: [
      {
        title: 'このアプリの目的',
        items: [
          '「今日やる3つ」を決めて終わらせる（Todayは3つまで）',
        ],
      },
      {
        title: 'インボックス',
        items: [
          '改行ごとに複数タスクを追加できます',
        ],
      },
      {
        title: 'Today / Backlog',
        items: [
          'Todayが上に固定され、Backlogはスクロールします',
          '各タスクの「今日」切替で入れ替えできます',
        ],
      },
      {
        title: 'スヌーズ（明日/来週）',
        items: [
          '押すと一旦見えなくなり、日付が来たら戻ります',
        ],
      },
      {
        title: '5分着手タイマー',
        items: [
          'Todayから開始します',
          '終了時は「休憩する」がデフォルトで、「続ける」は二段階です（止まる設計）',
        ],
      },
      {
        title: '返信/支払い',
        items: [
          'Reply/Pay のkindがあり、未完了があれば1件だけTodayに入ります（忘れ防止）',
        ],
      },
      {
        title: 'AI 今日3つを確定（重要）',
        items: [
          'ボタンを押す',
          'AIが「今日の3つ候補 + 理由 + 最初の5分」を返す',
          '「適用」1タップでTodayに入る',
          '判断がしんどい時はこれだけ押せばOK',
        ],
      },
      {
        title: 'AI 段取り分解（重要）',
        items: [
          'タスクの「AI 段取り分解」を押す',
          'AIが「完了条件→素材→ドラフト→清書」を生成',
          '「サブToDoとして追加」で①〜④がBacklogに増える',
          '逆算が苦手な人のための機能です',
        ],
      },
      {
        title: 'データについて',
        items: [
          'ログイン不要。基本は端末内（localStorage）に保存されます',
          '端末を変えると引き継がれない可能性があります',
        ],
      },
      {
        title: '製作者表記（フッターに小さく）',
        items: [
          '製作者：MASAHIDE KOJIMA / X：@kojima920 / thanks for my family',
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
        title: 'Purpose',
        items: [
          'Pick and finish 3 things for today (Today is limited to 3)',
        ],
      },
      {
        title: 'Inbox',
        items: [
          'Multi-line input adds multiple tasks',
        ],
      },
      {
        title: 'Today / Backlog',
        items: [
          'Today stays pinned at the top while Backlog scrolls',
          'Toggle “Today” on each task to move it',
        ],
      },
      {
        title: 'Snooze',
        items: [
          '“Tomorrow / Next week” hides items until the date',
        ],
      },
      {
        title: '5-min start timer',
        items: [
          'Start from a Today item',
          'Default action is “Rest/Stop”; “Continue” needs extra friction',
        ],
      },
      {
        title: 'Reply / Pay',
        items: [
          'Reply/Pay kinds may force one item into Today to prevent forgetting',
        ],
      },
      {
        title: 'AI pick Today 3 (Important)',
        items: [
          'Press the button',
          'AI returns 3 picks + reasons + first 5 minutes',
          'Tap “Apply” to fill Today',
          'When decision feels hard, just press this',
        ],
      },
      {
        title: 'AI Breakdown (Important)',
        items: [
          'Press “AI Breakdown” on a task',
          'AI generates: Done condition → Materials → Draft → Finalize',
          'Tap “Add as sub-todos” to add ①–④ to Backlog',
          'For people who struggle with backward planning',
        ],
      },
      {
        title: 'Data',
        items: [
          'No login. Data is stored locally (localStorage)',
          'Switching devices may not carry data over',
        ],
      },
      {
        title: 'Creator note (footer)',
        items: [
          '製作者：MASAHIDE KOJIMA / X：@kojima920 / thanks for my family',
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
          <button
            onClick={onClose}
            className="tap-target p-2 justify-self-end hover:bg-gray-100 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-text-sub" />
          </button>
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
