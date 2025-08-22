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
      setUser(firebaseUser);
      if (!firebaseUser) {
        // If user logs out, clear app user and finish loading
        setAppUser(null);
        setLoading(false);
      }
      // If user logs in, the second useEffect will handle fetching appUser
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // If there's no Firebase user, don't try to fetch from Firestore
    if (!user) {
      setAppUser(null);
      setLoading(false); // Ensure loading is false if there is no user
      return;
    }

    // Set loading to true while we fetch the user document
    setLoading(true);
    const userDocRef = doc(db, 'users', user.uid);
    
    // Listen for changes to the user document in Firestore
    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppUser({ id: docSnap.id, ...docSnap.data() } as AppUser);
      } else {
        // This can happen right after signup before the user doc is created
        setAppUser(null);
      }
      // Finished loading user data
      setLoading(false);
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

        // If there is a firebase user, check their approval status
        if (user) {
             // This case handles the brief moment after signup where the Firestore doc might not exist yet.
             // Without a document, we can't check for approval. Stay put, but don't grant access yet.
            if (!appUser) {
                // If they land somewhere other than pending-approval before their doc is created,
                // send them to the login page as a failsafe.
                if (!isPendingApprovalPage) {
                   // router.push(redirectUrl);
                }
                return;
            }

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
