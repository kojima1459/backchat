import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBx_5d5BoUiCtV65VfismAVF0qnYP7sgcE",
  authDomain: "shiretto-todo-chat.firebaseapp.com",
  projectId: "shiretto-todo-chat",
  storageBucket: "shiretto-todo-chat.firebasestorage.app",
  messagingSenderId: "964149329302",
  appId: "1:964149329302:web:6638065f19fec2493bb1b7"
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
