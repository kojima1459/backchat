import { 
  doc, 
  getDoc, 
  updateDoc, 
  runTransaction,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { deriveRoomId } from './roomKey';

export interface RoomData {
  participantUids: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
  lastMessageAt: Timestamp | null;
}

export type JoinRoomResult = 
  | { success: true; roomId: string; isNew: boolean }
  | { success: false; error: JoinRoomErrorCode };

export type JoinRoomErrorCode = 'deleted' | 'full' | 'unknown';

// ルームに参加（存在しなければ作成）
export const joinRoom = async (roomKey: string, uid: string): Promise<JoinRoomResult> => {
  try {
    const roomId = await deriveRoomId(roomKey);
    const roomRef = doc(db, 'rooms', roomId);
    
    const result = await runTransaction(db, async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      
      if (roomDoc.exists()) {
        const data = roomDoc.data() as RoomData;
        
        // 削除済みチェック
        if (data.deletedAt) {
          return { success: false as const, error: 'deleted' };
        }
        
        // 既に参加済みかチェック
        if (data.participantUids.includes(uid)) {
          return { success: true as const, roomId, isNew: false };
        }
        
        // 満員チェック
        if (data.participantUids.length >= 2) {
          return { success: false as const, error: 'full' };
        }
        
        // 参加者に追加
        transaction.update(roomRef, {
          participantUids: [...data.participantUids, uid],
          updatedAt: serverTimestamp(),
        });
        
        return { success: true as const, roomId, isNew: false };
      } else {
        // 新規ルーム作成
        transaction.set(roomRef, {
          participantUids: [uid],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          deletedAt: null,
          lastMessageAt: null,
        });
        
        return { success: true as const, roomId, isNew: true };
      }
    });
    
    return result;
  } catch (error) {
    console.error('Join room error:', error);
    return { success: false, error: 'unknown' };
  }
};

// ルームを論理削除
export const deleteRoom = async (roomId: string): Promise<boolean> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Delete room error:', error);
    return false;
  }
};

// ルームから一時退出（参加者から削除）
export const leaveRoom = async (roomId: string, uid: string): Promise<boolean> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const result = await runTransaction(db, async (transaction) => {
      const roomDoc = await transaction.get(roomRef);

      if (!roomDoc.exists()) {
        return true;
      }

      const data = roomDoc.data() as RoomData;

      if (data.deletedAt) {
        return false;
      }

      if (!data.participantUids.includes(uid)) {
        return true;
      }

      transaction.update(roomRef, {
        participantUids: data.participantUids.filter((participantUid) => participantUid !== uid),
        updatedAt: serverTimestamp(),
      });

      return true;
    });

    return result;
  } catch (error) {
    console.error('Leave room error:', error);
    return false;
  }
};

// ルーム情報を取得
export const getRoom = async (roomId: string): Promise<RoomData | null> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomDoc = await getDoc(roomRef);
    
    if (roomDoc.exists()) {
      return roomDoc.data() as RoomData;
    }
    return null;
  } catch (error) {
    console.error('Get room error:', error);
    return null;
  }
};

// ユーザーがルームの参加者かどうかチェック
export const isParticipant = (roomData: RoomData, uid: string): boolean => {
  return roomData.participantUids.includes(uid);
};
