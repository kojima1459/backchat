import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// [リファクタ A-1] Firebase設定を環境変数から読み込むように変更
// 改修理由: ハードコードされた設定値はセキュリティリスクが高く、環境ごとの切り替えも困難
// 期待される効果: 本番/開発環境の切り替えが容易になり、設定値の漏洩リスクが低減
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Anonymous sign-in function
export const ensureSignedIn = async (): Promise<string> => {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  const userCredential = await signInAnonymously(auth);
  return userCredential.user.uid;
};

// Auth state observer
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
