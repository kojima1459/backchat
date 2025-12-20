import { 
  collection, 
  doc,
  addDoc, 
  updateDoc,
  deleteDoc,
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface MessageData {
  id: string;
  senderUid: string;
  text: string;
  createdAt: Timestamp;
  readBy: string[];
  expiresAt: Timestamp;
}

// メッセージを送信
export const sendMessage = async (
  roomId: string, 
  uid: string, 
  text: string
): Promise<boolean> => {
  try {
    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    
    // 3日後の有効期限を設定（TTL保険）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);
    
    await addDoc(messagesRef, {
      senderUid: uid,
      text: text.trim(),
      createdAt: serverTimestamp(),
      readBy: [uid], // 送信者は既読
      expiresAt: Timestamp.fromDate(expiresAt),
    });
    
    // ルームの最終メッセージ時刻を更新
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('Send message error:', error);
    return false;
  }
};

// メッセージを既読にする
export const markAsRead = async (
  roomId: string, 
  messageId: string, 
  uid: string,
  currentReadBy: string[]
): Promise<void> => {
  try {
    // 既に既読なら何もしない
    if (currentReadBy.includes(uid)) {
      return;
    }
    
    const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
    
    // 既読者に追加
    await updateDoc(messageRef, {
      readBy: arrayUnion(uid),
    });
    
    // 両者既読になったら削除
    if (currentReadBy.length >= 1) {
      // 少し遅延を入れて、UIに表示される時間を確保
      setTimeout(async () => {
        try {
          await deleteDoc(messageRef);
        } catch (e) {
          // 既に削除されている場合は無視
          console.log('Message already deleted or error:', e);
        }
      }, 500);
    }
  } catch (error) {
    console.error('Mark as read error:', error);
  }
};

// メッセージを購読
export const subscribeMessages = (
  roomId: string,
  callback: (messages: MessageData[]) => void
): Unsubscribe => {
  const messagesRef = collection(db, 'rooms', roomId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages: MessageData[] = [];
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data(),
      } as MessageData);
    });
    callback(messages);
  }, (error) => {
    console.error('Subscribe messages error:', error);
    callback([]);
  });
};
