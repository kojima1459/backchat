// [リファクタ S-1] App.tsxのリファクタリング
// 改修理由: UI状態、ビジネスロジック、データ取得が単一ファイルに集中していた
// 期待される効果: 責務分離によりテスト性・可読性・保守性が向上
// 変更点:
//   - モーダル状態管理を useModalManager フックに分離
//   - ルーム管理ロジックを useRoomManager フックに分離
//   - 認証状態は AuthContext から直接取得（A-3 Prop Drilling解消）

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { Header } from './components/Header';
import { TodoItem } from './components/TodoItem';
import { AddTodoModal, type TodoCreateType } from './components/AddTodoModal';
import { SettingsModal } from './components/SettingsModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { ChatRoom } from './components/ChatRoom';
import { GuideOverlay } from './components/GuideOverlay';
import { Toast, getRandomPositiveMessage } from './components/Toast';
import { useTodos } from './hooks/useTodos';
import { useAuth } from './contexts/AuthContext';
import { joinRoom, getRoom } from './services/room';
import type { JoinRoomErrorCode } from './services/room';
import type { Todo, TodoKind } from './types/todo';
import { setRoomLabel } from './services/roomLabel';
import type { Language } from './i18n';
import { getGeminiApiKey } from './services/geminiKey';
import {
  AI_BREAKDOWN_PROMPT_TEMPLATE,
  AI_DEFAULT_CONTEXT,
  GEMINI_CONTEXT_STORAGE_KEY,
  GEMINI_MODEL,
} from './constants/aiBreakdown';
import { AI_TODAY3_PROMPT_TEMPLATE } from './constants/aiToday3';

type Screen = 'home' | 'chat';
type ThemeSetting = 'system' | 'light' | 'dark';
type TimerPhase = 'start' | 'focus' | 'rest';
type AiStep = { title: string; minutes: number; why: string };
type AiTodayPick = {
  id: string;
  reasonJa: string;
  reasonEn: string;
  first5minJa: string;
  first5minEn: string;
};
type AiTodayResult = {
  picks: AiTodayPick[];
  noteJa: string;
  noteEn: string;
};
type AiTodayCandidate = {
  id: string;
  title: string;
  kind?: TodoKind;
  deadlineAt?: string;
  deferCount?: number;
  priorityScore?: number;
};

const JOIN_ROOM_ERROR_MESSAGES: Record<JoinRoomErrorCode, string> = {
  deleted: 'この共有は削除されました',
  full: 'この共有、もう満員やった🥲',
  unknown: 'うまく同期できなかった',
};

const THEME_STORAGE_KEY = 'theme';
const LANGUAGE_STORAGE_KEY = 'language';
const LONG_PRESS_STORAGE_KEY = 'secretLongPressDelay';
const LAST_ROOM_STORAGE_KEY = 'lastRoomId';
const AUTO_SORT_STORAGE_KEY = 'backlogAutoSort';
const LONG_PRESS_OPTIONS = [2000, 3000, 5000, 8000];
const TIMER_STORAGE_KEY = 'timerState';
const LEGACY_TIMER_STORAGE_KEY = 'todoTimer';
const START_PHASE_MS = 5 * 60 * 1000;
const FOCUS_PHASE_MS = 25 * 60 * 1000;
const REST_PHASE_MS = 5 * 60 * 1000;
const WORK_PLAN_STEPS = [
  '① 完了条件を書く（5分）',
  '② 素材を集める（10分）',
  '③ ドラフトを作る（15分）',
  '④ 清書して提出（15分）',
];
const AI_STEP_PREFIXES = ['①', '②', '③', '④'];
const AI_ALLOWED_MINUTES = new Set([5, 10, 15, 20]);

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('[App] localStorage.getItem failed:', error);
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('[App] localStorage.setItem failed:', error);
  }
};

const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('[App] localStorage.removeItem failed:', error);
  }
};
const MEETING_MATERIALS_STEPS = [
  '① 目的・結論を1行で書く（5分）',
  '② 相手の論点を3つ予測する（5分）',
  '③ 必要な材料を集める（10分）',
  '④ 1枚ドラフト（15分）',
  '⑤ 送付・共有（5分）',
];
const FAMILY_EVENT_STEPS = [
  '① 日時を確定して連絡（5分）',
  '② 予約・チケット（10分）',
  '③ 持ち物チェック（5分）',
  '④ 移動・集合確認（5分）',
  '⑤ 当日リマインド文を作る（5分）',
];

const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const resolveThemeSetting = (): ThemeSetting => {
  if (typeof window === 'undefined') return 'system';
  const stored = safeGetItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  if (stored === 'mint' || stored === 'mono') {
    return 'light';
  }
  return 'system';
};

const resolveSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const resolveLanguage = (): Language => {
  if (typeof window === 'undefined') return 'ja';
  const stored = safeGetItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'ja' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
};

const resolveLongPressDelay = (): number => {
  if (typeof window === 'undefined') return 5000;
  const stored = Number(safeGetItem(LONG_PRESS_STORAGE_KEY));
  return LONG_PRESS_OPTIONS.includes(stored) ? stored : 5000;
};

const resolveLastRoomId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return safeGetItem(LAST_ROOM_STORAGE_KEY);
};

const resolveAutoSort = (): boolean => {
  if (typeof window === 'undefined') return false;
  return safeGetItem(AUTO_SORT_STORAGE_KEY) === 'true';
};

const formatTimeAgo = (date: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) return '—';

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `${hours}時間前`;

  const days = Math.floor(diffMs / 86400000);
  return `${days}日前`;
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createDateKey = (year: number, month: number, day: number): string | null => {
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getMonth() + 1 !== month || date.getDate() !== day) return null;
  return formatDateKey(date);
};

const parseDeadlineFromText = (text: string, baseDate: Date): string | null => {
  if (text.includes('今日')) {
    return formatDateKey(baseDate);
  }
  if (text.includes('明日')) {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + 1);
    return formatDateKey(next);
  }
  if (text.includes('来週')) {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + 7);
    return formatDateKey(next);
  }

  const monthDayMatch = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (monthDayMatch) {
    const month = Number(monthDayMatch[1]);
    const day = Number(monthDayMatch[2]);
    return createDateKey(baseDate.getFullYear(), month, day);
  }

  const slashMatch = text.match(/(\d{1,2})[/-](\d{1,2})/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    return createDateKey(baseDate.getFullYear(), month, day);
  }

  const dayMatch = text.match(/(\d{1,2})日/);
  if (dayMatch) {
    const day = Number(dayMatch[1]);
    return createDateKey(baseDate.getFullYear(), baseDate.getMonth() + 1, day);
  }

  return null;
};

const parseKindFromText = (text: string): { text: string; kind?: TodoKind } => {
  const trimmed = text.trim();
  const match = trimmed.match(/^(返信|支払い)[:：]\s*(.+)$/);
  if (match) {
    const kind = match[1] === '返信' ? 'reply' : 'payment';
    const cleaned = match[2].trim();
    return cleaned ? { text: cleaned, kind } : { text: trimmed, kind };
  }
  return { text: trimmed };
};

const buildAiBreakdownPrompt = (todo: Todo, userContext: string): string => {
  const kindLabelMap: Record<TodoKind, string> = {
    normal: '通常',
    work_plan: '仕事の段取り',
    reply: '返信',
    payment: '支払い',
  };
  const kindLabel = todo.kind ? (kindLabelMap[todo.kind] ?? todo.kind) : '';
  const normalizeContext = (value: string) => value.replace(/\s+/g, ' ').trim();
  const context = [
    normalizeContext(AI_DEFAULT_CONTEXT),
    normalizeContext(userContext),
    kindLabel ? `種別:${kindLabel}` : '',
    todo.deadlineAt ? `期限:${todo.deadlineAt}` : '',
  ]
    .filter(Boolean)
    .join(' / ');
  return AI_BREAKDOWN_PROMPT_TEMPLATE
    .replaceAll('{{TASK_TITLE}}', todo.text)
    .replaceAll('{{CONTEXT_HINT}}', context || '不明');
};

const buildAiTodayPrompt = (
  candidates: AiTodayCandidate[],
  todayKey: string,
  language: Language
): string => AI_TODAY3_PROMPT_TEMPLATE
  .replaceAll('{{TODAY_KEY}}', todayKey)
  .replaceAll('{{LANGUAGE}}', language)
  .replaceAll('{{CANDIDATES_JSON}}', JSON.stringify(candidates));

const parseAiToday3 = (rawText: string, candidateIds: Set<string>): AiTodayResult | null => {
  if (!rawText) return null;
  let payload = rawText.trim();
  if (!payload.startsWith('{')) {
    const start = payload.indexOf('{');
    const end = payload.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      payload = payload.slice(start, end + 1);
    }
  }
  try {
    const parsed = JSON.parse(payload) as {
      picks?: Array<{
        id?: string;
        reasonJa?: string;
        reasonEn?: string;
        first5minJa?: string;
        first5minEn?: string;
      }>;
      noteJa?: string;
      noteEn?: string;
    };
    if (!Array.isArray(parsed.picks) || parsed.picks.length === 0 || parsed.picks.length > 3) {
      return null;
    }
    if (typeof parsed.noteJa !== 'string' || typeof parsed.noteEn !== 'string') {
      return null;
    }
    const seen = new Set<string>();
    const picks = parsed.picks.map((pick) => {
      const id = typeof pick.id === 'string' ? pick.id.trim() : '';
      const reasonJa = typeof pick.reasonJa === 'string' ? pick.reasonJa.trim() : '';
      const reasonEn = typeof pick.reasonEn === 'string' ? pick.reasonEn.trim() : '';
      const first5minJa = typeof pick.first5minJa === 'string' ? pick.first5minJa.trim() : '';
      const first5minEn = typeof pick.first5minEn === 'string' ? pick.first5minEn.trim() : '';
      if (
        !id
        || !candidateIds.has(id)
        || seen.has(id)
        || !reasonJa
        || !reasonEn
        || !first5minJa
        || !first5minEn
      ) {
        return null;
      }
      seen.add(id);
      return {
        id,
        reasonJa,
        reasonEn,
        first5minJa,
        first5minEn,
      } satisfies AiTodayPick;
    });
    if (picks.some((pick) => pick === null)) return null;
    return {
      picks: picks as AiTodayPick[],
      noteJa: parsed.noteJa.trim(),
      noteEn: parsed.noteEn.trim(),
    };
  } catch {
    return null;
  }
};

const parseAiBreakdown = (rawText: string): AiStep[] | null => {
  if (!rawText) return null;
  let payload = rawText.trim();
  if (!payload.startsWith('{')) {
    const start = payload.indexOf('{');
    const end = payload.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      payload = payload.slice(start, end + 1);
    }
  }
  try {
    const parsed = JSON.parse(payload) as {
      steps?: Array<{
        title?: string;
        minutes?: number;
        why?: string;
      }>;
    };
    if (!Array.isArray(parsed.steps) || parsed.steps.length !== 4) return null;
    const normalized = parsed.steps.map((step) => {
      const title = typeof step.title === 'string' ? step.title.trim() : '';
      const why = typeof step.why === 'string' ? step.why.trim() : '';
      const minutes = typeof step.minutes === 'number' && AI_ALLOWED_MINUTES.has(step.minutes)
        ? step.minutes
        : NaN;
      if (!title || !why || Number.isNaN(minutes)) return null;
      return {
        title,
        minutes,
        why,
      } satisfies AiStep;
    });
    if (normalized.some((step) => step === null)) return null;
    return normalized as AiStep[];
  } catch {
    return null;
  }
};

const parseDeadlineDate = (deadlineAt: string): Date | null => {
  const match = deadlineAt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(deadlineAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const KEYWORD_SCORES = [
  { keyword: 'レポート', score: 12 },
  { keyword: '提出', score: 10 },
  { keyword: '締切', score: 10 },
  { keyword: '支払い', score: 8 },
  { keyword: '返信', score: 8 },
  { keyword: '会議', score: 6 },
];

const priorityScore = (todo: Todo, now: Date): number => {
  let score = 0;

  if (todo.deadlineAt) {
    const deadlineDate = parseDeadlineDate(todo.deadlineAt);
    if (deadlineDate) {
      const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / 86400000);
      if (diffDays <= 0) {
        score += 100;
      } else {
        score += Math.max(0, 80 - diffDays * 5);
      }
    }
  }

  const text = todo.text;
  KEYWORD_SCORES.forEach((entry) => {
    if (text.includes(entry.keyword)) {
      score += entry.score;
    }
  });

  score += (todo.deferCount ?? 0) * 4;
  return score;
};

function App() {
  // [リファクタ A-3] AuthContextから認証状態を直接取得
  const { uid, isLoading, isOnline } = useAuth();
  const { todos, addTodos, addTodosAfter, setTodoOrders, toggleTodo, setTodoToday, snoozeTodo, deleteTodo, editTodo, isLoaded } = useTodos();
  
  // モーダル状態
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  // チャット状態
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  
  // ルーム参加状態
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  // トースト状態
  const [toast, setToast] = useState<string | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateRegistration, setUpdateRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const reloadRequestedRef = useRef(false);
  const [connectionToast, setConnectionToast] = useState<{ message: string; persist: boolean } | null>(null);
  const previousOnlineRef = useRef(isOnline);
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>(resolveThemeSetting);
  const [language, setLanguage] = useState<Language>(resolveLanguage);
  const [secretLongPressDelay, setSecretLongPressDelay] = useState(resolveLongPressDelay);
  const [lastRoomId, setLastRoomId] = useState(resolveLastRoomId);
  const [lastActivityAt, setLastActivityAt] = useState<Date | null>(null);
  const [activeTimer, setActiveTimer] = useState<{
    taskId: string;
    startedAt: number;
    endsAt: number;
    phase: TimerPhase;
  } | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [showTimerPrompt, setShowTimerPrompt] = useState(false);
  const [inboxText, setInboxText] = useState('');
  const [autoSortBacklog, setAutoSortBacklog] = useState(resolveAutoSort);
  const [aiBreakdownTodo, setAiBreakdownTodo] = useState<Todo | null>(null);
  const [aiBreakdownSteps, setAiBreakdownSteps] = useState<AiStep[] | null>(null);
  const [aiBreakdownLoading, setAiBreakdownLoading] = useState(false);
  const [aiBreakdownError, setAiBreakdownError] = useState<string | null>(null);
  const [aiTodayOpen, setAiTodayOpen] = useState(false);
  const [aiTodayResult, setAiTodayResult] = useState<AiTodayResult | null>(null);
  const [aiTodayLoading, setAiTodayLoading] = useState(false);
  const [aiTodayError, setAiTodayError] = useState<string | null>(null);
  const forcedWarningRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyTheme = (resolved: 'light' | 'dark') => {
      document.documentElement.dataset.theme = resolved;
    };

    const resolvedTheme = themeSetting === 'system' ? resolveSystemTheme() : themeSetting;
    applyTheme(resolvedTheme);
    safeSetItem(THEME_STORAGE_KEY, themeSetting);

    if (themeSetting !== 'system' || !window.matchMedia) return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme(media.matches ? 'dark' : 'light');
    };

    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [themeSetting]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeSetItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeSetItem(AUTO_SORT_STORAGE_KEY, String(autoSortBacklog));
  }, [autoSortBacklog]);

  useEffect(() => {
    safeSetItem(LONG_PRESS_STORAGE_KEY, String(secretLongPressDelay));
  }, [secretLongPressDelay]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = safeGetItem(TIMER_STORAGE_KEY) ?? safeGetItem(LEGACY_TIMER_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as {
        taskId?: string;
        todoId?: string;
        startedAt?: number;
        endsAt?: number;
        phase?: TimerPhase;
      };
      const taskId = parsed.taskId ?? parsed.todoId;
      if (
        taskId
        && typeof parsed.endsAt === 'number'
        && (parsed.phase === 'start' || parsed.phase === 'focus' || parsed.phase === 'rest')
      ) {
        const duration = parsed.phase === 'start'
          ? START_PHASE_MS
          : parsed.phase === 'focus'
            ? FOCUS_PHASE_MS
            : REST_PHASE_MS;
        const startedAt = typeof parsed.startedAt === 'number'
          ? parsed.startedAt
          : parsed.endsAt - duration;
        setActiveTimer({
          taskId,
          startedAt,
          endsAt: parsed.endsAt,
          phase: parsed.phase,
        });
      }
    } catch {
      safeRemoveItem(TIMER_STORAGE_KEY);
      safeRemoveItem(LEGACY_TIMER_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!activeTimer) {
      safeRemoveItem(TIMER_STORAGE_KEY);
      safeRemoveItem(LEGACY_TIMER_STORAGE_KEY);
      return;
    }
    safeSetItem(TIMER_STORAGE_KEY, JSON.stringify(activeTimer));
  }, [activeTimer]);

  useEffect(() => {
    if (!activeTimer) {
      setRemainingMs(0);
      setShowTimerPrompt(false);
      return;
    }

    const updateRemaining = () => {
      const diff = activeTimer.endsAt - Date.now();
      if (diff <= 0) {
        setRemainingMs(0);
        setShowTimerPrompt(true);
        return true;
      }
      setRemainingMs(diff);
      return false;
    };

    if (updateRemaining()) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (updateRemaining()) {
        window.clearInterval(intervalId);
      }
    }, 1000);
    const handleResume = () => {
      if (!document.hidden) {
        updateRemaining();
      }
    };
    window.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);
    window.addEventListener('pageshow', handleResume);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('pageshow', handleResume);
    };
  }, [activeTimer]);

  useEffect(() => {
    if (!activeTimer) return;
    const target = todos.find((todo) => todo.id === activeTimer.taskId);
    if (!target || target.completed || !target.isToday) {
      setActiveTimer(null);
      setShowTimerPrompt(false);
    }
  }, [activeTimer, todos]);

  useEffect(() => {
    if (!lastRoomId || currentScreen !== 'home') {
      setLastActivityAt(null);
      return;
    }

    let isActive = true;
    getRoom(lastRoomId)
      .then((room) => {
        if (!isActive) return;
        if (!room) {
          setLastActivityAt(null);
          return;
        }

        const updatedAt = room.updatedAt?.toDate?.() ?? null;
        const lastMessageAt = room.lastMessageAt?.toDate?.() ?? null;
        setLastActivityAt(updatedAt || lastMessageAt);
      })
      .catch(() => {
        if (isActive) {
          setLastActivityAt(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [lastRoomId, currentScreen]);

  useEffect(() => {
    if (previousOnlineRef.current === isOnline) return;

    if (!isOnline) {
      setConnectionToast({ message: 'オフラインです', persist: true });
    } else if (!previousOnlineRef.current) {
      setConnectionToast({ message: 'オンラインに戻りました', persist: false });
    }

    previousOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let didSetup = false;
    let isActive = true;

    const showUpdate = (registration: ServiceWorkerRegistration) => {
      if (!isActive) return;
      setUpdateRegistration(registration);
      setUpdateReady(true);
    };

    const setupRegistration = (registration: ServiceWorkerRegistration) => {
      if (didSetup) return;
      didSetup = true;

      if (registration.waiting) {
        showUpdate(registration);
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdate(registration);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        setupRegistration(registration);
      }
    });

    navigator.serviceWorker.ready.then((registration) => {
      if (registration) {
        setupRegistration(registration);
      }
    });

    const handleControllerChange = () => {
      if (reloadRequestedRef.current) {
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      isActive = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // タスク完了時のハンドラー
  const handleToggle = useCallback((id: string) => {
    const todo = todos.find(t => t.id === id);
    if (todo && !todo.completed) {
      setToast(getRandomPositiveMessage());
    }
    toggleTodo(id);
  }, [todos, toggleTodo]);

  const handleToggleToday = useCallback((id: string) => {
    const target = todos.find((todo) => todo.id === id);
    if (!target) return;
    const nextValue = !target.isToday;
    if (nextValue) {
      const todayCount = todos.filter((todo) => todo.isToday).length;
      if (todayCount >= 3) {
        setToast('今日は3つまで');
        return;
      }
    }
    setTodoToday(id, nextValue);
  }, [setTodoToday, setToast, todos]);

  const handleStartTimer = useCallback((id: string) => {
    const now = Date.now();
    setActiveTimer({ taskId: id, startedAt: now, endsAt: now + START_PHASE_MS, phase: 'start' });
    setShowTimerPrompt(false);
  }, []);

  const handleStopTimer = useCallback(() => {
    setActiveTimer(null);
    setShowTimerPrompt(false);
  }, []);

  const handleCompleteFromTimer = useCallback(() => {
    if (!activeTimer) return;
    const target = todos.find((todo) => todo.id === activeTimer.taskId);
    if (target && !target.completed) {
      toggleTodo(target.id);
    }
    setActiveTimer(null);
    setShowTimerPrompt(false);
  }, [activeTimer, todos, toggleTodo]);

  const handleContinueTimer = useCallback(() => {
    if (!activeTimer) return;
    const nextPhase: TimerPhase = activeTimer.phase === 'start'
      ? 'focus'
      : 'focus';
    const duration = activeTimer.phase === 'start' ? FOCUS_PHASE_MS : FOCUS_PHASE_MS;
    const now = Date.now();
    setActiveTimer({ taskId: activeTimer.taskId, startedAt: now, endsAt: now + duration, phase: nextPhase });
    setShowTimerPrompt(false);
  }, [activeTimer]);

  const handlePrimaryTimerAction = useCallback(() => {
    if (!activeTimer) return;
    if (activeTimer.phase === 'focus') {
      const now = Date.now();
      setActiveTimer({ taskId: activeTimer.taskId, startedAt: now, endsAt: now + REST_PHASE_MS, phase: 'rest' });
      setShowTimerPrompt(false);
      return;
    }
    setActiveTimer(null);
    setShowTimerPrompt(false);
  }, [activeTimer]);

  useEffect(() => {
    const currentDayKey = formatDateKey(new Date());
    const isSnoozed = (todo: Todo) =>
      Boolean(todo.snoozeUntil && todo.snoozeUntil > currentDayKey);
    const candidates = todos.filter((todo) =>
      !todo.completed
      && !todo.isSecret
      && !isSnoozed(todo)
      && (todo.kind === 'reply' || todo.kind === 'payment')
    );
    if (candidates.length === 0) return;

    const todayAll = todos.filter((todo) => todo.isToday);
    const todayCandidates = todayAll.filter((todo) =>
      (todo.kind === 'reply' || todo.kind === 'payment') && !todo.completed
    );
    const now = new Date();
    const pickHighest = (items: Todo[]) =>
      items.reduce((best, item) => (
        priorityScore(item, now) > priorityScore(best, now) ? item : best
      ));
    const pickLowest = (items: Todo[]) =>
      items.reduce((worst, item) => (
        priorityScore(item, now) < priorityScore(worst, now) ? item : worst
      ));

    if (todayCandidates.length > 0) {
      if (todayCandidates.length > 1) {
        const keep = pickHighest(todayCandidates);
        todayCandidates.forEach((todo) => {
          if (todo.id !== keep.id) {
            setTodoToday(todo.id, false);
          }
        });
      }
      return;
    }

    if (todayAll.length < 3) {
      const pick = pickHighest(candidates);
      setTodoToday(pick.id, true);
      return;
    }

    const todayIncomplete = todayAll.filter((todo) => !todo.completed);
    if (todayIncomplete.length === 0) {
      if (forcedWarningRef.current !== currentDayKey) {
        setToast('今日は3つまで');
        forcedWarningRef.current = currentDayKey;
      }
      return;
    }

    const removeTarget = pickLowest(todayIncomplete);
    const pick = pickHighest(candidates);
    setTodoToday(removeTarget.id, false);
    setTodoToday(pick.id, true);
  }, [todos, setTodoToday, setToast]);

  const handleAddTodo = useCallback((text: string, type: TodoCreateType, kind: TodoKind) => {
    if (type === 'workPlan') {
      addTodos([
        { text, kind: 'work_plan' },
        ...WORK_PLAN_STEPS.map((step) => ({ text: step })),
      ]);
      return;
    }
    if (type === 'meetingMaterials') {
      addTodos([
        { text, kind },
        ...MEETING_MATERIALS_STEPS.map((step) => ({ text: step })),
      ]);
      return;
    }
    if (type === 'familyEvent') {
      addTodos([
        { text, kind },
        ...FAMILY_EVENT_STEPS.map((step) => ({ text: step })),
      ]);
      return;
    }
    addTodos([{ text, kind }]);
  }, [addTodos]);

  const handleInboxSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    const lines = inboxText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const baseDate = new Date();
    const inputs = lines.map((line) => {
      const parsedKind = parseKindFromText(line);
      return {
        text: parsedKind.text,
        kind: parsedKind.kind,
        deadlineAt: parseDeadlineFromText(parsedKind.text, baseDate) ?? undefined,
      };
    });
    addTodos(inputs);
    setInboxText('');
  }, [addTodos, inboxText]);

  const handleEditTodo = useCallback((id: string, text: string) => {
    editTodo(id, text);
  }, [editTodo]);

  const handleSnoozeTodo = useCallback((id: string, days: number) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    snoozeTodo(id, formatDateKey(nextDate));
  }, [snoozeTodo]);

  const closeAiToday = useCallback(() => {
    setAiTodayOpen(false);
    setAiTodayResult(null);
    setAiTodayError(null);
    setAiTodayLoading(false);
  }, []);

  const runAiToday3 = useCallback(async () => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setToast('APIキーを設定してください');
      setShowSettingsModal(true);
      return;
    }

    const todayKey = formatDateKey(new Date());
    const isSnoozed = (todo: Todo) =>
      Boolean(todo.snoozeUntil && todo.snoozeUntil > todayKey);
    const now = new Date();
    const candidates: AiTodayCandidate[] = todos
      .filter((todo) =>
        !todo.completed
        && !todo.isToday
        && !todo.isSecret
        && !isSnoozed(todo)
      )
      .map((todo) => {
        const candidate: AiTodayCandidate = {
          id: todo.id,
          title: todo.text,
          kind: todo.kind,
          priorityScore: priorityScore(todo, now),
        };
        if (todo.deadlineAt) {
          candidate.deadlineAt = todo.deadlineAt;
        }
        if (typeof todo.deferCount === 'number') {
          candidate.deferCount = todo.deferCount;
        }
        return candidate;
      });

    if (candidates.length === 0) {
      setToast('候補がありません');
      return;
    }

    setAiTodayOpen(true);
    setAiTodayLoading(true);
    setAiTodayError(null);
    setAiTodayResult(null);

    try {
      const prompt = buildAiTodayPrompt(candidates, todayKey, language);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const message = String(data?.error?.message ?? '');
        const lowered = message.toLowerCase();
        const isAuthError = response.status === 401
          || response.status === 403
          || lowered.includes('api key')
          || lowered.includes('apikey');
        if (isAuthError) {
          setAiTodayError('APIキーを確認してください');
          setToast('APIキーを確認してください');
          return;
        }
        throw new Error(message || 'Gemini request failed');
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const result = parseAiToday3(text, new Set(candidates.map((item) => item.id)));
      if (!result) {
        const message = 'AIの結果を解釈できませんでした。再試行してください';
        setAiTodayError(message);
        setToast(message);
        return;
      }
      setAiTodayResult(result);
    } catch {
      setAiTodayError('AIの取得に失敗しました');
      setToast('AIの取得に失敗しました');
    } finally {
      setAiTodayLoading(false);
    }
  }, [language, setShowSettingsModal, setToast, todos]);

  const handleApplyAiToday = useCallback(() => {
    if (!aiTodayResult || aiTodayResult.picks.length === 0) return;
    const todoMap = new Map(todos.map((todo) => [todo.id, todo]));
    const hasMissing = aiTodayResult.picks.some((pick) => !todoMap.has(pick.id));
    if (hasMissing) {
      setToast('AIの結果を解釈できませんでした。再試行してください');
      return;
    }

    todos.forEach((todo) => {
      if (todo.isToday && !todo.completed) {
        setTodoToday(todo.id, false);
      }
    });
    aiTodayResult.picks.forEach((pick) => {
      const target = todoMap.get(pick.id);
      if (target && !target.completed) {
        setTodoToday(target.id, true);
      }
    });
    closeAiToday();
  }, [aiTodayResult, closeAiToday, setTodoToday, setToast, todos]);

  const handleRetryAiToday = useCallback(() => {
    runAiToday3();
  }, [runAiToday3]);

  const closeAiBreakdown = useCallback(() => {
    setAiBreakdownTodo(null);
    setAiBreakdownSteps(null);
    setAiBreakdownError(null);
    setAiBreakdownLoading(false);
  }, []);

  const runAiBreakdown = useCallback(async (todo: Todo) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setToast('APIキーを設定してください');
      setShowSettingsModal(true);
      setAiBreakdownLoading(false);
      return;
    }

    const userContext = safeGetItem(GEMINI_CONTEXT_STORAGE_KEY) ?? '';
    setAiBreakdownLoading(true);
    setAiBreakdownError(null);
    setAiBreakdownSteps(null);

    try {
      const prompt = buildAiBreakdownPrompt(todo, userContext);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const message = String(data?.error?.message ?? '');
        const lowered = message.toLowerCase();
        const isAuthError = response.status === 401
          || response.status === 403
          || lowered.includes('api key')
          || lowered.includes('apikey');
        if (isAuthError) {
          setAiBreakdownError('APIキーを確認してください');
          setToast('APIキーを確認してください');
          return;
        }
        throw new Error(message || 'Gemini request failed');
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const steps = parseAiBreakdown(text);
      if (!steps) {
        const message = 'AIの結果を読み取れませんでした。もう一度お試しください';
        setAiBreakdownError(message);
        setAiBreakdownSteps([]);
        setToast(message);
        return;
      }
      setAiBreakdownSteps(steps);
    } catch {
      setAiBreakdownError('AIの取得に失敗しました');
      setToast('AIの取得に失敗しました');
    } finally {
      setAiBreakdownLoading(false);
    }
  }, [setShowSettingsModal, setToast]);

  const handleAiBreakdown = useCallback((todo: Todo) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setToast('APIキーを設定してください');
      setShowSettingsModal(true);
      return;
    }
    setAiBreakdownTodo(todo);
    runAiBreakdown(todo);
  }, [runAiBreakdown, setShowSettingsModal, setToast]);

  const handleRetryAiBreakdown = useCallback(() => {
    if (!aiBreakdownTodo) return;
    runAiBreakdown(aiBreakdownTodo);
  }, [aiBreakdownTodo, runAiBreakdown]);

  const handleAddAiBreakdown = useCallback(() => {
    if (!aiBreakdownTodo || !aiBreakdownSteps || aiBreakdownSteps.length === 0) return;
    const inputs = aiBreakdownSteps.map((step, index) => {
      const prefix = AI_STEP_PREFIXES[index] ?? AI_STEP_PREFIXES[0];
      const baseTitle = step.title.trim();
      const withPrefix = baseTitle.startsWith(prefix) ? baseTitle : `${prefix} ${baseTitle}`;
      return {
        text: `${withPrefix}（${step.minutes}分）`,
      };
    });
    addTodosAfter(aiBreakdownTodo.id, inputs);
    closeAiBreakdown();
  }, [addTodosAfter, aiBreakdownSteps, aiBreakdownTodo, closeAiBreakdown]);

  // 裏モード入口（長押し）
  const handleSecretLongPress = useCallback(() => {
    setShowJoinModal(true);
  }, []);

  // ルーム参加
  // [リファクタ B-3] 依存配列にisOnlineを追加して常に最新の状態で判定
  const handleJoinRoom = useCallback(async (roomKey: string, label: string) => {
    if (!uid) {
      setJoinError('認証に失敗しました。再読み込みしてください。');
      return;
    }
    
    if (!isOnline) {
      setJoinError('ネットにつながってないみたい');
      return;
    }
    
    setJoinLoading(true);
    setJoinError(null);
    
    const result = await joinRoom(roomKey, uid);
    
    setJoinLoading(false);
    
    if (result.success) {
      setCurrentRoomId(result.roomId);
      setLastRoomId(result.roomId);
      safeSetItem(LAST_ROOM_STORAGE_KEY, result.roomId);
      if (label) {
        setRoomLabel(result.roomId, label);
      }
      setShowJoinModal(false);
      setCurrentScreen('chat');
      if (result.isNew) {
        setToast('共有を作成しました');
      }
    } else {
      setJoinError(JOIN_ROOM_ERROR_MESSAGES[result.error]);
    }
  }, [uid, isOnline]);

  // チャットからホームに戻る
  const handleBackToHome = useCallback(() => {
    setCurrentScreen('home');
    setCurrentRoomId(null);
  }, []);

  // ルーム削除後の処理
  const handleRoomDeleted = useCallback(() => {
    setCurrentScreen('home');
    setCurrentRoomId(null);
    setToast('共有を削除しました');
  }, []);

  // ルーム退出後の処理
  const handleRoomLeft = useCallback(() => {
    setCurrentScreen('home');
    setCurrentRoomId(null);
    setToast('共有から退出しました');
  }, []);

  const handleUpdateReload = useCallback(() => {
    reloadRequestedRef.current = true;
    setUpdateReady(false);

    if (updateRegistration?.waiting) {
      updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    window.location.reload();
  }, [updateRegistration]);

  // ローディング中
  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-bg-soft flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-mint border-t-transparent 
            rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">読み込み中...</p>
        </div>
      </div>
    );
  }

  // チャット画面
  if (currentScreen === 'chat' && currentRoomId && uid) {
    return (
      <ChatRoom
        roomId={currentRoomId}
        uid={uid}
        onBack={handleBackToHome}
        onRoomDeleted={handleRoomDeleted}
        onRoomLeft={handleRoomLeft}
      />
    );
  }

  const todayKey = formatDateKey(new Date());
  const isSnoozedTodo = (todo: Todo) =>
    Boolean(todo.snoozeUntil && todo.snoozeUntil > todayKey);
  const todayTodos = todos.filter((todo) => todo.isToday && !isSnoozedTodo(todo));
  const backlogTodos = todos.filter((todo) => !todo.isToday);
  const visibleBacklogTodos = backlogTodos.filter((todo) => !isSnoozedTodo(todo));
  const snoozedCount = backlogTodos.length - visibleBacklogTodos.length;
  const now = new Date();
  const sortedBacklogTodos = autoSortBacklog
    ? [...visibleBacklogTodos].sort((a, b) => {
      const scoreDiff = priorityScore(b, now) - priorityScore(a, now);
      if (scoreDiff !== 0) return scoreDiff;
      return b.createdAt - a.createdAt;
    })
    : visibleBacklogTodos;
  const backlogActiveIds = autoSortBacklog
    ? []
    : sortedBacklogTodos
      .filter((todo) => !todo.completed && !todo.isSecret)
      .map((todo) => todo.id);
  const hasVisibleTodos = todos.some((todo) => !todo.isSecret);
  const activeTimerTodo = activeTimer
    ? todos.find((todo) => todo.id === activeTimer.taskId) ?? null
    : null;
  const timerPhaseLabel = activeTimer
    ? activeTimer.phase === 'start'
      ? '着手'
      : activeTimer.phase === 'focus'
        ? '集中'
        : '休憩'
    : '';

  const handleMoveBacklog = (id: string, direction: -1 | 1) => {
    const index = backlogActiveIds.indexOf(id);
    if (index === -1) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= backlogActiveIds.length) return;
    const reordered = [...backlogActiveIds];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    setTodoOrders(reordered);
  };

  // ホーム画面（ToDo）
  return (
    <div className="min-h-screen bg-bg-soft">
      <Header
        onHelpClick={() => setShowGuide(true)}
        onSettingsClick={() => setShowSettingsModal(true)}
        onSecretLongPress={handleSecretLongPress}
        secretLongPressDelay={secretLongPressDelay}
      />
      
      {/* オフライン警告 */}
      {!isOnline && (
        <div className="mx-4 mb-2 p-3 bg-warning/10 border border-warning/20 rounded-xl">
          <p className="text-sm text-warning font-medium">
            ネットにつながってないみたい
          </p>
        </div>
      )}
      
      {/* メインコンテンツ */}
      <main className="px-4 pb-24">
        <form onSubmit={handleInboxSubmit} className="mt-2 mb-4">
          <div className="flex items-start gap-2">
            <textarea
              value={inboxText}
              onChange={(event) => setInboxText(event.target.value)}
              placeholder="インボックスに追加（改行で複数）"
              rows={2}
              className="flex-1 px-4 py-3 bg-card-white border border-border-light rounded-xl
                text-[16px] leading-relaxed text-text-main placeholder:text-text-muted
                focus:outline-none focus:border-brand-mint focus:ring-2 focus:ring-brand-mint/20
                transition-all resize-none"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-brand-mint text-white text-sm font-semibold
                hover:bg-main-deep transition-colors"
            >
              追加
            </button>
          </div>
        </form>

        <div className="todaySticky">
          <div className="flex items-end justify-between mb-2 mt-2">
            <h2 className="text-sm font-bold text-text-sub">
              今日3つ
            </h2>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={runAiToday3}
                disabled={aiTodayLoading}
                className="min-h-[32px] px-3 rounded-full border text-xs font-semibold
                  border-brand-mint text-brand-mint hover:bg-brand-mint/10
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                AIで今日3つ確定
              </button>
              <p className="text-xs text-text-muted">
                最終更新: {formatTimeAgo(lastActivityAt)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {todayTodos.length > 0 ? (
              todayTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={handleToggle}
                  onToggleToday={handleToggleToday}
                  onStartTimer={handleStartTimer}
                  onEdit={handleEditTodo}
                  onAiBreakdown={handleAiBreakdown}
                  onDelete={deleteTodo}
                  language={language}
                  secretLongPressDelay={secretLongPressDelay}
                />
              ))
            ) : (
              <p className="text-sm text-text-muted py-2">今日のタスクはありません</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 mb-2">
          <h2 className="text-sm font-bold text-text-sub">
            バックログ
          </h2>
          <button
            type="button"
            onClick={() => setAutoSortBacklog((prev) => !prev)}
            className={`min-h-[32px] px-3 rounded-full border text-xs font-semibold
              transition-colors
              ${autoSortBacklog
                ? 'bg-brand-mint/15 border-brand-mint text-brand-mint'
                : 'bg-bg-soft border-border-light text-text-sub hover:bg-gray-100'
              }`}
          >
            自動優先（推奨）
          </button>
        </div>

        <div className="space-y-2">
          {sortedBacklogTodos.length > 0 ? (
            sortedBacklogTodos.map((todo) => {
              const index = backlogActiveIds.indexOf(todo.id);
              const canMoveUp = !autoSortBacklog && index > 0;
              const canMoveDown = !autoSortBacklog && index !== -1 && index < backlogActiveIds.length - 1;
              const canSnooze = !todo.completed;
              return (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={handleToggle}
                  onToggleToday={handleToggleToday}
                  onEdit={handleEditTodo}
                  onMoveUp={canMoveUp ? () => handleMoveBacklog(todo.id, -1) : undefined}
                  onMoveDown={canMoveDown ? () => handleMoveBacklog(todo.id, 1) : undefined}
                  onSnoozeTomorrow={canSnooze ? () => handleSnoozeTodo(todo.id, 1) : undefined}
                  onSnoozeNextWeek={canSnooze ? () => handleSnoozeTodo(todo.id, 7) : undefined}
                  onAiBreakdown={handleAiBreakdown}
                  onDelete={deleteTodo}
                  language={language}
                  secretLongPressDelay={secretLongPressDelay}
                />
              );
            })
          ) : hasVisibleTodos ? (
            <p className="text-sm text-text-muted py-2">バックログは空です</p>
          ) : null}
        </div>

        {snoozedCount > 0 && (
          <p className="text-xs text-text-muted mt-3">
            スヌーズ中（{snoozedCount}）
          </p>
        )}
        
        {!hasVisibleTodos && (
          <div className="text-center py-12">
            <p className="text-text-muted">タスクがありません</p>
            <p className="text-sm text-text-muted mt-1">
              下の＋ボタンから追加しよう
            </p>
          </div>
        )}

        <footer
          className="mt-10 pb-[calc(12px+env(safe-area-inset-bottom))]
            text-[11px] text-text-muted leading-relaxed flex flex-wrap items-center
            gap-x-2 gap-y-1"
        >
          <span>製作者：MASAHIDE KOJIMA</span>
          <span>X：</span>
          <a
            href="https://x.com/kojima920"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            @kojima920
          </a>
          <span>thanks for my family</span>
        </footer>
      </main>
      
      {/* FAB（タスク追加ボタン） */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand-mint rounded-full
          shadow-lg flex items-center justify-center
          hover:bg-main-deep active:scale-95 transition-all z-30"
        aria-label="タスクを追加"
      >
        <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
      </button>
      
      {/* モーダル群 */}
      <AddTodoModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddTodo}
      />
      
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onToast={(message) => setToast(message)}
        secretLongPressDelay={secretLongPressDelay}
        onSecretLongPressDelayChange={setSecretLongPressDelay}
        themeSetting={themeSetting}
        onThemeSettingChange={setThemeSetting}
        language={language}
        onLanguageChange={setLanguage}
      />

      <GuideOverlay
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        language={language}
      />

      {aiTodayOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={closeAiToday}
        >
          <div
            className="w-full max-w-lg bg-card-white rounded-t-2xl p-6 safe-area-bottom
              animate-slide-up"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-main">AIで今日3つ確定</h2>
              <button
                onClick={closeAiToday}
                className="tap-target p-2 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-text-sub" />
              </button>
            </div>

            {aiTodayLoading && (
              <div className="flex items-center gap-3 text-sm text-text-sub mb-4">
                <div
                  className="w-5 h-5 border-2 border-brand-mint border-t-transparent
                    rounded-full animate-spin"
                />
                選定中...
              </div>
            )}

            {aiTodayError && (
              <div className="mb-4">
                <p className="text-sm text-text-sub mb-2">{aiTodayError}</p>
                <button
                  type="button"
                  onClick={handleRetryAiToday}
                  className="min-h-[36px] px-3 rounded-full border border-border-light
                    text-xs font-semibold text-text-sub hover:bg-gray-100 transition-colors"
                >
                  再試行
                </button>
              </div>
            )}

            {aiTodayResult && (
              <div className="space-y-3">
                {(language === 'ja' ? aiTodayResult.noteJa : aiTodayResult.noteEn) && (
                  <p className="text-xs text-text-muted">
                    {language === 'ja' ? aiTodayResult.noteJa : aiTodayResult.noteEn}
                  </p>
                )}
                {aiTodayResult.picks.map((pick) => {
                  const target = todos.find((todo) => todo.id === pick.id);
                  const reason = language === 'ja' ? pick.reasonJa : pick.reasonEn;
                  const first5min = language === 'ja' ? pick.first5minJa : pick.first5minEn;
                  return (
                    <div
                      key={pick.id}
                      className="p-3 bg-bg-soft rounded-lg text-sm text-text-main space-y-1"
                    >
                      <p className="font-semibold">
                        {target?.text ?? pick.id}
                      </p>
                      <p className="text-xs text-text-muted">
                        {reason}
                      </p>
                      <p className="text-xs text-text-muted">
                        {first5min}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeAiToday}
                className="flex-1 py-3 bg-bg-soft border border-border-light rounded-xl
                  text-text-sub font-medium hover:bg-gray-100 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleApplyAiToday}
                disabled={!aiTodayResult || aiTodayLoading}
                className="flex-1 py-3 bg-brand-mint text-white font-bold rounded-xl
                  hover:bg-main-deep transition-colors disabled:bg-border-light
                  disabled:cursor-not-allowed"
              >
                適用
              </button>
            </div>
          </div>
        </div>
      )}

      {aiBreakdownTodo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
          onClick={closeAiBreakdown}
        >
          <div
            className="w-full max-w-lg bg-card-white rounded-t-2xl p-6 safe-area-bottom
              animate-slide-up"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-main">AI 段取り分解</h2>
              <button
                onClick={closeAiBreakdown}
                className="tap-target p-2 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-text-sub" />
              </button>
            </div>
            <p className="text-sm text-text-muted mb-4 truncate">
              {aiBreakdownTodo.text}
            </p>

            {aiBreakdownLoading && (
              <div className="flex items-center gap-3 text-sm text-text-sub mb-4">
                <div className="w-5 h-5 border-2 border-brand-mint border-t-transparent
                  rounded-full animate-spin"
                />
                生成中...
              </div>
            )}

            {aiBreakdownError && (
              <div className="mb-4">
                <p className="text-sm text-text-sub mb-2">{aiBreakdownError}</p>
                <button
                  type="button"
                  onClick={handleRetryAiBreakdown}
                  className="min-h-[36px] px-3 rounded-full border border-border-light
                    text-xs font-semibold text-text-sub hover:bg-gray-100 transition-colors"
                >
                  再試行
                </button>
              </div>
            )}

            {aiBreakdownSteps && (
              <div className="space-y-2">
                {aiBreakdownSteps.map((step, index) => {
                  const prefix = AI_STEP_PREFIXES[index] ?? AI_STEP_PREFIXES[0];
                  const displayTitle = step.title.startsWith(prefix)
                    ? step.title
                    : `${prefix} ${step.title}`;
                  return (
                    <div
                      key={`${index}-${step.title}`}
                      className="p-3 bg-bg-soft rounded-lg text-sm text-text-main"
                    >
                      <p>
                        {displayTitle}（{step.minutes}分）
                      </p>
                      {step.why && (
                        <p className="mt-1 text-xs text-text-muted">
                          理由: {step.why}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeAiBreakdown}
                className="flex-1 py-3 bg-bg-soft border border-border-light rounded-xl
                  text-text-sub font-medium hover:bg-gray-100 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleAddAiBreakdown}
                disabled={!aiBreakdownSteps || aiBreakdownSteps.length === 0 || aiBreakdownLoading}
                className="flex-1 py-3 bg-brand-mint text-white font-bold rounded-xl
                  hover:bg-main-deep transition-colors disabled:bg-border-light
                  disabled:cursor-not-allowed"
              >
                サブToDoとして追加
              </button>
            </div>
          </div>
        </div>
      )}
      
      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setJoinError(null);
        }}
        onJoin={handleJoinRoom}
        isLoading={joinLoading}
        error={joinError}
      />

      {activeTimer && activeTimerTodo && (
        <div className="fixed bottom-0 left-0 right-0 bg-card-white border-t border-border-light
          px-4 py-3 safe-area-bottom z-40"
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-main truncate">
                {activeTimerTodo.text}
              </p>
              <p className="text-xs text-text-muted">
                {timerPhaseLabel} · {formatCountdown(remainingMs)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStopTimer}
                className="min-h-[44px] px-4 rounded-full border border-border-light
                  text-sm font-semibold text-text-sub hover:bg-gray-100 transition-colors"
              >
                停止
              </button>
              <button
                type="button"
                onClick={handleCompleteFromTimer}
                className="min-h-[44px] px-4 rounded-full bg-brand-mint text-white
                  text-sm font-semibold hover:bg-main-deep transition-colors"
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}

      {showTimerPrompt && activeTimer && activeTimerTodo && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div
            className="w-full max-w-lg bg-card-white rounded-t-2xl p-6 safe-area-bottom
              animate-slide-up"
          >
            <div className="mb-4">
              <p className="text-sm text-text-muted">
                {activeTimer.phase === 'start' ? '着手が終了' : activeTimer.phase === 'focus' ? '集中が終了' : '休憩が終了'}
              </p>
              <h2 className="text-lg font-bold text-text-main">
                次はどうする？
              </h2>
            </div>
            <p className="text-sm text-text-sub mb-4 truncate">
              {activeTimerTodo.text}
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handlePrimaryTimerAction}
                className="w-full py-3 bg-brand-mint text-white font-bold rounded-xl
                  hover:bg-main-deep transition-colors"
              >
                {activeTimer.phase === 'focus' ? '休憩する' : '終わる'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('続けますか？')) {
                    handleContinueTimer();
                  }
                }}
                className="w-full py-3 bg-bg-soft border border-border-light rounded-xl
                  text-text-sub font-medium hover:bg-gray-100 transition-colors"
              >
                続ける
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* トースト */}
      {updateReady && (
        <Toast
          message="Update available"
          actionLabel="Reload"
          onAction={handleUpdateReload}
          duration={null}
          onClose={() => setUpdateReady(false)}
        />
      )}
      {connectionToast && (
        <Toast
          message={connectionToast.message}
          duration={connectionToast.persist ? null : 2000}
          onClose={() => setConnectionToast(null)}
          positionClassName={updateReady ? 'bottom-32' : 'bottom-20'}
        />
      )}
      {!updateReady && !connectionToast && toast ? (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}

export default App;
