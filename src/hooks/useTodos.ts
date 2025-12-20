import { useState, useEffect, useCallback } from 'react';
import type { Todo } from '../types/todo';

const STORAGE_KEY = 'shiretto-todos';

// 初期のダミータスク（裏モード入口用）
const SECRET_TASK: Todo = {
  id: 'secret-zoom',
  text: 'Zoom会議',
  completed: false,
  createdAt: 0,
  isSecret: true,
};

// 初期サンプルタスク
const INITIAL_TODOS: Todo[] = [
  SECRET_TASK,
  {
    id: 'sample-1',
    text: 'ミルク買う',
    completed: false,
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'sample-2',
    text: 'レポート10分',
    completed: false,
    createdAt: Date.now() - 7200000,
  },
];

// [リファクタ A-2] localStorageの安全なラッパー関数
// 改修理由: localStorageはストレージ容量超過やプライベートモードで例外をスローする可能性がある
// 期待される効果: 例外発生時もアプリがクラッシュせず、デフォルト値で動作を継続できる
const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('[useTodos] localStorage.getItem failed:', error);
    return null;
  }
};

const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('[useTodos] localStorage.setItem failed:', error);
    return false;
  }
};

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // ローカルストレージから読み込み
  useEffect(() => {
    // [リファクタ A-2] safeGetItemを使用して例外を安全に処理
    const stored = safeGetItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Todo[];
        // シークレットタスクが存在するか確認
        const hasSecret = parsed.some(t => t.isSecret);
        if (!hasSecret) {
          parsed.unshift(SECRET_TASK);
        }
        setTodos(parsed);
      } catch {
        setTodos(INITIAL_TODOS);
      }
    } else {
      setTodos(INITIAL_TODOS);
    }
    setIsLoaded(true);
  }, []);

  // ローカルストレージに保存
  useEffect(() => {
    if (isLoaded) {
      // [リファクタ A-2] safeSetItemを使用して例外を安全に処理
      safeSetItem(STORAGE_KEY, JSON.stringify(todos));
    }
  }, [todos, isLoaded]);

  // タスク追加
  const addTodo = useCallback((text: string) => {
    const newTodo: Todo = {
      id: `todo-${Date.now()}`,
      text: text.trim(),
      completed: false,
      createdAt: Date.now(),
    };
    setTodos(prev => {
      // シークレットタスクの後に追加
      const secretIndex = prev.findIndex(t => t.isSecret);
      if (secretIndex >= 0) {
        const newTodos = [...prev];
        newTodos.splice(secretIndex + 1, 0, newTodo);
        return newTodos;
      }
      return [newTodo, ...prev];
    });
  }, []);

  // タスク完了/未完了切り替え
  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => 
      prev.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }, []);

  // タスク削除
  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id && !todo.isSecret));
  }, []);

  // タスク編集
  const editTodo = useCallback((id: string, text: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, text: text.trim() } : todo
      )
    );
  }, []);

  // ソート済みタスク（シークレット→未完了→完了の順）
  const sortedTodos = [...todos].sort((a, b) => {
    // シークレットタスクは常に最上部
    if (a.isSecret) return -1;
    if (b.isSecret) return 1;
    // 未完了が上、完了が下
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // 同じステータスなら新しい順
    return b.createdAt - a.createdAt;
  });

  return {
    todos: sortedTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
    isLoaded,
  };
};
