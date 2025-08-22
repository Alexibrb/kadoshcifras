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
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      const unsubscribeUser = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setAppUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
        } else {
          setAppUser(null);
        }
        setLoading(false);
      }, () => {
        setAppUser(null);
        setLoading(false);
      });
      return () => unsubscribeUser();
    }
  }, [user]);

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
        if (loading) return;

        if (!user) {
            router.push(redirectUrl);
            return;
        }

        if (appUser) {
            if (!appUser.isApproved && pathname !== '/pending-approval') {
                router.push('/pending-approval');
            } else if (appUser.isApproved && pathname === '/pending-approval') {
                router.push('/dashboard');
            }
        }
        // If appUser is null and we are not loading, it means the user doc doesn't exist.
        // The signup flow should handle creating it. A logged-in user without a doc is an edge case.
        // We can redirect them to login to be safe.
        else if (!appUser) {
           router.push(redirectUrl);
        }

    }, [user, appUser, loading, router, redirectUrl, pathname]);

    return { user, appUser, loading };
}
