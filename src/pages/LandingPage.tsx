import { type ReactNode } from "react";
import { SeoHead } from "../components/SeoHead";

const Section = ({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <section
    id={id}
    className="rounded-2xl bg-card-white border border-border-light p-5 md:p-6 shadow-sm"
  >
    <div className="flex flex-col gap-2 mb-4">
      <h2 className="text-lg font-bold text-text-main">{title}</h2>
      {description && (
        <p className="text-sm text-text-sub leading-relaxed">{description}</p>
      )}
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

const Pill = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-mint/15 text-brand-mint text-xs font-semibold">
    {children}
  </span>
);

const ListItem = ({ title, body }: { title: string; body: string }) => (
  <div className="p-3 rounded-xl bg-bg-soft border border-border-light">
    <p className="font-semibold text-text-main mb-1">{title}</p>
    <p className="text-sm text-text-sub leading-relaxed">{body}</p>
  </div>
);

const LandingPage = () => {
  // structuredData for application
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "The ToDo",
    "applicationCategory": "Productivity",
    "operatingSystem": "Web, iOS, Android",
    "description": "ADHDでも回る“止める設計”のToDoアプリ。インボックス統合、AI段取り分解、過集中ストップ機能搭載。",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "JPY"
    },
    "featureList": [
      "AI段取り分解",
      "今日3つ",
      "過集中防止タイマー",
      "共有メモ"
    ],
    "screenshot": "https://shiretto-todo-chat.web.app/icon-512.png" // Temporary, should use real screenshot
  };

  return (
    <div className="min-h-screen bg-bg-soft text-text-main">
      <SeoHead
        title="今日３つに絞り、前に進め！"
        description="ADHDでも回る“止める設計”のToDoアプリ。インボックス統合、AI段取り分解、過集中ストップ機能搭載。"
        keywords="ToDo, ADHD, タスク管理, AI, Gemini, 時間管理"
        structuredData={jsonLd}
      />
      <header className="sticky top-0 z-20 backdrop-blur bg-bg-soft/90 border-b border-border-light">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm text-text-muted">
              やること、3つだけ。あとはAIに任せる。
            </span>
            <h1 className="text-2xl font-black text-text-main">The ToDo</h1>
          </div>
          <a
            href="/"
            className="hidden sm:inline-flex tap-target px-4 py-2 bg-main-deep text-white rounded-full text-sm font-semibold shadow-md hover:opacity-90"
          >
            今すぐ使う
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-3xl bg-card-white border border-border-light shadow-sm p-6 md:p-8 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <Pill>ADHDでも回る “止める設計”</Pill>
            <h2 className="text-3xl font-black leading-tight text-text-main">
              今日３つに絞り、前に進め！
            </h2>
            <p className="text-lg text-text-sub leading-relaxed">
              インボックス→今日3つ→5分着手→休憩で止まる。家族・友人と共有できるメモ付きToDo。
              「プライベートコメント」で状況共有しつつ、AIが段取りを提案します。
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="/"
              className="tap-target px-4 py-3 rounded-full bg-main-deep text-white text-center text-base font-semibold shadow-md hover:opacity-90"
            >
              今すぐ使う
            </a>
            <a
              href="#install"
              className="tap-target px-4 py-3 rounded-full bg-brand-mint/15 text-brand-mint text-center text-base font-semibold border border-brand-mint/30 hover:bg-brand-mint/20"
            >
              ホーム画面に追加
            </a>
            <a
              href="#howto"
              className="tap-target px-4 py-3 rounded-full bg-bg-soft text-text-main text-center text-base font-semibold border border-border-light hover:bg-gray-100"
            >
              使い方を見る
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ListItem
              title="今日3つ"
              body="Todayは3つまで。決めない地獄を終わらせ、迷いを減らす。"
            />
            <ListItem
              title="段取り分解"
              body="AIボタンで完了条件→素材→ドラフト→清書を提案。逆算が苦手でも前に進む。"
            />
            <ListItem
              title="共有メモ"
              body="共有コードで家族・友人とコメント共有。やることの状況を自然に伝えられる。"
            />
          </div>
        </section>

        <Section
          title="今日3つで止める設計"
          description="TodayとBacklogを分離し、トグルで切り替え。スヌーズ（明日/来週）で「忘れたフリ」を防ぎます。"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ListItem
              title="今日トグル"
              body="今日の3つだけが上に固定。Backlogは下に流して脳内の混雑を軽減。"
            />
            <ListItem
              title="先送りスコア"
              body="明日/来週スヌーズと先送り回数のスコアで、後回し癖を見える化。"
            />
          </div>
        </Section>

        <Section
          title="インボックス統合"
          description="思いついた瞬間に投げ込む。複数行入力で行ごとにタスク化し、インボックスからTodayへ一気に移動。"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ListItem
              title="改行で複数追加"
              body="一気に書いて改行だけで分割。手間なくキャプチャできます。"
            />
            <ListItem
              title="自動優先"
              body="AIのToday3確定を使えば、迷わず今日の3つを埋められます。"
            />
            <ListItem
              title="メモ付き"
              body="各タスクにコメントを残し、共有してもそのまま伝わる。"
            />
          </div>
        </Section>

        <Section
          title="AI機能（Gemini使用・キーは自前）"
          description="判断コストや逆算の苦手さをAIに肩代わりしてもらう設計。APIキーは端末内(localStorage)にのみ保存。"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ListItem
              title="A) AI「段取り分解」"
              body="1タスクをGeminiに渡して、完了条件→素材→ドラフト→清書の4ステップを生成。MBAレポート/仕事の段取り/家族イベントなどに効きます。「サブToDoとして追加」で一括投入。"
            />
            <ListItem
              title="B) AI「今日3つ確定」"
              body="バックログを渡すと、今日の3つ候補 + 理由 + 最初の5分を返却。判断コストをAIに渡して、1タップで適用。"
            />
            <ListItem
              title="C) APIキー方式"
              body="Gemini APIキーは設定で保存（任意）。キーは端末内にのみ保存され、Gemini呼び出し時のみ送信。共有PCでは入れないでね。"
            />
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            プライバシー確保のための機能。悪用はしないでね。
          </p>
        </Section>

        <Section
          title="止めるタイマー（過集中ストップ）"
          description="5分着手 → 25分集中 → 5分休憩。終了時はデフォルトが「休憩する」。続けるには一手間かけて過集中を止めます。"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ListItem
              title="5分着手"
              body="とりあえず手を動かす導線。最初の摩擦を下げます。"
            />
            <ListItem
              title="集中25分"
              body="区切った集中で「終わらない」を避ける。"
            />
            <ListItem
              title="休憩で止まる"
              body="休憩を促すUI。止まれるのが正義、続ける時は確認ステップ付き。"
            />
          </div>
        </Section>

        <Section
          title="プライベートメモ / コメント"
          description="家族や友人との“ちょいメモ共有”にも。共有コードで合流し、やることにコメントを残して状況共有できます。"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ListItem
              title="軽い共有"
              body="チャット感覚でコメント。怪しさのない自然なToDo共有。"
            />
            <ListItem
              title="必要時だけ共有"
              body="外部共有は操作した時のみ。通常は端末内に保存されます。"
            />
          </div>
        </Section>

        <Section
          title="How it works"
          id="howto"
          description="インボックスに放り込む → 今日3つ → 5分着手 → コメントで共有。"
        >
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-3 list-decimal list-inside text-sm text-text-main">
            <li className="p-3 rounded-xl bg-bg-soft border border-border-light">
              ① インボックスに放り込む（改行で複数追加）
            </li>
            <li className="p-3 rounded-xl bg-bg-soft border border-border-light">
              ② 今日3つを決める（自動優先も可）
            </li>
            <li className="p-3 rounded-xl bg-bg-soft border border-border-light">
              ③ 5分着手タイマーで開始 → 休憩を促して過集中を止める
            </li>
            <li className="p-3 rounded-xl bg-bg-soft border border-border-light">
              ④ 必要なら共有メモでコメントを残す
            </li>
          </ol>
        </Section>

        <Section
          id="install"
          title="ホーム画面に追加（PWA）"
          description="インストールしなくてもブラウザで使えます。追加するとフルスクリーンで立ち上がるので便利。"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ListItem title="iOS Safari" body="共有ボタン → ホーム画面に追加" />
            <ListItem
              title="Android Chrome"
              body="メニュー → アプリをインストール"
            />
          </div>
          <p className="text-sm text-text-sub leading-relaxed">
            使い始めは「インボックスに書く → 今日3つにする →
            5分着手」。AIを使うなら設定でAPIキーを保存し、「AI段取り分解」「AI今日3つ確定」を試してみてください。
          </p>
        </Section>

        <Section
          title="信頼とプライバシー"
          description="シンプルなローカル保存。外に出るのは、あなたが共有やGeminiを呼ぶ時だけ。"
        >
          <ul className="list-disc list-inside space-y-2 text-sm text-text-main">
            <li>データはローカル保存（端末内）</li>
            <li>外部共有は必要操作時のみ</li>
            <li>Gemini利用は自分のAPIキー設定時のみ（任意）</li>
          </ul>
          <p className="text-xs text-text-muted leading-relaxed">
            ベータ版。自己責任で。大事なデータは別途バックアップ推奨。
          </p>
        </Section>

        <footer className="pb-10 text-center text-sm text-text-sub">
          <div className="flex flex-col gap-2 items-center">
            <div className="flex gap-3">
              <a
                href="/"
                className="text-main-deep font-semibold hover:underline"
              >
                アプリに戻る
              </a>
              <a
                href="/health.html"
                className="text-text-muted hover:underline"
              >
                /health.html
              </a>
            </div>
            <p>製作者：MASAHIDE KOJIMA</p>
            <p>X：@kojima920</p>
            <p>Thanks for my family</p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
