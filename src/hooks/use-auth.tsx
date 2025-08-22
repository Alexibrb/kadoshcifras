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
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setAppUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const userDocRef = doc(db, 'users', user.uid);
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
        // Don't do anything until loading is complete
        if (loading) {
            return;
        }

        const isAuthPage = pathname === redirectUrl || pathname === '/signup' || pathname === '/';
        const isPendingApprovalPage = pathname === '/pending-approval';

        // CASE 1: No firebase user.
        if (!user) {
            // Redirect to login if not on a public page.
            if (!isAuthPage) {
                router.push(redirectUrl);
            }
            return;
        }
        
        // From here, we have a firebase user.

        // CASE 2: The firestore document (`appUser`) does not exist yet.
        // This is normal right after signup. The user must be sent to the pending page.
        if (!appUser) {
           if (!isPendingApprovalPage) {
             router.push('/pending-approval');
           }
           return;
        }
        
        // CASE 3: We have both firebase user and firestore user (`appUser`).
        if (appUser) {
            // If user is not approved, they MUST be on the pending page.
            if (!appUser.isApproved && !isPendingApprovalPage) {
                router.push('/pending-approval');
                return;
            }

            // If user IS approved, they should NOT be on auth or pending pages.
            // Redirect them to the main app dashboard.
            if (appUser.isApproved && (isPendingApprovalPage || isAuthPage)) {
                router.push('/dashboard');
                return;
            }
        }

    }, [user, appUser, loading, router, redirectUrl, pathname]);

    return { loading };
}
