
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
            // Isso pode acontecer se o documento do usuário ainda não foi criado.
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
        // Se os dados de autenticação ainda estão carregando, não fazemos nada.
        if (loading) {
            return;
        }

        // Se o app estiver offline, a principal verificação é se temos um 'user' em cache.
        // O Firebase Auth persiste o estado de login, então se 'user' existe,
        // confiamos que o usuário está logado e permitimos o acesso para que os dados
        // do Firestore possam carregar do cache de persistência.
        if (!isOnline && user) {
            return;
        }

        const isAuthPage = pathname === redirectUrl || pathname === '/signup' || pathname === '/';
        const isPendingApprovalPage = pathname === '/pending-approval';
        const isAdminPage = pathname.startsWith('/users');

        // Se não há usuário (online), redireciona para a página de login,
        // a menos que já estejamos em uma página de autenticação.
        if (!user) {
            if (!isAuthPage) {
                router.push(redirectUrl);
            }
            return;
        }
        
        // Se temos um usuário, mas o perfil do Firestore (appUser) ainda não carregou,
        // isso pode ser uma condição temporária. Se estivermos online, é provável que seja um
        // novo usuário que precisa ser enviado para a página de aprovação.
        if (!appUser && isOnline) {
           if (!isPendingApprovalPage) {
             router.push('/pending-approval');
           }
           return;
        }
        
        if (appUser) {
            // Se o usuário não está aprovado, ele deve ficar na página de aprovação.
            if (!appUser.isApproved && !isPendingApprovalPage) {
                router.push('/pending-approval');
                return;
            }

            // Se o usuário está aprovado, ele não deve estar nas páginas de auth ou de aprovação.
            if (appUser.isApproved && (isPendingApprovalPage || isAuthPage)) {
                router.push('/dashboard');
                return;
            }
            
            // Se o usuário não for admin, ele não pode acessar as páginas de gerenciamento de usuários.
            if (appUser.isApproved && appUser.role !== 'admin' && isAdminPage) {
                router.push('/dashboard');
                return;
            }
        }

    }, [user, appUser, loading, router, redirectUrl, pathname, isOnline]);

    return { loading, isAdmin: appUser?.role === 'admin' };
}
