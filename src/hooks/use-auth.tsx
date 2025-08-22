
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
      // If there's no Firebase user, we can stop loading and clear appUser.
      if (!firebaseUser) {
        setAppUser(null);
        setLoading(false);
      }
    });
    // Cleanup the auth listener on unmount.
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // If there's no user, no need to fetch from Firestore.
    if (!user) {
      setLoading(false); // Ensure loading is false if user logs out.
      return;
    }

    // Start loading user data from Firestore.
    setLoading(true);
    const userDocRef = doc(db, 'users', user.uid);
    
    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
      } else {
        // This case can happen right after signup, before the user document is created.
        setAppUser(null);
      }
      setLoading(false); // Firestore data has been fetched (or confirmed not to exist).
    }, (error) => {
      console.error("Error fetching user document:", error);
      setAppUser(null);
      setLoading(false);
    });

    // Cleanup the Firestore listener on unmount.
    return () => unsubscribeFirestore();
  }, [user]); // This effect depends only on the user object.

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
