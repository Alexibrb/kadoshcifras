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
    // Listen for Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setLoading(true); // Start loading whenever auth state might change
      setUser(firebaseUser);
      if (!firebaseUser) {
        // If user logs out, clear app user and finish loading
        setAppUser(null);
        setLoading(false);
      }
      // If user logs in, the logic to fetch appUser is handled below
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // If there's no Firebase user, we're done (the other effect handles this)
    if (!user) {
        setAppUser(null);
        setLoading(false); // Make sure to stop loading
        return;
    }

    // A user is logged in, now listen for their document in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    
    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
      } else {
        // This can happen right after signup before the user doc is created.
        // We set it to null and let useRequireAuth handle the logic.
        setAppUser(null);
      }
      setLoading(false); // Finished loading user data
    }, (error) => {
      console.error("Error fetching user document:", error);
      setAppUser(null);
      setLoading(false);
    });

    return () => unsubscribeFirestore();
  }, [user]); // This effect runs whenever the Firebase user object changes

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
        // Don't do anything while loading
        if (loading) {
            return;
        }

        const isAuthPage = pathname === redirectUrl || pathname === '/signup';
        const isPendingApprovalPage = pathname === '/pending-approval';

        // If there is no authenticated user, redirect to login page, unless they are already on an auth page.
        if (!user && !isAuthPage) {
            router.push(redirectUrl);
            return;
        }
        
        // This is the state right after signup, where the firebase user exists, but the firestore doc might not yet.
        // In this case, we don't do anything and wait for the doc to be created.
        // The onSnapshot listener in AuthProvider will update the state, and this hook will re-run.
        if (user && !appUser) {
           // If the user is authenticated but has no Firestore document,
           // and they are not on the pending approval page, redirect them there.
           // This handles the case where the document was just created.
           if (!isPendingApprovalPage) {
               router.push('/pending-approval');
           }
           return;
        }

        if(appUser) {
            // User is not approved and is trying to access a protected page
            if (!appUser.isApproved && !isPendingApprovalPage) {
                router.push('/pending-approval');
            }
            
            // User is approved but is on the pending approval page, send them to dashboard
            if (appUser.isApproved && isPendingApprovalPage) {
                router.push('/dashboard');
            }
        }

    }, [user, appUser, loading, router, redirectUrl, pathname]);

    return { user, appUser, loading };
}
