
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
        // User is logged in, now we fetch the user document from Firestore.
        // This might come from cache if offline.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setAppUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
          } else {
            setAppUser(null);
          }
          // Only stop loading after we have both auth and firestore state.
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user document:", error);
          setAppUser(null);
          setLoading(false);
        });
        return () => unsubscribeFirestore();
      } else {
        // User is logged out
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
        // Wait until loading is fully complete before making any decisions.
        if (loading) {
            return;
        }

        const isAuthPage = pathname === redirectUrl || pathname === '/signup' || pathname === '/';
        const isPendingApprovalPage = pathname === '/pending-approval';
        const isAdminPage = pathname.startsWith('/users');

        // CASE 1: No firebase user. Not authenticated.
        if (!user) {
            // Redirect to login if trying to access a protected page.
            if (!isAuthPage) {
                router.push(redirectUrl);
            }
            return;
        }
        
        // From here, we have a Firebase user.

        // CASE 2: The Firestore document (`appUser`) does not exist yet.
        // This can happen right after signup. Send them to the pending page.
        if (!appUser) {
           if (!isPendingApprovalPage) {
             router.push('/pending-approval');
           }
           return;
        }
        
        // CASE 3: We have both Firebase user and Firestore user (`appUser`).
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

            // If user is approved but NOT an admin, they cannot access admin pages.
            if (appUser.isApproved && appUser.role !== 'admin' && isAdminPage) {
                router.push('/dashboard'); // Redirect to a safe page
                return;
            }
        }

    }, [user, appUser, loading, router, redirectUrl, pathname]);

    return { loading, isAdmin: appUser?.role === 'admin' };
}
