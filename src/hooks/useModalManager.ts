import { useState, useCallback } from 'react';

// [リファクタ S-1] App.tsxからモーダル状態管理ロジックを分離
// 改修理由: App.tsxが巨大化し、UI状態管理ロジックが散在していた
// 期待される効果: 責務分離によりテスト性・可読性・保守性が向上

export type ModalType = 'none' | 'addTodo' | 'settings' | 'joinRoom' | 'chat';

interface UseModalManagerReturn {
  currentModal: ModalType;
  openAddTodo: () => void;
  openSettings: () => void;
  openJoinRoom: () => void;
  openChat: () => void;
  closeModal: () => void;
  closeToHome: () => void;
}

export const useModalManager = (): UseModalManagerReturn => {
  const [currentModal, setCurrentModal] = useState<ModalType>('none');

  const openAddTodo = useCallback(() => {
    setCurrentModal('addTodo');
  }, []);

  const openSettings = useCallback(() => {
    setCurrentModal('settings');
  }, []);

  const openJoinRoom = useCallback(() => {
    setCurrentModal('joinRoom');
  }, []);

  const openChat = useCallback(() => {
    setCurrentModal('chat');
  }, []);

  const closeModal = useCallback(() => {
    setCurrentModal('none');
  }, []);

  // チャット画面からホームに戻る
  const closeToHome = useCallback(() => {
    setCurrentModal('none');
  }, []);

  return {
    currentModal,
    openAddTodo,
    openSettings,
    openJoinRoom,
    openChat,
    closeModal,
    closeToHome,
  };
};
