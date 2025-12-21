export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  isSecret?: boolean; // 裏モード用のダミータスクかどうか
  isToday?: boolean;
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
