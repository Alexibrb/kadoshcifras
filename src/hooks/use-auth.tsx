// src/hooks/use-auth.tsx
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc, Timestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUser } from '@/types';

interface AuthContextType {
  user: FirebaseAuthUser | null;
  appUser: AppUser | null;
  loading: boolean;
}

const convertTimestampsInObject = (data: any) => {
  if (!data) return null;
  const newObj: { [key: string]: any } = {};
  for (const key in data) {
    if (data[key] instanceof Timestamp) {
      newObj[key] = data[key].toDate().toISOString();
    } else {
      newObj[key] = data[key];
    }
  }
  return newObj;
};

const AuthContext = createContext<AuthContextType>({ user: null, appUser: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);

        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const convertedData = convertTimestampsInObject(userData);
            setAppUser({ id: docSnap.id, ...convertedData } as AppUser);
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

    useEffect(() => {
        if (loading) {
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
        
        if (!appUser && !loading) {
             if (!isPendingApprovalPage) {
                 // Aguarda um momento para o appUser ser criado após o signup antes de redirecionar
                 setTimeout(() => router.push('/pending-approval'), 500);
             }
             return;
        }
        
        if (appUser) {
            if (!appUser.isApproved) {
                if (!isPendingApprovalPage) {
                    router.push('/pending-approval');
                }
            } else { // Usuário está aprovado
                if (isPendingApprovalPage || isAuthPage) {
                    router.push('/dashboard');
                }
                if (appUser.role !== 'admin' && isAdminPage) {
                    router.push('/dashboard');
                }
            }
        }

    }, [user, appUser, loading, router, redirectUrl, pathname]);

    return { loading, isAdmin: appUser?.role === 'admin' };
}
