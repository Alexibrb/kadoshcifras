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
      setLoading(true); // Start loading when user object is available
      const docRef = doc(db, 'users', user.uid);
      const unsubscribeUser = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setAppUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
        } else {
          // This case can happen right after signup before the user doc is created.
          // We set appUser to null and let useRequireAuth handle it.
          setAppUser(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user document:", error);
        setAppUser(null);
        setLoading(false);
      });
      return () => unsubscribeUser();
    } else {
        // If there's no Firebase user, we are not loading.
        setLoading(false);
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
        // Wait until loading is completely finished before making any decisions.
        if (loading) {
            return;
        }

        // If there's no Firebase user, redirect to login page.
        if (!user) {
            router.push(redirectUrl);
            return;
        }

        // This runs after loading is false and we have a user.
        // If appUser is still null here, it means the Firestore doc doesn't exist.
        // This is an edge case, maybe the doc creation failed.
        // Redirecting to login is a safe default.
        if (!appUser) {
             // Exception: allow access to pending approval page if they are stuck there.
             if (pathname !== '/pending-approval') {
                router.push(redirectUrl);
             }
            return;
        }

        // Now we have both user and appUser, we can apply approval logic.
        if (!appUser.isApproved && pathname !== '/pending-approval') {
            router.push('/pending-approval');
        } else if (appUser.isApproved && pathname === '/pending-approval') {
            router.push('/dashboard');
        }

    }, [user, appUser, loading, router, redirectUrl, pathname]);

    return { user, appUser, loading };
}
