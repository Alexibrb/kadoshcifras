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
        // Não faz nada enquanto os dados de autenticação estão carregando
        if (loading) {
            return;
        }

        const isAuthPage = pathname === redirectUrl || pathname === '/signup' || pathname === '/';
        const isPendingApprovalPage = pathname === '/pending-approval';
        const isAdminPage = pathname.startsWith('/users');

        // Se não há usuário logado (user), redireciona para a página de login
        if (!user) {
            if (!isAuthPage) {
                router.push(redirectUrl);
            }
            return;
        }

        // Se há um usuário logado (user) mas não há um documento de usuário no Firestore (appUser)
        if (!appUser) {
            // Se ele não estiver na página de pendente, redireciona para lá.
            // Isso acontece logo após o cadastro, antes do documento ser criado.
            if (!isPendingApprovalPage) {
                router.push('/pending-approval');
            }
            return;
        }

        // Se há um usuário logado (user) E um documento de usuário (appUser)
        if (appUser) {
            // Se o usuário não está aprovado
            if (!appUser.isApproved) {
                if (!isPendingApprovalPage) {
                    router.push('/pending-approval');
                }
            } else { // Se o usuário ESTÁ APROVADO
                // Se ele está na página de login ou pendente, vai para o dashboard
                if (isAuthPage || isPendingApprovalPage) {
                    router.push('/dashboard');
                }
                // Se não é admin e tenta acessar a página de usuários, vai para o dashboard
                if (appUser.role !== 'admin' && isAdminPage) {
                    router.push('/dashboard');
                }
            }
        }
    }, [user, appUser, loading, router, redirectUrl, pathname]);

    return { loading, isAdmin: appUser?.role === 'admin' };
}
