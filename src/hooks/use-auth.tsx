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
        return;
    }

    // A user is logged in, now listen for their document in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    
    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
      } else {
        // This can happen right after signup before the user doc is created
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

        // If no firebase user, and not on an auth page, redirect to login
        if (!user && !isAuthPage) {
            router.push(redirectUrl);
            return;
        }
        
        // This case handles the brief moment after signup where the Firestore doc might not exist yet.
        // We wait until loading is false to check for appUser.
        if (user && !appUser) {
           if (!isPendingApprovalPage) {
               // This can be a valid state right after signup before the doc exists.
               // We push them to pending approval as a safe default.
               // Once the doc is created, the next condition will redirect them if they are approved.
               router.push('/pending-approval');
           }
           return;
        }

        if(appUser) {
            // User is not approved and is trying to access a protected page
            if (!appUser.isApproved && !isPendingApprovalPage) {
                router.push('/pending-approval');
            }
            
            // User is approved but is on the pending approval page
            if (appUser.isApproved && isPendingApprovalPage) {
                router.push('/dashboard');
            }
        }

    }, [user, appUser, loading, router, redirectUrl, pathname]);

    return { user, appUser, loading };
}
