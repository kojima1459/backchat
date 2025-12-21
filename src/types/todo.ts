export type TodoKind = 'normal' | 'work_plan' | 'reply' | 'payment';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  isSecret?: boolean; // 裏モード用のダミータスクかどうか
  isToday?: boolean;
  order?: number;
  deferCount?: number;
  snoozeUntil?: string;
  deadlineAt?: string;
  kind?: TodoKind;
}

export interface TodoInput {
  text: string;
  deadlineAt?: string;
  kind?: TodoKind;
}

export interface Room {
  id: string;
  participantUids: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  lastMessageAt: Date | null;
}

export interface Message {
  id: string;
  senderUid: string;
  text: string;
  createdAt: Date;
  readBy: string[];
  expiresAt: Date;
}
