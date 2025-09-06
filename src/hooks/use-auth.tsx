
// src/hooks/use-auth.tsx
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUser } from '@/types';

interface AuthContextType {
  user: FirebaseAuthUser | null;
  appUser: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, appUser: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setAppUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
          } else {
            setAppUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user document:", error);
          setAppUser(null);
          setLoading(false);
        });
        return () => unsubscribeFirestore();
      } else {
        setUser(null);
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const useRequireAuth = (redirectUrl: string = '/login') => {
    const { user, appUser, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOnline(navigator.onLine);
      }

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        }
      };
    }, []);

    useEffect(() => {
        if (loading) {
            return;
        }

        // Se estiver offline, o Firebase Auth mantém o estado de login do usuário.
        // Se `user` existir, confiamos que ele está logado e evitamos redirecionamentos.
        // Isso permite o acesso ao app mesmo offline se o usuário já fez login antes.
        if (!isOnline && user) {
            return;
        }

        const isAuthPage = pathname === redirectUrl || pathname === '/signup' || pathname === '/';
        const isPendingApprovalPage = pathname === '/pending-approval';
        const isAdminPage = pathname.startsWith('/users');

        if (!user) {
            if (!isAuthPage) {
                router.push(redirectUrl);
            }
            return;
        }
        
        if (!appUser) {
           // Isso pode acontecer momentaneamente enquanto o documento do Firestore carrega.
           // Se o usuário existir mas o appUser não, e não estivermos offline,
           // é provável que seja um novo usuário que precisa ser redirecionado.
           if (!isPendingApprovalPage) {
             router.push('/pending-approval');
           }
           return;
        }
        
        if (appUser) {
            if (!appUser.isApproved && !isPendingApprovalPage) {
                router.push('/pending-approval');
                return;
            }

            if (appUser.isApproved && (isPendingApprovalPage || isAuthPage)) {
                router.push('/dashboard');
                return;
            }

            if (appUser.isApproved && appUser.role !== 'admin' && isAdminPage) {
                router.push('/dashboard');
                return;
            }
        }

    }, [user, appUser, loading, router, redirectUrl, pathname, isOnline]);

    return { loading, isAdmin: appUser?.role === 'admin' };
}
