import { initializeApp } from "firebase/app";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

// Firebase設定（productionの初期化固定）
const firebaseConfig = {
  apiKey: "AIzaSyBx_5d5BoUiCtV65VfismAVF0qnYP7sgcE",
  authDomain: "shiretto-todo-chat.firebaseapp.com",
  projectId: "shiretto-todo-chat",
  storageBucket: "shiretto-todo-chat.firebasestorage.app",
  messagingSenderId: "964149329302",
  appId: "1:964149329302:web:6638065f19fec2493bb1b7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

if (import.meta.env.DEV) {
  console.info(`Firebase initialized: ${firebaseConfig.projectId}`);
}

// Export Firebase services
export const db = getFirestore(app);

if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((error: unknown) => {
    const code = typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: string }).code)
      : '';

    if (code === 'failed-precondition') {
      console.warn('Firestore persistence failed: multiple tabs open.');
    } else if (code === 'unimplemented') {
      console.warn('Firestore persistence not supported in this browser.');
    } else {
      console.warn('Firestore persistence failed:', error);
    }
  });
}

// Firebase Auth is intentionally not used for local-only mode.
