
// src/hooks/use-auth.tsx
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
    // Observador para o estado de autenticação do Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        // Se não há usuário, não há documento no Firestore para buscar.
        setAppUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Se não há usuário, não faz nada. O loading já foi definido como false acima.
    if (!user) return;

    // Se há um usuário, começa a carregar os dados do Firestore.
    setLoading(true);
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
      } else {
        // Isso pode acontecer brevemente após o cadastro, antes do documento ser criado.
        // O `useRequireAuth` lidará com essa condição.
        setAppUser(null);
      }
      setLoading(false); // O carregamento termina após obter a resposta do Firestore.
    }, (error) => {
      console.error("Error fetching user document:", error);
      setAppUser(null);
      setLoading(false);
    });

    return () => unsubscribeFirestore();
  }, [user]); // Este efeito depende apenas do objeto 'user' do Firebase Auth.

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
        // Não faz nada até que o carregamento inicial de autenticação e dados do usuário esteja completo.
        if (loading) {
            return;
        }

        const isAuthPage = pathname === redirectUrl || pathname === '/signup' || pathname === '/';
        const isPendingApprovalPage = pathname === '/pending-approval';

        // CASO 1: Nenhum usuário logado.
        if (!user) {
            // Se não estiver em uma página pública permitida, redireciona para o login.
            if (!isAuthPage && !isPendingApprovalPage) {
                router.push(redirectUrl);
            }
            return;
        }
        
        // A partir daqui, sabemos que 'user' (Firebase Auth) existe.

        // CASO 2: O documento do usuário no Firestore (`appUser`) ainda não existe.
        // Isso é normal logo após o cadastro. O usuário deve ser direcionado para a página de espera.
        if (!appUser) {
           if (!isPendingApprovalPage) {
             router.push('/pending-approval');
           }
           return;
        }
        
        // CASO 3: Temos o usuário do Auth e do Firestore (`appUser`).
        if (appUser) {
            // Se o usuário não está aprovado, ele DEVE ficar na página de espera.
            if (!appUser.isApproved && !isPendingApprovalPage) {
                router.push('/pending-approval');
                return;
            }

            // Se o usuário ESTÁ aprovado, ele NÃO deve estar nas páginas de auth ou de espera.
            // Redireciona para o painel.
            if (appUser.isApproved && (isPendingApprovalPage || isAuthPage)) {
                router.push('/dashboard');
                return;
            }
        }

    }, [user, appUser, loading, router, redirectUrl, pathname]);

    return { loading };
}
