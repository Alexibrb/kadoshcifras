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
      // If there's no firebase user, loading state is handled by the auth listener
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
      } else {
        // This case happens right after signup, before the doc is created by the signup page.
        // We'll let useRequireAuth handle redirecting to /pending-approval after the doc is made.
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
        // We shouldn't do anything until the loading is complete.
        // This prevents race conditions and flickering.
        if (loading) {
            return;
        }

        const isAuthPage = pathname === redirectUrl || pathname === '/signup' || pathname === '/';
        const isPendingApprovalPage = pathname === '/pending-approval';

        // CASE 1: No user is logged in at all.
        if (!user) {
            // If they are not on a public page, redirect them to the login page.
            if (!isAuthPage) {
                router.push(redirectUrl);
            }
            return;
        }

        // From here on, we know a `user` is logged in via Firebase Auth.
        // Now we need to check their status in our Firestore `users` collection.

        // CASE 2: The user exists in Auth, but we don't have their Firestore document yet.
        // This happens for a brief moment after signup. Let's send them to pending approval.
        if (!appUser) {
             if (!isPendingApprovalPage) {
               router.push('/pending-approval');
           }
           return;
        }

        // CASE 3: We have the user and their Firestore document.
        if (appUser) {
            // If the user is not approved, they should be on the pending page.
            if (!appUser.isApproved && !isPendingApprovalPage) {
                router.push('/pending-approval');
                return;
            }
            // If the user IS approved, they should NOT be on the pending page or auth pages.
            // Send them to the dashboard.
            if (appUser.isApproved && (isPendingApprovalPage || isAuthPage)) {
                router.push('/dashboard');
                return;
            }
        }

    }, [user, appUser, loading, router, redirectUrl, pathname]);

    return { user, loading };
}
