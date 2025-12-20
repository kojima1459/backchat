import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { ensureSignedIn, onAuthChange } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  uid: string | null;
  isLoading: boolean;
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  uid: null,
  isLoading: true,
  isOnline: true,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // オンライン状態の監視
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsLoading(false);
      } else {
        // 未認証なら匿名サインイン
        try {
          await ensureSignedIn();
        } catch (error) {
          console.error('Anonymous sign-in failed:', error);
        }
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      uid: user?.uid || null, 
      isLoading,
      isOnline 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
